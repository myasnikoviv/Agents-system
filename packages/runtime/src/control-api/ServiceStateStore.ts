import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { ServiceRuntimeState } from './ControlApiCore';

export interface ControlApiServiceStateStore {
  upsert(state: ServiceRuntimeState): void;
  get(serviceId: string): ServiceRuntimeState | null;
  list(): ServiceRuntimeState[];
}

export class InMemoryServiceStateStore implements ControlApiServiceStateStore {
  private readonly rows = new Map<string, ServiceRuntimeState>();

  upsert(state: ServiceRuntimeState): void {
    this.rows.set(state.serviceId, { ...state });
  }

  get(serviceId: string): ServiceRuntimeState | null {
    const found = this.rows.get(serviceId);
    return found ? { ...found } : null;
  }

  list(): ServiceRuntimeState[] {
    return Array.from(this.rows.values()).map((row) => ({ ...row }));
  }
}

export class SqliteServiceStateStore implements ControlApiServiceStateStore {
  private readonly db: Database.Database;

  constructor(dbPath?: string) {
    const resolved = dbPath
      ? path.resolve(dbPath)
      : path.resolve(process.cwd(), '.agent-system', 'control-api-state.db');
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS control_plane_service_state (
        service_id TEXT PRIMARY KEY,
        desired TEXT NOT NULL,
        status TEXT NOT NULL,
        restart_count INTEGER NOT NULL,
        last_check_at TEXT,
        error_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_control_plane_state_status
      ON control_plane_service_state(status);
    `);
  }

  upsert(state: ServiceRuntimeState): void {
    this.db
      .prepare(
        `INSERT INTO control_plane_service_state
          (service_id, desired, status, restart_count, last_check_at, error_reason)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(service_id)
         DO UPDATE SET
           desired=excluded.desired,
           status=excluded.status,
           restart_count=excluded.restart_count,
           last_check_at=excluded.last_check_at,
           error_reason=excluded.error_reason`,
      )
      .run(
        state.serviceId,
        state.desired,
        state.status,
        state.restartCount,
        state.lastCheckAt,
        state.errorReason,
      );
  }

  get(serviceId: string): ServiceRuntimeState | null {
    const row = this.db
      .prepare(
        `SELECT service_id, desired, status, restart_count, last_check_at, error_reason
         FROM control_plane_service_state
         WHERE service_id = ?`,
      )
      .get(serviceId) as any;
    if (!row) return null;
    return {
      serviceId: String(row.service_id),
      desired: String(row.desired) as ServiceRuntimeState['desired'],
      status: String(row.status) as ServiceRuntimeState['status'],
      restartCount: Number(row.restart_count || 0),
      lastCheckAt: row.last_check_at ? String(row.last_check_at) : null,
      errorReason: row.error_reason ? String(row.error_reason) : null,
    };
  }

  list(): ServiceRuntimeState[] {
    const rows = this.db
      .prepare(
        `SELECT service_id, desired, status, restart_count, last_check_at, error_reason
         FROM control_plane_service_state
         ORDER BY service_id ASC`,
      )
      .all() as any[];
    return rows.map((row) => ({
      serviceId: String(row.service_id),
      desired: String(row.desired) as ServiceRuntimeState['desired'],
      status: String(row.status) as ServiceRuntimeState['status'],
      restartCount: Number(row.restart_count || 0),
      lastCheckAt: row.last_check_at ? String(row.last_check_at) : null,
      errorReason: row.error_reason ? String(row.error_reason) : null,
    }));
  }
}
