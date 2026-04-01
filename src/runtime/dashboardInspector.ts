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
      if (!groupings[e.runId]) {
          groupings[e.runId] = [];
      }
      groupings[e.runId]!.push(e);
  }

  // Display grouped timeline
  for (const [runId, runEvents] of Object.entries(groupings)) {
      const planeIssue = runEvents[0]?.projectId || 'Unknown';
      console.log(`\n======================================================`);
      console.log(`Pipeline Run: ${runId}`);
      console.log(`Plane Issue:  ${planeIssue}`);
      console.log(`Thread ID:    ${runEvents[0]?.chainId}`);
      console.log(`======================================================`);
      
      // Sort oldest to newest for timeline presentation
      runEvents.sort((a: RuntimeEvent, b: RuntimeEvent) => a.timestamp - b.timestamp);

      runEvents.forEach((e: RuntimeEvent) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        const actor = String(e.actor?.role || e.actor?.id || 'system');
        const sourceStage = String(e.payload?.sourceStage || 'n/a');
        const status = String(e.payload?.status || 'success').toUpperCase();
        console.log(`[${time}] [${actor.padEnd(20)}] Stage: ${sourceStage} -> ${e.type} (${status})`);
      });
  }
}

if (require.main === module) {
    dashboardRunInspector().then(() => {
        console.log("\nDashboard Inspector trace complete.");
        process.exit(0);
    });
}
