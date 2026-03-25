# TKT-55: Voice Interface Hardening (Web Speech API & Whisper Fallback)

## Business Context
The current Voice Input is a simple proxy to Whisper. This adds latency and cost for simple commands. We need a hybrid model that uses the browser's native `webkitSpeechRecognition` for instant feedback and OpenAI Whisper only for high-fidelity needs or fallbacks.

## Technical Scope
1. **Frontend (CockpitPage.tsx)**:
   - Integrate `window.SpeechRecognition` (Web Speech API).
   - Show live transcription text while the user is talking.
   - Detect silence/stop-speaking via browser events.
2. **Hybrid Logic**:
   - If confidence is high (>0.9) and text is simple, use Web Speech.
   - If confidence is low or complex reasoning is needed, upload buffer to `/api/voice/transcribe`.
3. **UI Enhancements**:
   - Pulse animation on the microphone button during recording.
   - Distinct "Processing" states for local vs. remote transcription.

## Expected Handoff Pipeline
1. **PM Orchestrator** -> Design intake.
2. **Solution Architect** (`Майстер Креслень`) -> Define hybrid strategy and state management for confidence thresholds.
3. **Developer** (`Кодоковаль`) -> Implement React hooks for Speech API.
4. **QA** (`Ловець Багів`) -> Cross-browser verification (Chrome/Safari).

## Acceptance Criteria
- Latency reduced for simple verbal commands.
- Live "ghost text" appears in chat input during speech.
- Successful fallback to Whisper on browser SpeechRecognition failure.
