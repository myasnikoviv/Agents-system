import { describe, expect, it } from '@jest/globals';
import {
  buildLifecycleComment,
  evaluateContinuityGuard,
  mapRuntimeEventToPlaneStateId,
  shouldSyncIssueRef,
  shouldBlockTerminalTransition,
} from '../PlaneLifecycleOrchestrator';
import type { RuntimeEvent } from '@system/events';

function baseEvent(overrides: Partial<RuntimeEvent> = {}): RuntimeEvent {
  return {
    id: 'ev-1',
    runId: 'run-1',
    projectId: 'TRADE-74',
    chainId: 'thread-1',
    type: 'run.started',
    payload: {
      status: 'in_progress',
      actorRole: 'PM Orchestrator',
      sourceStage: 'intake',
      targetStage: 'research',
    },
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('PlaneLifecycleOrchestrator', () => {
  it('skips sync for chat-only issue refs', () => {
    expect(shouldSyncIssueRef('chat-123')).toBe(false);
    expect(shouldSyncIssueRef('TRADE-74')).toBe(true);
  });

  it('maps runtime events to Plane states', () => {
    expect(mapRuntimeEventToPlaneStateId(baseEvent({ type: 'run.started' }))).toBe(
      'a527fbdc-21ad-4839-b1ec-0480b062aa44',
    );
    expect(
      mapRuntimeEventToPlaneStateId(baseEvent({ type: 'run.completed' })),
    ).toBe('fff4dba0-d863-4a59-ab55-fd6f8bee9c79');
    expect(mapRuntimeEventToPlaneStateId(baseEvent({ type: 'run.failed' }))).toBe(
      '226d57d1-0aeb-4c05-b961-23527ae34d33',
    );
  });

  it('builds deterministic lifecycle comment payload', () => {
    const html = buildLifecycleComment(
      baseEvent({ type: 'research.completed', payload: { status: 'success', actorRole: 'Research Agent' } }),
    );
    expect(html).toContain('research.completed');
    expect(html).toContain('Research Agent');
    expect(html).toContain('run-1');
    expect(html).toContain('thread-1');
  });

  it('flags orphan parent link and missing owner as continuity issues', () => {
    const continuity = evaluateContinuityGuard({
      issue: {
        id: 'issue-1',
        parent: 'missing-parent',
        state: 'a527fbdc-21ad-4839-b1ec-0480b062aa44',
        assignees: [],
        updated_at: new Date().toISOString(),
      },
      parentExists: false,
    });
    expect(continuity.issues).toContain('orphan_parent_link');
    expect(continuity.issues).toContain('missing_owner');
  });

  it('flags stuck in-progress issue as warning', () => {
    const oldTs = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const continuity = evaluateContinuityGuard({
      issue: {
        id: 'issue-2',
        state: 'a527fbdc-21ad-4839-b1ec-0480b062aa44',
        assignees: [{ id: 'owner-1' }],
        updated_at: oldTs,
      },
      parentExists: true,
      nowMs: Date.now(),
      stuckHoursThreshold: 24,
    });
    expect(continuity.warnings.some((w) => w.startsWith('stuck_in_progress_'))).toBe(true);
  });

  it('blocks terminal transition when continuity issues are present', () => {
    const blocked = shouldBlockTerminalTransition({
      event: baseEvent({ type: 'run.completed' }),
      continuity: { issues: ['missing_owner'], warnings: [] },
    });
    expect(blocked).toBe(true);
  });
});
