export interface ArtifactCheckResult {
    found: boolean;
    matchedPath: string | null;
}
export declare function checkPreflightToken(workspacePath: string, ticketId: string, specificPatterns?: string[]): ArtifactCheckResult;
export declare function checkTestReport(workspacePath: string, ticketId: string, specificPatterns?: string[]): ArtifactCheckResult;
export declare function checkImprovementArtifact(workspacePath: string, ticketId: string, specificPatterns?: string[]): ArtifactCheckResult;
