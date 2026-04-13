import fs from 'fs';
import path from 'path';
import { resolveRuntimePath } from '../RuntimePathResolver';

export interface ArtifactCheckResult {
  found: boolean;
  matchedPath: string | null;
}

function findFile(dir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const found = files.find((f) => pattern.test(f));
  return found ? path.join(dir, found) : null;
}

export function checkPreflightToken(workspacePath: string, ticketId: string, specificPatterns?: string[]): ArtifactCheckResult {
  const dir = resolveRuntimePath(workspacePath, 'processPreflightsDir');
  if (specificPatterns && specificPatterns.length > 0) {
    for (const p of specificPatterns) {
      const found = findFile(dir, new RegExp(p, 'i'));
      if (found) return { found: true, matchedPath: found };
    }
  }
  const found = findFile(dir, new RegExp(`^${ticketId}\\.env$`, 'i'));
  return { found: !!found, matchedPath: found };
}

export function checkTestReport(workspacePath: string, ticketId: string, specificPatterns?: string[]): ArtifactCheckResult {
  const dir = resolveRuntimePath(workspacePath, 'processTestsDir');
  if (specificPatterns && specificPatterns.length > 0) {
    for (const p of specificPatterns) {
      const found = findFile(dir, new RegExp(p, 'i'));
      if (found) return { found: true, matchedPath: found };
    }
  }
  const found = findFile(dir, new RegExp(`^${ticketId}\\.md$`, 'i'));
  return { found: !!found, matchedPath: found };
}

export function checkImprovementArtifact(workspacePath: string, ticketId: string, specificPatterns?: string[]): ArtifactCheckResult {
  const candidates = [
    resolveRuntimePath(workspacePath, 'processRetrospectivesDir'),
    resolveRuntimePath(workspacePath, 'knowledgeLessonsDir'),
  ];
  
  if (specificPatterns && specificPatterns.length > 0) {
    for (const c of candidates) {
      for (const p of specificPatterns) {
        const found = findFile(c, new RegExp(p, 'i'));
        if (found) return { found: true, matchedPath: found };
      }
    }
  }

  for (const c of candidates) {
    const found = findFile(c, new RegExp(ticketId, 'i'));
    if (found) return { found: true, matchedPath: found };
  }
  return { found: false, matchedPath: null };
}

