# Requirements Pack: AGSYS-218
**Title**: Enhanced API key interface for OpenHands SDK
**Ticket**: AGSYS-218
**Pipeline**: feature-change

## Context / Problem
## 1. Context & Objectives
Improve the security and usability of the API key fields in the Cockpit settings page for the OpenHands SDK.

## Scope
- Implement an `ApiKeyInput` component with the following features:
    - **Masking**: Display only the first 4 and last 4 characters when obscured (e.g., `sk-a...7abc`).
    - **Visibility Toggle**: An "Eye" icon to show/hide the full plain text.
    - **Paste Shortcut**: A "Paste" icon to insert content from the clipboard.
- Apply this component to the 3 OpenHands keys: Anthropic, OpenAI, and Google.

## 3. Architecture & Implementation
- Use `lucide-react` for icons (`Eye`, `EyeOff`, `Clipboard`).
- Use vanilla CSS for styling to match the existing dark premium design.

## Acceptance Criteria
- [ ] Users can see the teaser of the key (`1234...5678`) when masked.
- [ ] Users can reveal the full key.
- [ ] Users can paste from clipboard.
- [ ] UI doesn't crash on state changes.

## Expected Pipeline
- intake-requirements -> assumptions-review -> implementation -> verification -> closure

## Gate
- [ ] UI can consume and mask API keys correctly.

## Status
- **PM Orchestrator**: ✅ Approved
- **Product Owner**: ⏳ Pending Approval
