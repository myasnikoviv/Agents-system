# AGSYS-745 — Performance & Bottleneck Benchmark Pack

## Scope
Synthetic benchmark evidence for:
- baseline vs scaled worker throughput
- queue latency (p50/p95)
- queue drain behavior
- bottleneck risk indication for broker/control-plane paths

## Method
Benchmark script: `scripts/verify_runtime_benchmark.ts`

Command:
`RUNTIME_LOCAL_ONLY_MODE=true npx tsx scripts/verify_runtime_benchmark.ts`

Workload:
- tasks: 200
- simulated task processing: 8ms
- scenario A: 1 worker
- scenario B: 4 workers

## Result Snapshot
- Baseline (1 worker):
  - total drain: 1962ms
  - throughput: 101.94 tasks/s
  - queue p50: 1001ms
  - queue p95: 1860ms

- Scaled (4 workers):
  - total drain: 496ms
  - throughput: 403.23 tasks/s
  - queue p50: 246ms
  - queue p95: 468ms

- Derived:
  - throughput speedup: 3.96x
  - queue p95 delta: -74.84%

## Bottleneck Assessment
- broker saturation risk: acceptable
- control-plane choke risk: acceptable

## Interpretation
- Runtime scaling shows material throughput gain with improved queue latency.
- No immediate synthetic sign that broker/control-plane is the primary choke point in this workload.

## Caveats
- This is synthetic local benchmark and not a production soak test.
- Real environment benchmark under production infra profile remains recommended before GA.
