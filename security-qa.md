# Security and system validation

Date: 2026-08-12
Release: 1.0.0

## Scope

DriveTransfer is a static React application hosted by Vercel. Authenticated
operations are sent directly to the Google Apps Script Execution API and run
with the connected user's authorization. The browser never uploads, downloads,
parses or executes the bytes of Drive files; Google Drive performs copy and move
operations server-side.

## Implemented controls

- OAuth access tokens remain in memory and are not written to URLs, logs or
  persistent browser storage.
- Apps Script validates Drive IDs, opaque job IDs, operation kinds, spaces,
  sizes, MIME types, relative paths and file names before mutation.
- File names are limited to 255 characters and control characters are rejected.
- Read, write and transfer entry points have per-user rate limits. Transfer
  calls are limited to 60 batches per minute and each batch contains at most 10
  mutations.
- A second script-wide limit caps distributed traffic across users, and
  mutating entry points use a per-user lock so concurrent requests cannot race
  over the same private state or Drive destination.
- Source, destination, capabilities, permissions and ancestry are revalidated
  immediately before every Drive mutation.
- Copy retries are idempotent through opaque `appProperties`; move remains an
  explicit, additionally confirmed operation.
- Verification calls are limited to 100 operation keys and the client paginates
  larger verification sets.
- Private app-data documents are limited to 450 KB both before writing and
  before reading.
- React renders external names as text. There is no raw HTML injection, dynamic
  code execution or user-controlled URL fetch in the application.
- CSV reports neutralize spreadsheet formulas and omit internal Drive and job
  identifiers.
- Production headers include CSP, HSTS, anti-framing, MIME sniffing protection,
  a restrictive permissions policy, same-origin resource policy and strict
  referrer handling.
- Apps Script exception logging is disabled and the repository contains no
  application logging of tokens, Drive IDs or file names.
- Persisted jobs, workspace history and schedules are reconstructed from an
  allowlist of validated fields. Invalid counters, dates, time zones, filter
  bounds, notification flags and duplicate checkpoint keys are rejected.

## Validation evidence

- Formatting: passed.
- ESLint: passed.
- TypeScript: passed.
- Vitest: 15 files and 42 tests passed.
- Web and Apps Script production builds: passed.
- Apps Script artifact verification: passed.
- npm dependency audit (production and complete tree): 0 known vulnerabilities.
- Secret-name, token-leak and dangerous-DOM scan: no matches.
- No tracked environment, credential, secret or token files were found.
- Official EU guidance was checked before publication: the transparency icon is
  optional in this human-reviewed, editorially controlled context and is not
  represented as an EU certification.
- Browser smoke test at 390, 768, 1024 and 1488 px: no horizontal overflow,
  page errors or console errors.
- Job cards at all tested widths: no shadow bands between cards.

## Residual risk

No internet-facing application can be guaranteed to be impossible to attack.
The remaining material dependencies are Google's OAuth, Drive and Apps Script
platforms, Vercel's static delivery, user-granted Drive permissions and their
quotas. Public OAuth access with the restricted Drive scope still requires a
controlled domain, Google's verification and any security assessment Google
requests. The user-specific and script-wide limits reduce abuse, while Google
quotas remain the ultimate platform cap because Vercel does not proxy the
authenticated Apps Script calls.

DriveTransfer does not ingest or execute file bytes: Drive copies or moves the
opaque objects server-side. This prevents a transferred document from executing
inside Vercel or Apps Script, but it is not an antivirus and cannot certify that
a file is safe when another application later opens it.
