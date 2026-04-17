import { type DetectedLanguage } from '../LanguageDetection';
export declare const PilotStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    executionOptions: import("@langchain/langgraph").BaseChannel<{
        mode: "multiple_agents";
    }, {
        mode: "multiple_agents";
    } | import("@langchain/langgraph").OverwriteValue<{
        mode: "multiple_agents";
    }>, unknown>;
    selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    enforcement: import("@langchain/langgraph").BaseChannel<{
        pipeline?: string;
        skills?: string[];
    }, {
        pipeline?: string;
        skills?: string[];
    } | import("@langchain/langgraph").OverwriteValue<{
        pipeline?: string;
        skills?: string[];
    }>, unknown>;
    messages: import("@langchain/langgraph").BaseChannel<{
        role: string;
        content: string;
    }[], {
        role: string;
        content: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        role: string;
        content: string;
    }[]>, unknown>;
    projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
}>;
export type PilotState = typeof PilotStateAnnotation.State;
export declare const pilotGraph: import("@langchain/langgraph").CompiledStateGraph<{
    ticketId: string;
    runId: string;
    threadId: string;
    status: string;
    artifactLogs: string[];
    executionOptions: {
        mode: "multiple_agents";
    };
    selected_pipeline: string;
    intent: string;
    customAgents: string[];
    requestedSkills: string[];
    enforcement: {
        pipeline?: string;
        skills?: string[];
    };
    messages: {
        role: string;
        content: string;
    }[];
    projectId: string;
    workspacePath: string;
    agentContextPath: string;
    preferredLanguage: DetectedLanguage;
}, {
    ticketId?: string | import("@langchain/langgraph").OverwriteValue<string>;
    runId?: string | import("@langchain/langgraph").OverwriteValue<string>;
    threadId?: string | import("@langchain/langgraph").OverwriteValue<string>;
    status?: string | import("@langchain/langgraph").OverwriteValue<string>;
    artifactLogs?: string[] | import("@langchain/langgraph").OverwriteValue<string[]>;
    executionOptions?: {
        mode: "multiple_agents";
    } | import("@langchain/langgraph").OverwriteValue<{
        mode: "multiple_agents";
    }>;
    selected_pipeline?: string | import("@langchain/langgraph").OverwriteValue<string>;
    intent?: string | import("@langchain/langgraph").OverwriteValue<string>;
    customAgents?: string[] | import("@langchain/langgraph").OverwriteValue<string[]>;
    requestedSkills?: string[] | import("@langchain/langgraph").OverwriteValue<string[]>;
    enforcement?: {
        pipeline?: string;
        skills?: string[];
    } | import("@langchain/langgraph").OverwriteValue<{
        pipeline?: string;
        skills?: string[];
    }>;
    messages?: {
        role: string;
        content: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        role: string;
        content: string;
    }[]>;
    projectId?: string | import("@langchain/langgraph").OverwriteValue<string>;
    workspacePath?: string | import("@langchain/langgraph").OverwriteValue<string>;
    agentContextPath?: string | import("@langchain/langgraph").OverwriteValue<string>;
    preferredLanguage?: DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>;
}, "router" | "swarm" | "finalize" | "__start__", {
    ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    executionOptions: import("@langchain/langgraph").BaseChannel<{
        mode: "multiple_agents";
    }, {
        mode: "multiple_agents";
    } | import("@langchain/langgraph").OverwriteValue<{
        mode: "multiple_agents";
    }>, unknown>;
    selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    enforcement: import("@langchain/langgraph").BaseChannel<{
        pipeline?: string;
        skills?: string[];
    }, {
        pipeline?: string;
        skills?: string[];
    } | import("@langchain/langgraph").OverwriteValue<{
        pipeline?: string;
        skills?: string[];
    }>, unknown>;
    messages: import("@langchain/langgraph").BaseChannel<{
        role: string;
        content: string;
    }[], {
        role: string;
        content: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        role: string;
        content: string;
    }[]>, unknown>;
    projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
}, {
    ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    executionOptions: import("@langchain/langgraph").BaseChannel<{
        mode: "multiple_agents";
    }, {
        mode: "multiple_agents";
    } | import("@langchain/langgraph").OverwriteValue<{
        mode: "multiple_agents";
    }>, unknown>;
    selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    enforcement: import("@langchain/langgraph").BaseChannel<{
        pipeline?: string;
        skills?: string[];
    }, {
        pipeline?: string;
        skills?: string[];
    } | import("@langchain/langgraph").OverwriteValue<{
        pipeline?: string;
        skills?: string[];
    }>, unknown>;
    messages: import("@langchain/langgraph").BaseChannel<{
        role: string;
        content: string;
    }[], {
        role: string;
        content: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        role: string;
        content: string;
    }[]>, unknown>;
    projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
}, import("@langchain/langgraph").StateDefinition, {
    router: Partial<import("@langchain/langgraph").StateType<{
        ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        executionOptions: import("@langchain/langgraph").BaseChannel<{
            mode: "multiple_agents";
        }, {
            mode: "multiple_agents";
        } | import("@langchain/langgraph").OverwriteValue<{
            mode: "multiple_agents";
        }>, unknown>;
        selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        enforcement: import("@langchain/langgraph").BaseChannel<{
            pipeline?: string;
            skills?: string[];
        }, {
            pipeline?: string;
            skills?: string[];
        } | import("@langchain/langgraph").OverwriteValue<{
            pipeline?: string;
            skills?: string[];
        }>, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<{
            role: string;
            content: string;
        }[], {
            role: string;
            content: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            role: string;
            content: string;
        }[]>, unknown>;
        projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
    }>>;
    swarm: Partial<import("@langchain/langgraph").StateType<{
        ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        executionOptions: import("@langchain/langgraph").BaseChannel<{
            mode: "multiple_agents";
        }, {
            mode: "multiple_agents";
        } | import("@langchain/langgraph").OverwriteValue<{
            mode: "multiple_agents";
        }>, unknown>;
        selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        enforcement: import("@langchain/langgraph").BaseChannel<{
            pipeline?: string;
            skills?: string[];
        }, {
            pipeline?: string;
            skills?: string[];
        } | import("@langchain/langgraph").OverwriteValue<{
            pipeline?: string;
            skills?: string[];
        }>, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<{
            role: string;
            content: string;
        }[], {
            role: string;
            content: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            role: string;
            content: string;
        }[]>, unknown>;
        projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
    }>>;
    finalize: Partial<import("@langchain/langgraph").StateType<{
        ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        executionOptions: import("@langchain/langgraph").BaseChannel<{
            mode: "multiple_agents";
        }, {
            mode: "multiple_agents";
        } | import("@langchain/langgraph").OverwriteValue<{
            mode: "multiple_agents";
        }>, unknown>;
        selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
        enforcement: import("@langchain/langgraph").BaseChannel<{
            pipeline?: string;
            skills?: string[];
        }, {
            pipeline?: string;
            skills?: string[];
        } | import("@langchain/langgraph").OverwriteValue<{
            pipeline?: string;
            skills?: string[];
        }>, unknown>;
        messages: import("@langchain/langgraph").BaseChannel<{
            role: string;
            content: string;
        }[], {
            role: string;
            content: string;
        }[] | import("@langchain/langgraph").OverwriteValue<{
            role: string;
            content: string;
        }[]>, unknown>;
        projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
    }>>;
}, unknown, unknown>;
/**
 * Main execution entry point — unified graph with single execution path.
 * Explicit user directives can override pipeline/agents, but the runtime
 * always executes through the swarm pipeline loop.
 */
