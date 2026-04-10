# TRADE-101 QA Contract Suite

## Scope
Validate runtime manifest contract with positive and negative coverage:
- `ProjectRuntimeManifestValidator`
- `ProjectRuntimeManifestLoader`
- `DynamicPipelineExecutor`
- `PipelineSelector` (manifest-aware selection)

## Test Command
```bash
npx jest src/runtime/__tests__/project_runtime_manifest.test.ts src/runtime/__tests__/dynamic_pipeline_executor.test.ts src/runtime/__tests__/pipeline_selector.test.ts src/runtime/__tests__/manifest_validator_negative.test.ts --runInBand
```

## Result
- Status: PASS
- Suites: 4 passed
- Tests: 14 passed
- Failed: 0

## Evidence Notes
- Negative cases verify explicit contract rejection for malformed runtime manifests.
- Pipeline selection remains backward-compatible via legacy selector default.
