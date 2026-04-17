export interface DependencyNode {
    id: string;
    dependsOn?: string[];
}
export interface DependencyPlanResult {
    ok: boolean;
    ordered: string[];
    blocked: string[];
    reason?: string;
}
export declare function buildDependencyPlan(nodes: DependencyNode[]): DependencyPlanResult;
