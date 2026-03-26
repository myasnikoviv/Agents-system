import { v4 as uuidv4 } from 'uuid';
import { executeQuasiLinearRun, PilotState } from './graphs/PilotQuasiLinearGraph';

import axios from 'axios';

const PLANE_API_KEY = process.env.PLANE_API_KEY || process.env.PLANE_API_TOKEN || '';
const PLANE_BASE_URL = process.env.PLANE_BASE_URL || 'http://127.0.0.1:3000';
const PLANE_WORKSPACE = process.env.PLANE_WORKSPACE || 'agent-system';
const PLANE_PROJECT_ID = process.env.PLANE_PROJECT_ID || '605caec0-10f7-44f1-be01-172d381eb2e7';

const planeClient = axios.create({
    baseURL: `${PLANE_BASE_URL}/api/v1/workspaces/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT_ID}`,
    headers: { 'X-Api-Key': PLANE_API_KEY, 'Content-Type': 'application/json' }
});

/**
 * Interface mapping to Plane Issue
 */
export interface PlaneIssue {
  id: string;
  name: string;
  state_id: string; // ID mapping to Plane state (e.g., Todo, In Progress, Done)
  description: string;
}

/**
 * Fetch issue from Plane REST API
 */
export async function getIssueFromPlane(issueId: string): Promise<PlaneIssue> {
    const isSequenceStr = issueId.startsWith('TKT-') || issueId.startsWith('GIT-');
    let realId = issueId;
    let name = issueId;
    let state_id = '';
    
    if (isSequenceStr) {
        const seqNum = parseInt(issueId.split('-')[1] || '0');
        const res = await planeClient.get('/issues/');
        const issue = res.data.results.find((r: any) => r.sequence_id === seqNum);
        if (issue) {
            realId = issue.id || '';
            name = issue.name || '';
            state_id = issue.state || issue.state_id || '';
        } else {
            console.warn(`Issue ${issueId} not found in Plane`);
        }
    } else {
        try {
            const res = await planeClient.get(`/issues/${issueId}/`);
            realId = res.data.id || '';
            name = res.data.name || '';
            state_id = res.data.state || res.data.state_id || '';
        } catch (e: any) {
            console.warn(`Issue UUID ${issueId} not found API. Returning mock shell.`);
            name = 'Unknown Or Chat Task';
        }
    }

    return {
        id: realId,
        name: name,
        state_id: state_id,
        description: 'Fetched from Plane'
    };
}

/**
 * Sync status back to Plane: Post comment and update state
 */
export async function syncStatusToPlane(issueId: string, status: string, logs: string[]): Promise<void> {
    console.log(`[Plane API Sync] Issue ${issueId} transitioned to ${status}`);
    const actualStatusMap: Record<string, string> = {
        'architecture_completed': '8f6b09d7-f7f2-4519-8dc8-9a7b35200c38', // Review
        'done': 'fff4dba0-d863-4a59-ab55-fd6f8bee9c79', // Done
        'initialized': 'a527fbdc-21ad-4839-b1ec-0480b062aa44', // In Progress
    };

    try {
        const commentHtml = `<p><strong>LangGraph Run Update: ${status}</strong></p><pre>${logs.join('\\n')}</pre>`;
        await planeClient.post(`/issues/${issueId}/comments/`, { comment_html: commentHtml });
        
        const mappedState = actualStatusMap[status];
        if (mappedState) {
            await planeClient.patch(`/issues/${issueId}/`, { state: mappedState });
        }
    } catch (e: any) {
        console.error(`[Plane API Sync] Error syncing issue ${issueId}:`, e.message);
    }
}

/**
 * Main Intake trigger to execute our Graph from a Plane Issue.
 */
export async function triggerPipelineFromPlane(issueId: string) {
  const runId = uuidv4();
  const threadId = uuidv4();
  
  console.log(`Initiating ingestion from Plane Issue: ${issueId}`);
  const issueData = await getIssueFromPlane(issueId);

  const initialState: Partial<PilotState> = {
    plane_issue_id: issueData.id,
    pipeline_run_id: runId,
    thread_id: threadId,
    status: 'initialized',
    artifactLogs: [`Intake initiated for: ${issueData.name}`]
  };

  // Run the quasi-linear graph
  const finalState = await executeQuasiLinearRun(initialState);
  
  // Sync back to Plane based on result
  await syncStatusToPlane(issueData.id, finalState.status, finalState.artifactLogs);
  
  return finalState;
}

// Run if executed directly
if (require.main === module) {
  triggerPipelineFromPlane('TKT-9999').then(() => {
    console.log('Plane Intake Mock test complete.');
    process.exit(0);
  });
}
