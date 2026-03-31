import fs from 'fs/promises';
import path from 'path';
import { RuntimeEvent } from './types';

const LEDGER_DIR = path.resolve(process.cwd(), 'docs/process/runs/ledger');

export class EventStore {
  /**
   * Fetches all events for a specific run.
   */
  static async getEventsByRunId(runId: string): Promise<RuntimeEvent[]> {
    const filePath = path.join(LEDGER_DIR, `${runId}.jsonl`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const ledgerEntry = JSON.parse(line);
          // Re-hydrate the original payload if needed, 
          // or just return the event if we decide to store full events in ledger.
          // For now, RunLedger stores a flattened LedgerEntry.
          // We should ideally store the raw RuntimeEvent in the ledger file for full fidelity.
          return ledgerEntry; 
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetches the filtered chat view (agent.message events) for a thread.
   * This implements the 'Chat is a filtered view' requirement.
   */
  static async getChatMessages(runIds: string[]): Promise<any[]> {
    const allEvents: RuntimeEvent[] = [];
    for (const runId of runIds) {
      const runEvents = await this.getEventsByRunId(runId);
      allEvents.push(...runEvents);
    }

    return allEvents
      .filter(e => e.type === 'agent.message')
      .map(e => ({
        id: e.id,
        role: 'agent',
        content: e.payload.message || e.payload.content,
        timestamp: new Date(e.timestamp).toISOString()
      }));
  }
}
