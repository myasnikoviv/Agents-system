import { SharedMemoryGraphModel } from '../memory/SharedMemoryGraphModel';

describe('SharedMemoryGraphModel', () => {
  it('enforces strict workspace scoping for entities and relations', () => {
    const graph = new SharedMemoryGraphModel('ws-A');
    graph.addEntity({
      id: 'e1',
      type: 'idea',
      content: 'A core idea',
      metadata: {
        author: 'pm',
        timestamp: 1,
        workspace_id: 'ws-A',
      },
    });
    graph.addEntity({
      id: 'e2',
      type: 'decision',
      content: 'A decision',
      metadata: {
        author: 'architect',
        timestamp: 2,
        workspace_id: 'ws-A',
      },
    });

    expect(() =>
      graph.addEntity({
        id: 'leak',
        type: 'message',
        content: 'cross-workspace attempt',
        metadata: {
          author: 'intruder',
          timestamp: 3,
          workspace_id: 'ws-B',
        },
      }),
    ).toThrow(/workspace mismatch/i);

    graph.addRelation({
      id: 'r1',
      from: 'e1',
      to: 'e2',
      type: 'relates_to',
      workspace_id: 'ws-A',
    });
    expect(graph.getRelation('r1')).not.toBeNull();

    expect(() =>
      graph.addRelation({
        id: 'r2',
        from: 'e1',
        to: 'e2',
        type: 'depends_on',
        workspace_id: 'ws-B',
      }),
    ).toThrow(/workspace mismatch/i);
  });

  it('increments entity version on updates and keeps extensible metadata', () => {
    const graph = new SharedMemoryGraphModel('ws-1');
    graph.addEntity({
      id: 'e1',
      type: 'task',
      content: 'Initial task',
      metadata: {
        author: 'dev',
        timestamp: 100,
        workspace_id: 'ws-1',
        custom_field: 'alpha',
      },
    });

    const v2 = graph.updateEntityVersion('e1', {
      content: 'Updated task',
      metadata: {
        timestamp: 200,
        confidence: 0.91,
      },
    });

    expect(v2.version).toBe(2);
    expect(v2.previousVersionId).toBe('e1');
    expect(v2.content).toBe('Updated task');
    expect(v2.metadata.workspace_id).toBe('ws-1');
    expect(v2.metadata.custom_field).toBe('alpha');
    expect(v2.metadata.confidence).toBe(0.91);
  });
});
