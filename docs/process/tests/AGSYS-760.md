# AGSYS-760 — Semantic Cache (MVP) (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Similar inputs reuse outputs
- Configurable similarity threshold

## Changes
- Added semantic cache module:
  - `src/runtime/optimization/SemanticCache.ts`
  - bucketed by pipeline + agent + stage signature
  - similarity-based hit via token Jaccard score
  - policy file support:
    - `docs/runtime/adaptive/semantic-cache-policy.json`
    - `enabled`, `threshold`, `ttlSeconds`, `maxEntriesPerBucket`
- Integrated semantic cache in runtime:
  - `src/runtime/graphs/MultipleAgentsRuntime.ts`
  - lookup before execution (`semantic_cache_hit`)
  - persist response after successful execution

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/semantic_cache.test.ts src/runtime/__tests__/llm_response_cache.test.ts
```
Result:
- Pass (2 suites, 4 tests).

2. Verified outcomes:
- near-identical inputs produce semantic cache hit and output reuse
- low-similarity inputs miss cache
- threshold is configurable and enforced
