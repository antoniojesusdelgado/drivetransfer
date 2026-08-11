# CopyDrive Demo product brief

## Context

Economic justifications for publicly funded projects require assembling large volumes of supporting documentation: incoming invoices, expense sheets, receipts, employment contracts, payroll documents and their corresponding payment evidence. When those documents are distributed across Google Drive, moving them one by one into each project folder is slow and difficult to verify.

CopyDrive originated as a Google Apps Script tool that reduced this manual work by connecting a source folder and a destination folder, indexing the source hierarchy, allowing selective transfer, preventing duplicates and reporting the result.

## Public replica

The repository will reproduce the functional approach without exposing the operational environment that motivated it.

- All examples and fixtures must be synthetic.
- No real folder identifiers or file metadata may be committed.
- No internal folder structure, naming convention or justification rule may be inferred or published.
- The public project is technically independent and is not an official Foundation product.

## Users

- Operations and project teams that organize supporting documentation.
- Finance and administration teams that need traceability before submitting a justification.
- Any Google Workspace user who needs controlled bulk transfers between Drive folders.

## Core workflow

1. The user authenticates with Google using minimum permissions.
2. The user selects or enters an authorized source folder and destination folder.
3. CopyDrive validates access and prevents invalid source/destination combinations.
4. The system indexes the source hierarchy using pagination and quota-aware batches.
5. The user selects files or folders and chooses `Copy` or `Move`.
6. A dry run displays totals, duplicates, permission issues and expected changes.
7. The user confirms the operation. `Move` requires an additional explicit warning.
8. A resumable job processes the selection and reports progress.
9. The result separates completed, skipped, duplicated and failed items.

## Duplicate policy

The initial design must compare stable Drive identifiers where available and use a documented fallback based on normalized name, parent path, MIME type and size. Hashing should only be considered when the API and file type make it reliable and its cost is justified.

Duplicate outcomes must be explicit:

- Skip existing file.
- Copy with a renamed destination, if the user selects that policy.
- Replace only when Google Drive semantics and permissions allow it and the user confirms it.

Silent overwrite is not permitted.

## Safety requirements

- Copy is the default operation; move is never preselected.
- A dry run is mandatory before mutation.
- Source and destination cannot be the same folder.
- The destination cannot create a recursive move relationship with the source.
- Partial failures must not corrupt the completed portion of a job.
- Retries must avoid duplicating items already completed.
- Logs and analytics must not expose document names, folder IDs or tokens.
- OAuth tokens and secrets must remain outside the client and repository.

## MVP acceptance criteria

- A synthetic demo can index and render a nested folder tree.
- Users can select individual files, folders and all descendants.
- Copy and move plans show accurate counts before confirmation.
- Duplicate items are identified and skipped according to the selected policy.
- Progress and final results remain understandable with thousands of items.
- Unit tests cover selection propagation, duplicate decisions and resumable execution.
- The UI is keyboard accessible and usable on desktop and mobile.

## Decisions for the first development session

- Confirm Apps Script plus `clasp` as the initial runtime or document why a different architecture is necessary.
- Define OAuth scopes for read-only discovery, copy and move.
- Model job state, pagination, quotas and resumability.
- Choose a synthetic fixture format for Drive trees.
- Define the first vertical slice before scaffolding the full interface.
