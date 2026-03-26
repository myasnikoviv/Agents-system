import axios, { AxiosInstance } from 'axios';
import { RuntimeEvent } from './events/EventBus';

const PLANE_API_KEY = process.env.PLANE_API_KEY || process.env.PLANE_API_TOKEN || '';
const PLANE_BASE_URL = process.env.PLANE_BASE_URL || 'http://127.0.0.1:3000';
const PLANE_WORKSPACE = process.env.PLANE_WORKSPACE || 'agent-system';
const PLANE_PROJECT_ID = process.env.PLANE_PROJECT_ID || '605caec0-10f7-44f1-be01-172d381eb2e7';

const TODO_STATE_ID = '226d57d1-0aeb-4c05-b961-23527ae34d33';
const IN_PROGRESS_STATE_ID = 'a527fbdc-21ad-4839-b1ec-0480b062aa44';
const REVIEW_STATE_ID = '8f6b09d7-f7f2-4519-8dc8-9a7b35200c38';
const DONE_STATE_ID = 'fff4dba0-d863-4a59-ab55-fd6f8bee9c79';
const STUCK_HOURS_THRESHOLD = Number(process.env.PLANE_STUCK_HOURS_THRESHOLD || '24');

let cachedClient: AxiosInstance | null = null;

function getPlaneClient(): AxiosInstance | null {
  if (!PLANE_API_KEY) return null;
  if (!cachedClient) {
    cachedClient = axios.create({
      baseURL: `${PLANE_BASE_URL}/api/v1/workspaces/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT_ID}`,
      headers: { 'X-Api-Key': PLANE_API_KEY, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
  }
  return cachedClient;
}

export function shouldSyncIssueRef(issueRef: string): boolean {
  return Boolean(issueRef) && !issueRef.startsWith('chat-');
}

export function mapRuntimeEventToPlaneStateId(event: RuntimeEvent): string | null {
  if (event.status === 'failed') return TODO_STATE_ID;
  if (event.status === 'pending' || event.status === 'in_progress') return IN_PROGRESS_STATE_ID;
  if (event.event_type === 'docs.completed') return DONE_STATE_ID;
  if (event.event_type.endsWith('.completed') && event.target_stage === 'end') return DONE_STATE_ID;
  if (event.event_type.endsWith('.completed')) return REVIEW_STATE_ID;
  if (event.event_type.startsWith('pipeline.') || event.event_type.startsWith('task.')) {
    return IN_PROGRESS_STATE_ID;
  }
  return null;
}

export function buildLifecycleComment(event: RuntimeEvent): string {
  const lines = [
    `<p><strong>Cockpit lifecycle update:</strong> ${event.event_type}</p>`,
    `<ul>`,
    `<li><strong>Status:</strong> ${event.status}</li>`,
    `<li><strong>Role:</strong> ${event.agent_role}</li>`,
    `<li><strong>From:</strong> ${event.source_stage}</li>`,
    `<li><strong>To:</strong> ${event.target_stage || '-'}</li>`,
    `<li><strong>Run:</strong> ${event.pipeline_run_id}</li>`,
    `<li><strong>Thread:</strong> ${event.thread_id}</li>`,
    `<li><strong>Correlation:</strong> ${event.correlation_id}</li>`,
    `</ul>`,
  ];
  if (event.payload) {
    lines.push(`<pre>${JSON.stringify(event.payload, null, 2)}</pre>`);
  }
  return lines.join('');
}

interface PlaneIssueDetails {
  id: string;
  parent?: string | null;
  state?: string | null;
  assignees?: Array<any>;
  updated_at?: string;
}

export interface ContinuityCheckResult {
  issues: string[];
  warnings: string[];
}

export function evaluateContinuityGuard(input: {
  issue: PlaneIssueDetails;
  parentExists: boolean;
  nowMs?: number;
  stuckHoursThreshold?: number;
}): ContinuityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const assignees = Array.isArray(input.issue.assignees) ? input.issue.assignees : [];

  if (input.issue.parent && !input.parentExists) {
    issues.push('orphan_parent_link');
  }
  if (assignees.length === 0) {
    issues.push('missing_owner');
  }

  const threshold = input.stuckHoursThreshold ?? STUCK_HOURS_THRESHOLD;
  if (input.issue.updated_at && Number.isFinite(threshold) && threshold > 0) {
    const updated = Date.parse(input.issue.updated_at);
    if (!Number.isNaN(updated)) {
      const now = input.nowMs ?? Date.now();
      const ageHours = (now - updated) / (1000 * 60 * 60);
      if (ageHours >= threshold && input.issue.state === IN_PROGRESS_STATE_ID) {
        warnings.push(`stuck_in_progress_${Math.floor(ageHours)}h`);
      }
    }
  }

  return { issues, warnings };
}

export function shouldBlockTerminalTransition(input: {
  event: RuntimeEvent;
  continuity: ContinuityCheckResult;
}): boolean {
  const toState = mapRuntimeEventToPlaneStateId(input.event);
  const isTerminal = toState === REVIEW_STATE_ID || toState === DONE_STATE_ID;
  return isTerminal && input.continuity.issues.length > 0;
}

async function resolveIssueId(issueRef: string, client: AxiosInstance): Promise<string> {
  if (/^[0-9a-fA-F-]{36}$/.test(issueRef)) return issueRef;
  const seqMatch = issueRef.match(/^[A-Za-z]+-(\d+)$/);
  if (!seqMatch) return issueRef;
  const sequenceId = Number(seqMatch[1]);
  const response = await client.get('/issues/');
  const issue = (response.data?.results || []).find((r: any) => r.sequence_id === sequenceId);
  return issue?.id || issueRef;
}

export async function syncPlaneLifecycleForEvent(event: RuntimeEvent): Promise<void> {
  if (!shouldSyncIssueRef(event.plane_issue_id)) return;
  const client = getPlaneClient();
  if (!client) return;

  try {
    const issueId = await resolveIssueId(event.plane_issue_id, client);
    const issueResp = await client.get(`/issues/${issueId}/`);
    const issue = issueResp.data as PlaneIssueDetails;
    let parentExists = true;
    if (issue?.parent) {
      try {
        await client.get(`/issues/${issue.parent}/`);
      } catch {
        parentExists = false;
      }
    }
    const continuity = evaluateContinuityGuard({ issue, parentExists });

    const continuityHtml =
      continuity.issues.length === 0 && continuity.warnings.length === 0
        ? ''
        : `<p><strong>Continuity guard:</strong></p><ul>${
            continuity.issues.map((x) => `<li>issue:${x}</li>`).join('') +
            continuity.warnings.map((x) => `<li>warning:${x}</li>`).join('')
          }</ul>`;
    await client.post(`/issues/${issueId}/comments/`, {
      comment_html: `${buildLifecycleComment(event)}${continuityHtml}`,
    });
    const stateId = mapRuntimeEventToPlaneStateId(event);
    if (stateId && !shouldBlockTerminalTransition({ event, continuity })) {
      await client.patch(`/issues/${issueId}/`, { state: stateId });
    }
  } catch (error: any) {
    console.warn(
      `[PlaneLifecycle] Failed to sync event ${event.event_type} for ${event.plane_issue_id}: ${error?.message || error}`,
    );
  }
}
