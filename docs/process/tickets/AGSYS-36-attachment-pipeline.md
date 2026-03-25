# AGSYS-36 — Cockpit Attachment Pipeline

## Context / Problem
Cockpit file attach action currently injects only text tokens (`[file:name]`) and does not persist/upload files.
As a result, chat runs and evidence trails do not contain real artifacts for attached files.

## Scope
- Implement multipart upload endpoint for cockpit attachments.
- Persist attachment files and metadata under project artifacts.
- Integrate frontend attach flow with upload API.
- Pass attachment metadata in `/api/chat` payload and register attachment evidence for run ticket.

## Acceptance Criteria
- Attaching files from cockpit uploads and persists them in attachment storage.
- Uploaded attachments are included in chat payload and reflected in evidence registry.
- Existing chat run flow remains functional with and without attachments.
- Unit tests and frontend build pass.

## Expected Pipeline
- `pipeline=new-feature`
- stages: intake -> implement -> verify -> review -> git -> docs

## Gate
- API endpoint tests pass.
- Frontend build passes.
- Git preflight token exists and is approved.
- Branch/worktree isolation is respected (`one ticket = one branch = one worktree`).
