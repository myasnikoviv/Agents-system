"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentFactory_1 = require("../AgentFactory");
const SkillProvider_1 = require("../SkillProvider");
async function testAgentInfrastructure() {
    console.log("--- Testing Agent Infrastructure ---");
    try {
        const role = 'research-agent';
        const agent = await AgentFactory_1.AgentFactory.loadAgent(role);
        console.log(`Loaded Agent: ${agent.callsign}`);
        console.log(`Mission: ${agent.mission}`);
        console.log(`Guardrails: ${agent.guardrails.length}`);
        const skill = await SkillProvider_1.SkillProvider.loadSkill(role);
        if (skill) {
            console.log(`Loaded Skill: ${skill.name}`);
            console.log(`Description: ${skill.description}`);
            console.log(`Workflow steps: ${skill.workflow.length}`);
        }
        else {
            console.warn(`No skill found for ${role}`);
        }
        console.log("\nInfrastructure Check: PASS");
    }
    catch (err) {
        console.error("Infrastructure Check: FAIL", err);
        process.exit(1);
    }
}
testAgentInfrastructure();
