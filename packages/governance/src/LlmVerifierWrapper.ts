import { wrapLLMCall } from '@system/shared';
import { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';

export async function runHybridVerifier(
  rule: GovernanceRule,
  ctx: GovernanceEngineContext,
  deterministicReason: string,
): Promise<GovernanceRuleEvaluation> {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    return {
      ruleId: rule.id,
      verdict: 'unknown',
      reason: `hybrid_skipped_no_api_key:${deterministicReason}`,
      evidenceSummary: 'OPENAI_API_KEY missing',
    };
  }

  const prompt = `You are a governance verifier. Rule=${rule.id}. DeterministicReason=${deterministicReason}. Return only JSON: {"verdict":"pass|fail|unknown","reason":"..."}`;
  const out = await wrapLLMCall(
    {
      runId: ctx.runId,
      projectId: ctx.projectId,
      chainId: ctx.chainId,
      model: 'gpt-4o-mini',
      provider: 'openai',
      source: 'guard',
    },
    prompt,
    async () => ({
      response: JSON.stringify({ verdict: 'unknown', reason: 'hybrid_not_enabled_in_mvp' }),
      tokensInput: 0,
      tokensOutput: 0,
    }),
  );

  try {
    const parsed = JSON.parse(out);
    const verdict = parsed?.verdict === 'pass' || parsed?.verdict === 'fail' ? parsed.verdict : 'unknown';
    return {
      ruleId: rule.id,
      verdict,
      reason: String(parsed?.reason || 'hybrid_wrapper_default'),
      evidenceSummary: 'hybrid verifier invoked',
    };
  } catch {
    return {
      ruleId: rule.id,
      verdict: 'unknown',
      reason: 'hybrid_response_parse_failed',
      evidenceSummary: out.slice(0, 180),
    };
  }
}
