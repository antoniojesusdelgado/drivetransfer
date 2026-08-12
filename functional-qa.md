# Functional QA

## Added capabilities

- Preflight summary for item counts, known size, estimated duration, permissions and cross-space warnings.
- Duplicate policies: skip, preserve both with a collision-safe name, or stop for review.
- Private favorite routes per Google user, with an exploration example using synthetic folders.
- Versioned private documents in appDataFolder, separated into manifests, selections and checkpoints.
- Transfer center with a single active job, ordered queue and selective actions.
- Guided schedules, conservative one-way synchronization and a per-user locked dispatcher.
- The dispatcher processes resumable pages of 100 Drive items and mutation batches of 10 until the Apps Script safety deadline.
- New or modified synchronization files receive collision-safe dated versions; destination removals are never issued.
- Ninety-day history and safe JSON/CSV reports.
- Browser completion notifications requested only when the user opts in.
- Retry action that removes only failed checkpoints and preserves completed operations.

## Safety boundaries

- Google access tokens remain memory-only.
- No Drive IDs, names or job payloads are written to browser storage for Google mode.
- Private documents reject unknown schemas and payloads above the configured size limit.
- The appDataFolder index and trigger reference are the only small operational values retained in UserProperties.
- A resumable job can be discovered from another browser after reconnecting the same Google account.
- Favorite and job inputs are validated before storage; storage errors return safe public codes.
- Duplicate preservation never overwrites an existing file.
- Move confirmation is requested again after restoring a saved job.

## Validation

- Exploration flow: favorite route, duplicate rename, preflight, pause, resume, partial result and failed-only retry.
- Responsive widths: 390, 768, 1024 and 1488 pixels without page-level horizontal overflow.
- Keyboard and semantic structure: radio groups, fieldsets, labelled regions and disabled conflict continuation.
- Automated coverage: planner policies, preflight blocking, retry preservation, gateway authorization and private-storage request shape.
- Automated coverage: combined filters, new/modified rules, schedule calculation, queue promotion, 90-day pruning and safe reports.
- Automated coverage: a synthetic 25,000-item tree renders through a bounded virtual window.
- Manual browser review: transfer center, schedules and history at 390, 768, 1024 and 1488 pixels without horizontal overflow or console errors.
