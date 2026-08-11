# DriveTransfer

DriveTransfer is a public, independent demonstration of a document-transfer assistant for Google Drive. It indexes a source folder recursively, lets the user choose which files and directories to include, checks the destination for duplicates and then copies or moves the selected content with progress tracking and a final report.

The original tool was created to reduce the manual work involved in preparing economic-justification documentation at Fundacion Cibervoluntarios. The public project will be an independent replica: it will use synthetic examples and will not contain real documents, folder identifiers, credentials, internal rules or connections to the Foundation's environment.

## Product objective

Turn a repetitive, error-prone document transfer into a controlled workflow:

1. Connect a source and destination folder.
2. Index the complete source hierarchy.
3. Select files and directories from a clear tree view.
4. Preview the operation and detect duplicates.
5. Copy or move only the approved items.
6. Track progress, warnings and recoverable errors.
7. Review and export a final operation summary.

## Planned capabilities

- Recursive Google Drive folder indexing.
- Search, filters and bulk selection.
- Copy and move operations with separate safeguards.
- Duplicate detection before execution.
- Dry-run preview and explicit confirmation.
- Progress, cancellation and safe retry.
- Results dashboard with copied, moved, skipped and failed items.
- Accessible and responsive interface.
- Synthetic demo mode without access to a real Drive account.

## Initial technical direction

The first implementation should evaluate a TypeScript-based Google Apps Script application managed with `clasp`, preserving the strengths of the original solution while improving maintainability, testing and user experience. The architecture must remain open to a separate web frontend only if OAuth, execution time or Drive API constraints justify it.

See [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for the product requirements and [CODEX_PROJECT_PROMPT.md](CODEX_PROJECT_PROMPT.md) for the prompt to start the dedicated Codex project.

## Repository status

Project definition and architecture phase. No production credentials or deployment are included.
