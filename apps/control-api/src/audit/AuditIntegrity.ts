import crypto from 'crypto';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type AuditHashMaterial = {
  id: string;
  timestamp: string;
  action: string;
  projectId: string | null;
  actorId: string | null;
  reason: string;
  target: Record<string, any>;
  result: Record<string, any>;
};

const sortJson = (value: any): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortJson(value[key]);
    }
    return out;
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return String(value);
};

const sha256Hex = (input: string): string =>
  crypto.createHash('sha256').update(input, 'utf8').digest('hex');

export const canonicalizeAuditMaterial = (input: AuditHashMaterial): string => {
  return JSON.stringify(sortJson(input));
};

export const computeAuditPayloadHash = (input: AuditHashMaterial): string => {
  return sha256Hex(canonicalizeAuditMaterial(input));
};

export const computeAuditChainHash = (input: { prevHash: string; payloadHash: string }): string => {
  return sha256Hex(`${input.prevHash}:${input.payloadHash}`);
};

export const buildAuditHashMaterialFromRow = (row: any): AuditHashMaterial => ({
  id: String(row?.id || ''),
  timestamp: String(row?.timestamp || new Date().toISOString()),
  action: String(row?.action || 'control.unknown'),
  projectId: row?.projectId ? String(row.projectId) : null,
  actorId: row?.actorId ? String(row.actorId) : null,
  reason: String(row?.reason || ''),
  target: (row?.target && typeof row.target === 'object') ? row.target : {},
  result: (row?.result && typeof row.result === 'object') ? row.result : {},
});

export const verifyAuditHashChain = (rows: any[]): {
  ok: boolean;
  checked: number;
  brokenAtId?: string;
  reason?: string;
} => {
  let prevHash = 'genesis';
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const material = buildAuditHashMaterialFromRow(row);
    const expectedPayloadHash = computeAuditPayloadHash(material);
    const expectedHash = computeAuditChainHash({ prevHash, payloadHash: expectedPayloadHash });
    const rowPayloadHash = String(row?.payloadHash || '');
    const rowHash = String(row?.hash || '');
    const rowPrevHash = String(row?.prevHash || '');
    const id = material.id || `row-${i + 1}`;

    if (!rowPayloadHash || !rowHash || !rowPrevHash) {
      return { ok: false, checked: i, brokenAtId: id, reason: 'missing_hash_fields' };
    }
    if (rowPrevHash !== prevHash) {
      return { ok: false, checked: i, brokenAtId: id, reason: 'prev_hash_mismatch' };
    }
    if (rowPayloadHash !== expectedPayloadHash) {
      return { ok: false, checked: i, brokenAtId: id, reason: 'payload_hash_mismatch' };
    }
    if (rowHash !== expectedHash) {
      return { ok: false, checked: i, brokenAtId: id, reason: 'chain_hash_mismatch' };
    }
    prevHash = rowHash;
  }
  return { ok: true, checked: rows.length };
};
