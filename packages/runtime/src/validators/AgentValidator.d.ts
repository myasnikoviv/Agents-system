import { AgentDefinition } from '../AgentFactory';
export declare class AgentValidator {
    /**
     * Validates an agent definition against the schema.
     * Throws an error if invalid.
     */
    static validateAgent(definition: AgentDefinition): void;
}
