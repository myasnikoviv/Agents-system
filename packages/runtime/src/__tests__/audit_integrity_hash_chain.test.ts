import {
  buildAuditHashMaterialFromRow,
  computeAuditChainHash,
  computeAuditPayloadHash,
  verifyAuditHashChain,
} from '../../server/audit/AuditIntegrity';

describe('Audit hash chain integrity (AGSYS-3117)', () => {
  it('passes verification for a valid append-only chain', () => {
    const row1: any = {
      id: 'a-1',
      timestamp: new Date('2026-04-10T12:00:00Z').toISOString(),
      action: 'control.start',
      projectId: 'proj-a',
      actorId: 'user-1',
      reason: '',
      target: { id: 1 },
      result: { ok: true },
    };
    row1.prevHash = 'genesis';
    row1.payloadHash = computeAuditPayloadHash(buildAuditHashMaterialFromRow(row1));
    row1.hash = computeAuditChainHash({ prevHash: row1.prevHash, payloadHash: row1.payloadHash });

    const row2: any = {
      id: 'a-2',
      timestamp: new Date('2026-04-10T12:01:00Z').toISOString(),
      action: 'control.stop',
      projectId: 'proj-a',
      actorId: 'user-1',
      reason: '',
      target: { id: 2 },
      result: { ok: true },
    };
    row2.prevHash = row1.hash;
    row2.payloadHash = computeAuditPayloadHash(buildAuditHashMaterialFromRow(row2));
    row2.hash = computeAuditChainHash({ prevHash: row2.prevHash, payloadHash: row2.payloadHash });

    const verify = verifyAuditHashChain([row1, row2]);
    expect(verify.ok).toBe(true);
    expect(verify.checked).toBe(2);
  });

  it('fails verification when payload is modified', () => {
    const row: any = {
      id: 'a-1',
      timestamp: new Date('2026-04-10T12:00:00Z').toISOString(),
      action: 'control.start',
      projectId: 'proj-a',
      actorId: 'user-1',
      reason: '',
      target: { id: 1 },
      result: { ok: true },
    };
    row.prevHash = 'genesis';
    row.payloadHash = computeAuditPayloadHash(buildAuditHashMaterialFromRow(row));
    row.hash = computeAuditChainHash({ prevHash: row.prevHash, payloadHash: row.payloadHash });
    row.result = { ok: false };

    const verify = verifyAuditHashChain([row]);
    expect(verify.ok).toBe(false);
    expect(verify.reason).toBe('payload_hash_mismatch');
  });
});
