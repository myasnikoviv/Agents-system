# Pipeline State — AGSYS-492

- Pipeline: refactor
- Stage: implementation
- Next: TDD QA -> PM acceptance
- Status: In Progress
- Updated: 2026-04-08

## Progress Log
1. Added per-project and global worker caps via runtime config envs.
2. Added eviction strategy (idle standby/hot/cold first).
3. Added fail-fast guard when caps reached and no evictable workers remain.
4. Added idle-timeout pruning API in worker manager.
5. Wired pruning into swarm workers endpoint path.
6. Added/updated tests for caps and idle pruning behavior.
