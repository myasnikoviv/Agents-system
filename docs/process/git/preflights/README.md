# Preflight Tokens

## Purpose
Execution permission tokens issued by `Пан Гілка (Git Flow Manager)`.

## Rule
No file mutation is allowed unless there is an approved token matching current branch and worktree.

## File Format
Use `.env` files in this directory, one per ticket.

Required fields:
- `TICKET_ID`
- `STATUS=APPROVED`
- `EXECUTION_APPROVED=YES`
- `APPROVED_BY`
- `APPROVED_AT`
- `BRANCH`
- `WORKTREE`
- `SCOPE`

Template:
- `docs/process/git/preflights/PREFLIGHT-TEMPLATE.env`
