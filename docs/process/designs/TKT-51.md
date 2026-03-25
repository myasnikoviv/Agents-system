# Technical Design: TKT-51 — Agent Cockpit UI

## Context
The "Agent Cockpit" is a centralized web interface for interacting with agentic workflows. It replaces CLI-based interaction and enables real-time monitoring of agent progress.

## Architecture
1. **Frontend (React/Vite)**:
   - `CockpitPage.tsx`: Main UI component.
   - Live Event Feed: Connects via Server-Sent Events (SSE) to `/api/events/stream`.
   - Voice Input: Uses `MediaRecorder` API to capture audio blobs (WAV/OPUS).
   - Mode Selector: Controls `executionMode` (linear, multi-agent, etc.).

2. **Backend (Node.js/Express)**:
   - `/api/chat`: Dispatches user prompt to LangGraph runtime via `RuntimeHub`. 
   - `/api/events/stream`: Implements SSE, tailing the Redis stream `events:runtime_hub` via `EventBus`.
   - `/api/voice/transcribe`: Proxy to OpenAI Whisper API using `openai` SDK. Handles multipart `multer` uploads.

3. **Invariants & Safety**:
   - Audio files are stored temporarily in `/tmp/` and cleared after transcription.
   - SSE connection ensures low-latency event propagation without polling.
   - Mock mode support for testing without hitting real models.

## Dependencies
- `openai`: for Whisper transcription.
- `multer`: for audio upload handling.
- `ioredis`: for event stream fetching.
- `MediaRecorder`: browser API.

## Design Patterns
- **Observer Pattern**: Cockpit subscribes to Redis stream updates via SSE.
- **Service Layer**: `EventBus` abstracts Redis interactions.
