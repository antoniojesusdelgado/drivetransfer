import type {
  OperationCheckpoint,
  PlannedOperation,
  TransferJob,
  TransferJobStatus,
  TransferPlan,
} from "./types";

export function createTransferJob(plan: TransferPlan): TransferJob {
  return {
    id: `job_${plan.id}`,
    plan,
    status: "queued",
    checkpoints: {},
  };
}

function executeOperation(
  operation: PlannedOperation,
  previous?: OperationCheckpoint,
): OperationCheckpoint {
  const attempts = (previous?.attempts ?? 0) + 1;

  if (operation.decision === "blocked") {
    return {
      operationKey: operation.operationKey,
      result: "failed_terminal",
      attempts,
      errorCode: "permission_denied",
    };
  }

  if (operation.decision === "skip_duplicate") {
    return {
      operationKey: operation.operationKey,
      result: "skipped_duplicate",
      attempts,
    };
  }

  if (operation.decision === "rename_duplicate") {
    return {
      operationKey: operation.operationKey,
      result: operation.command === "copy" ? "copied" : "moved",
      attempts,
    };
  }

  if (operation.decision === "reuse_folder") {
    return {
      operationKey: operation.operationKey,
      result: "reused_folder",
      attempts,
    };
  }

  if (operation.item.simulation === "retry_once" && attempts === 1) {
    return {
      operationKey: operation.operationKey,
      result: "failed_retryable",
      attempts,
      errorCode: "temporary_unavailable",
    };
  }

  return {
    operationKey: operation.operationKey,
    result: operation.command === "copy" ? "copied" : "moved",
    attempts,
  };
}

function isFinished(checkpoint?: OperationCheckpoint): boolean {
  return (
    checkpoint !== undefined &&
    checkpoint.result !== "pending" &&
    checkpoint.result !== "failed_retryable"
  );
}

function finalStatus(
  checkpoints: Readonly<Record<string, OperationCheckpoint>>,
): TransferJobStatus {
  return Object.values(checkpoints).some(
    (checkpoint) => checkpoint.result === "failed_terminal",
  )
    ? "completed_with_errors"
    : "completed";
}

export function processNextBatch(job: TransferJob, batchSize = 2): TransferJob {
  const checkpoints = { ...job.checkpoints };
  let processed = 0;

  for (const operation of job.plan.operations) {
    if (processed >= batchSize) break;
    const previous = checkpoints[operation.operationKey];
    if (isFinished(previous)) continue;

    const checkpoint = executeOperation(operation, previous);
    checkpoints[operation.operationKey] = checkpoint;
    processed += 1;

    if (checkpoint.result === "failed_retryable") {
      return { ...job, status: "paused_retryable", checkpoints };
    }
  }

  const complete = job.plan.operations.every((operation) =>
    isFinished(checkpoints[operation.operationKey]),
  );

  return {
    ...job,
    status: complete ? finalStatus(checkpoints) : "running",
    checkpoints,
  };
}

export function setJobStatus(
  job: TransferJob,
  status: TransferJobStatus,
): TransferJob {
  return { ...job, status };
}

export function retryFailedOperations(job: TransferJob): TransferJob {
  const checkpoints = Object.fromEntries(
    Object.entries(job.checkpoints).filter(
      ([, checkpoint]) =>
        checkpoint.result !== "failed_retryable" &&
        checkpoint.result !== "failed_terminal",
    ),
  );
  return { ...job, status: "running", checkpoints };
}
