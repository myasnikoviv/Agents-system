import { RelationEngine } from '@system/memory';

describe('RelationEngine', () => {
  it('infers relates_to relations from tag overlap', () => {
    const engine = new RelationEngine();
    const inferred = engine.inferRelations(
      [
        {
          id: 'a',
          type: 'idea',
          content: 'A',
          version: 1,
          metadata: { author: 'x', timestamp: 1, workspace_id: 'ws', tags: ['alpha', 'beta'] },
        },
        {
          id: 'b',
          type: 'artifact',
          content: 'B',
          version: 1,
          metadata: { author: 'x', timestamp: 1, workspace_id: 'ws', tags: ['beta'] },
        },
      ],
      'ws',
    );
    expect(inferred.length).toBe(1);
    expect(inferred[0].type).toBe('relates_to');
    expect(inferred[0].inferred).toBe(true);
  });

  it('detects contradiction conflicts for same pair', () => {
    const engine = new RelationEngine();
    const conflicts = engine.detectConflicts([
      { id: 'r1', from: 'a', to: 'b', type: 'depends_on', workspace_id: 'ws' },
      { id: 'r2', from: 'a', to: 'b', type: 'contradicts', workspace_id: 'ws' },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toBe('contradiction');
  });
});

