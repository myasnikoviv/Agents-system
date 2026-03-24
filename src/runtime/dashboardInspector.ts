import { fetchRecentEvents, RuntimeEvent } from './events/EventBus';

/**
 * Phase 3 Observability Note (LangSmith Feasibility):
 * LangSmith provides an excellent tool (`@langchain/langgraph-cli`) to inspect runs and traces
 * locally or in the cloud via `process.env.LANGCHAIN_TRACING_V2=true`. 
 * It is highly recommended to use the official Studio for graph interaction.
 * 
 * However, we must also link executions explicitly to Plane issues. This custom CLI script
 * acts as an MVP custom dashboard that reads raw EventBus traces to provide:
 * 1. Event timeline tracking
 * 2. Run inspection with correlated Plane IDs.
 */

async function dashboardRunInspector(): Promise<void> {
  console.log("=== Trade-Bot Custom Run Inspector MVP ===");
  console.log("Fetching last 50 execution events from Redis stream...\n");

  const events = await fetchRecentEvents(50);
  
  if (events.length === 0) {
      console.log("No events found in the hub.");
      return;
  }

  // Group by Pipeline Run ID
  const groupings: Record<string, RuntimeEvent[]> = {};
  for (const e of events) {
      if (!groupings[e.pipeline_run_id]) {
          groupings[e.pipeline_run_id] = [];
      }
      groupings[e.pipeline_run_id]!.push(e);
  }

  // Display grouped timeline
  for (const [runId, runEvents] of Object.entries(groupings)) {
      const planeIssue = runEvents[0]?.plane_issue_id || 'Unknown';
      console.log(`\n======================================================`);
      console.log(`Pipeline Run: ${runId}`);
      console.log(`Plane Issue:  ${planeIssue}`);
      console.log(`Thread ID:    ${runEvents[0]?.thread_id}`);
      console.log(`======================================================`);
      
      // Sort oldest to newest for timeline presentation
      runEvents.sort((a: RuntimeEvent, b: RuntimeEvent) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      runEvents.forEach((e: RuntimeEvent) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        console.log(`[${time}] [${e.agent_role.padEnd(20)}] Stage: ${e.source_stage} -> ${e.event_type} (${e.status.toUpperCase()})`);
      });
  }
}

if (require.main === module) {
    dashboardRunInspector().then(() => {
        console.log("\nDashboard Inspector trace complete.");
        process.exit(0);
    });
}
