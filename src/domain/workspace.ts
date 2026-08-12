import type {
  HistoryEntry,
  StoredJobManifest,
  TransferJob,
  VerificationSummary,
} from "./types";

const HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export function enqueueJob(
  jobs: readonly StoredJobManifest[],
  job: StoredJobManifest,
): readonly StoredJobManifest[] {
  const hasActive = jobs.some(({ status }) => status === "running");
  return [...jobs, { ...job, status: hasActive ? "queued" : "running" }];
}

export function promoteNextJob(
  jobs: readonly StoredJobManifest[],
): readonly StoredJobManifest[] {
  if (jobs.some(({ status }) => status === "running")) return jobs;
  const next = jobs.find(({ status }) => status === "queued");
  return next
    ? jobs.map((job) =>
        job.id === next.id ? { ...job, status: "running" } : job,
      )
    : jobs;
}

export function verificationFromJob(job: TransferJob): VerificationSummary {
  const checkpoints = Object.values(job.checkpoints);
  const failed = checkpoints.filter(({ result }) =>
    ["failed_retryable", "failed_terminal"].includes(result),
  ).length;
  const verified = checkpoints.length - failed;
  return {
    expected: job.plan.operations.length,
    verified,
    checksumVerified: job.plan.operations.filter(
      ({ item, operationKey }) =>
        item.md5Checksum &&
        !["failed_retryable", "failed_terminal"].includes(
          job.checkpoints[operationKey]?.result ?? "pending",
        ),
    ).length,
    metadataVerified: Math.max(
      0,
      verified -
        job.plan.operations.filter(({ item }) => item.md5Checksum).length,
    ),
    failed,
  };
}

export function pruneHistory(
  history: readonly HistoryEntry[],
  now = new Date(),
): readonly HistoryEntry[] {
  const cutoff = now.getTime() - HISTORY_RETENTION_MS;
  return history.filter(
    ({ finishedAt }) => new Date(finishedAt).getTime() >= cutoff,
  );
}
