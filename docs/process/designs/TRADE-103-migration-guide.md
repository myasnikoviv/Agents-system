# TRADE-103 Migration Guide: Canonical Runtime Manifest Bundle

## Goal
Move runtime pipeline/agent/skill resolution from on-the-fly markdown parsing to a canonical project bundle while keeping backward compatibility.

## What Was Added
1. Canonical bundle generator:
   - `src/runtime/ProjectRuntimeManifestMigration.ts`
   - `src/tools/generateRuntimeManifestBundle.ts`
2. Loader enhancement:
   - `src/runtime/ProjectRuntimeManifestLoader.ts` now prefers canonical bundle if present.
3. Canonical bundle artifact:
   - `docs/runtime/project-runtime-manifest.v1.json`

## Migration Steps
1. Run:
```bash
npm run runtime:manifest:migrate
```
2. Verify generated bundle exists at:
   - `docs/runtime/project-runtime-manifest.v1.json`
3. Run contract tests:
```bash
npx jest src/runtime/__tests__/project_runtime_manifest.test.ts src/runtime/__tests__/dynamic_pipeline_executor.test.ts src/runtime/__tests__/pipeline_selector.test.ts src/runtime/__tests__/project_runtime_manifest_migration.test.ts --runInBand
```
4. Commit both runtime changes and generated bundle.

## Compatibility Contract
- If canonical bundle exists: runtime consumes bundle.
- If bundle missing/invalid: loader falls back to markdown adapter.
- Existing project structure (`docs/agents`, `docs/skills`, `docs/pipelines`) remains source-of-truth for regeneration.
