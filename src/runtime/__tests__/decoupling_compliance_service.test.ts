import fs from 'fs/promises';
import { describe, expect, it } from '@jest/globals';
import { generateDecouplingComplianceMatrix } from '../DecouplingComplianceService';

describe('DecouplingComplianceService', () => {
  it('generates compliance matrix artifact and returns rows', async () => {
    const out = await generateDecouplingComplianceMatrix();
    expect(out.rows.length).toBeGreaterThan(0);
    expect(out.rows.every((r) => r.status === 'ok' || r.status === 'gap')).toBe(true);

    const content = await fs.readFile(out.artifactPath, 'utf-8');
    expect(content).toContain('AGSYS-23 Decoupling Compliance Matrix');
    expect(content).toContain('| Control | Source of Truth | Runtime Implementation | Status |');
  });
});
