import fs from 'fs';
import path from 'path';
import { logGovernance } from './GovernanceLogger';

/**
 * ENF-003 — Improvement Loop Soft Gate
 *
 * Checks if the run/sprint included a self-improvement loop (lessons learned, retrospectives).
 * This is a soft gate (log+warn, never block).
 */

export interface ImprovementCheckInput {
  ticket: string;
  projectId: string;
  workspacePath: string;
}

export function logImprovementLoopGate(input: ImprovementCheckInput) {
  const lessonsLearnedDir = path.join(input.workspacePath, 'docs', 'knowledge', 'lessons-learned');
  const retroDir = path.join(input.workspacePath, 'docs', 'process', 'retrospectives');

  // Basic check: any recent file in these dirs?
  // In a real implementation, we would check files created DURING THIS SESSION/TICKET.
  // For MVP, we check if the directory exists and has files.
  
  const hasLessons = fs.existsSync(lessonsLearnedDir) && fs.readdirSync(lessonsLearnedDir).length > 0;
  const hasRetro = fs.existsSync(retroDir) && fs.readdirSync(retroDir).length > 0;

  if (hasLessons || hasRetro) {
    logGovernance({
      rule: 'improvement_loop',
      status: 'pass',
      action: 'allow',
      ticket: input.ticket,
      detail: 'lessons_learned_or_retro_exists',
    });
  } else {
    logGovernance({
      rule: 'improvement_loop',
      status: 'skip',
      action: 'allow',
      ticket: input.ticket,
      detail: 'no_recent_improvement_artifacts_detected',
    });
  }
}
