"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AuditIntegrity_1 = require("../../server/audit/AuditIntegrity");
describe('Audit hash chain integrity (AGSYS-3117)', () => {
    it('passes verification for a valid append-only chain', () => {
        const row1 = {
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
        row1.payloadHash = (0, AuditIntegrity_1.computeAuditPayloadHash)((0, AuditIntegrity_1.buildAuditHashMaterialFromRow)(row1));
        row1.hash = (0, AuditIntegrity_1.computeAuditChainHash)({ prevHash: row1.prevHash, payloadHash: row1.payloadHash });
        const row2 = {
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
        row2.payloadHash = (0, AuditIntegrity_1.computeAuditPayloadHash)((0, AuditIntegrity_1.buildAuditHashMaterialFromRow)(row2));
        row2.hash = (0, AuditIntegrity_1.computeAuditChainHash)({ prevHash: row2.prevHash, payloadHash: row2.payloadHash });
        const verify = (0, AuditIntegrity_1.verifyAuditHashChain)([row1, row2]);
        expect(verify.ok).toBe(true);
        expect(verify.checked).toBe(2);
    });
    it('fails verification when payload is modified', () => {
        const row = {
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
        row.payloadHash = (0, AuditIntegrity_1.computeAuditPayloadHash)((0, AuditIntegrity_1.buildAuditHashMaterialFromRow)(row));
        row.hash = (0, AuditIntegrity_1.computeAuditChainHash)({ prevHash: row.prevHash, payloadHash: row.payloadHash });
        row.result = { ok: false };
        const verify = (0, AuditIntegrity_1.verifyAuditHashChain)([row]);
        expect(verify.ok).toBe(false);
        expect(verify.reason).toBe('payload_hash_mismatch');
    });
});
