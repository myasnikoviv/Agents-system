import fs from 'fs';
import path from 'path';
import { EventStore } from '../events/EventStore';
import { ComplianceActualEvidence } from './ComplianceTypes';

function readSkillTelemetryForRun(workspacePath: string, runId: string): string[] {
  const file = path.resolve(workspacePath, 'docs/process/skills/telemetry/skill-usage.jsonl');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
  const used = new Set<string>();
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (String(row?.runId || row?.payload?.runId || '') !== runId) continue;
      const skill = String(row?.skill || row?.payload?.skill || '').trim();
      if (skill) used.add(skill);
    } catch {
      // ignore malformed lines
    }
  }
  return Array.from(used);
}

export async function collectComplianceActualEvidence(input: {
  runId: string;
  defaultPipeline?: string;
  workspacePath: string;
}): Promise<ComplianceActualEvidence> {
  const events = await EventStore.getEventsByRunId(input.runId);
  const pipelines = new Set<string>();
  const agents = new Set<string>();
  const stages = new Set<string>();

  for (const e of events as any[]) {
    const type = String(e?.type || '');
    const payload = e?.payload || {};
    const actorId = String(e?.actor?.id || '').trim();
    const actorRole = String(e?.actor?.role || '').trim();

    const pipelineId = String(payload?.pipelineId || payload?.pipeline || '').trim();
    if (pipelineId) pipelines.add(pipelineId);
    if (type === 'stage.started') {
      const stageId = String(payload?.stageId || payload?.stage || '').trim();
      if (stageId) stages.add(stageId);
    }
    if (type === 'agent.started' || type === 'agent.completed' || type === 'agent.message') {
      if (actorId) agents.add(actorId);
      if (actorRole) agents.add(actorRole);
    }
  }

  if (pipelines.size === 0 && input.defaultPipeline) {
    pipelines.add(input.defaultPipeline);
  }

  return {
    pipelines: Array.from(pipelines),
    agents: Array.from(agents),
    skills: readSkillTelemetryForRun(input.workspacePath, input.runId),
    stages: Array.from(stages),
  };
}
