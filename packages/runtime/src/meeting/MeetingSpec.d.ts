export type MeetingMode = 'debate' | 'review' | 'alignment';
export type TurnStrategy = 'round_robin';
export interface MeetingSpec {
    pipeline: 'meeting';
    mode: MeetingMode;
    participants: string[];
    moderator: string;
    rounds: number;
    turn_strategy: TurnStrategy;
    rules: string[];
    artifacts: string[];
}
interface MeetingValidationConfig {
    allowedModes: MeetingMode[];
    allowedTurnStrategies: TurnStrategy[];
    requiredRules: string[];
    requiredArtifacts: string[];
    rounds: {
        min: number;
        max: number;
    };
}
export declare function validateMeetingSpec(spec: MeetingSpec, config?: MeetingValidationConfig): MeetingSpec;
export declare function parseMeetingSpecFromContent(content: string, ext: '.yaml' | '.yml' | '.md', config?: MeetingValidationConfig): MeetingSpec;
export declare function resolveMeetingSpec(workspacePath?: string): MeetingSpec;
export {};
