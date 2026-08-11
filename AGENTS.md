# AGENTS.md

## Working language

- Respond to the user in Spanish.
- Use English for code, identifiers, branches and commit messages.
- Keep public product documentation in natural Spanish unless a technical convention requires English.

## Product boundaries

- CopyDrive is a public, independent replica of a tool created to solve a real document-management need at Fundacion Cibervoluntarios.
- Never include real Google Drive folder IDs, document names, grant files, invoices, payroll records, contracts, credentials or internal procedures.
- Use only synthetic folder trees, files and metadata in tests, screenshots and demonstrations.
- Do not imply that the public repository is owned, sponsored or supported by Fundacion Cibervoluntarios.

## Engineering principles

- Inspect the repository, current branch and working tree before making changes.
- Prefer TypeScript, small modules and explicit domain types.
- Keep Google OAuth scopes to the minimum required for the selected operation.
- Separate discovery, selection, duplicate detection, execution and reporting.
- Copy and move must be distinct, explicit operations. Moving files requires an additional confirmation step and must never be the default.
- Implement a dry-run preview before any mutation.
- Make operations idempotent where possible and safe to retry after partial failures.
- Do not log access tokens, folder IDs, file names or other sensitive document metadata.
- Respect Google Apps Script and Google Drive API quotas and use batching, pagination and resumable jobs when appropriate.

## Change control

- Do not commit, push, open pull requests, publish releases or deploy without explicit user authorization.
- Do not rewrite published history or force-push.
- Preserve user changes and avoid destructive commands.

## Validation

- Run formatting, lint, typecheck, tests and build when available.
- Test duplicate handling, permissions, partial failures, retries and copy/move confirmation.
- Review accessibility, responsive behavior, privacy and security for every user-facing flow.
