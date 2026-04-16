const Ajv = require('ajv');
const addFormats = require('ajv-formats');
import { AgentDefinition } from '../AgentFactory';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const agentSchema: any = {
  type: 'object',
  properties: {
    callsign: { type: 'string', minLength: 3 },
    mission: { type: 'string', minLength: 10 },
    owns: { type: 'array', items: { type: 'string' } },
    guardrails: { type: 'array', items: { type: 'string' }, minItems: 1 },
    fullInstructions: { type: 'string' },
  },
  required: ['callsign', 'mission', 'guardrails'],
  additionalProperties: true,
};

const validate = ajv.compile(agentSchema);

export class AgentValidator {
  /**
   * Validates an agent definition against the schema.
   * Throws an error if invalid.
   */
  static validateAgent(definition: AgentDefinition): void {
    const isValid = validate(definition);
    if (!isValid) {
      const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
      throw new Error(`Agent validation failed: ${errors}`);
    }
  }
}