export declare function executeUnifiedSwarmRun(initialState: Partial<PilotState>): Promise<import("@langchain/langgraph").StateType<{
    ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    executionOptions: import("@langchain/langgraph").BaseChannel<{
        mode: "multiple_agents";
    }, {
        mode: "multiple_agents";
    } | import("@langchain/langgraph").OverwriteValue<{
        mode: "multiple_agents";
    }>, unknown>;
    selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    enforcement: import("@langchain/langgraph").BaseChannel<{
        pipeline?: string;
        skills?: string[];
    }, {
        pipeline?: string;
        skills?: string[];
    } | import("@langchain/langgraph").OverwriteValue<{
        pipeline?: string;
        skills?: string[];
    }>, unknown>;
    messages: import("@langchain/langgraph").BaseChannel<{
        role: string;
        content: string;
    }[], {
        role: string;
        content: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        role: string;
        content: string;
    }[]>, unknown>;
    projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
}>>;
/**
 * Resumes an interrupted run.
 */
export declare function resumeUnifiedSwarmRun(threadId: string, decision: any): Promise<import("@langchain/langgraph").StateType<{
    ticketId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    runId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    threadId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    status: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    artifactLogs: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    executionOptions: import("@langchain/langgraph").BaseChannel<{
        mode: "multiple_agents";
    }, {
        mode: "multiple_agents";
    } | import("@langchain/langgraph").OverwriteValue<{
        mode: "multiple_agents";
    }>, unknown>;
    selected_pipeline: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    intent: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    customAgents: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    requestedSkills: import("@langchain/langgraph").BaseChannel<string[], string[] | import("@langchain/langgraph").OverwriteValue<string[]>, unknown>;
    enforcement: import("@langchain/langgraph").BaseChannel<{
        pipeline?: string;
        skills?: string[];
    }, {
        pipeline?: string;
        skills?: string[];
    } | import("@langchain/langgraph").OverwriteValue<{
        pipeline?: string;
        skills?: string[];
    }>, unknown>;
    messages: import("@langchain/langgraph").BaseChannel<{
        role: string;
        content: string;
    }[], {
        role: string;
        content: string;
    }[] | import("@langchain/langgraph").OverwriteValue<{
        role: string;
        content: string;
    }[]>, unknown>;
    projectId: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    workspacePath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    agentContextPath: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    preferredLanguage: import("@langchain/langgraph").BaseChannel<DetectedLanguage, DetectedLanguage | import("@langchain/langgraph").OverwriteValue<DetectedLanguage>, unknown>;
}>>;
