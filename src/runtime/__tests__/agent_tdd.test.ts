import { AgentExecutor } from '../AgentExecutor';

async function testTDD() {
    console.log("--- TDD: Agent Reasoning Test ---");
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        console.error("FAIL: UNSET OPENAI_API_KEY");
        process.exit(1);
    }

    const executor = new AgentExecutor(apiKey);
    const role = 'research-agent';
    const message = "Analyze risk for Redis hub implementation";

    try {
        const response = await executor.runRole(role, message);
        console.log("Response length:", response.length);
        if (response.length > 50 && response.includes("Research")) {
            console.log("PASS: Real reasoning detected.");
        } else {
            console.error("FAIL: Response too short or mock-like.");
            process.exit(1);
        }
    } catch (err) {
        console.error("FAIL: Execution error", err);
        process.exit(1);
    }
}

testTDD();
