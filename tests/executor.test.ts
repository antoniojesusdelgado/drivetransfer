import { describe, expect, it } from "vitest";
import { syntheticDestination, syntheticSourceTree } from "../src/demo/fixture";
import {
  createTransferJob,
  processNextBatch,
  setJobStatus,
  retryFailedOperations,
} from "../src/domain/executor";
import { buildTransferPlan } from "../src/domain/planner";

describe("resumable execution", () => {
  it("retries a transient failure without repeating a completed operation", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(["file-b", "file-c"]),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
      now: "2026-08-11T00:00:00.000Z",
    });
    const first = processNextBatch(
      setJobStatus(createTransferJob(plan), "running"),
      2,
    );
    expect(first.status).toBe("paused_retryable");

    const completedKey = plan.operations[0]?.operationKey;
    expect(completedKey).toBeDefined();
    const firstAttempts = completedKey
      ? first.checkpoints[completedKey]?.attempts
      : undefined;
    const resumed = processNextBatch(setJobStatus(first, "running"), 2);

    expect(resumed.status).toBe("completed");
    expect(
      completedKey ? resumed.checkpoints[completedKey]?.attempts : undefined,
    ).toBe(firstAttempts);
  });

  it("retries only failed operations and preserves completed checkpoints", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(["file-b", "file-denied"]),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
    });
    const job = processNextBatch(
      setJobStatus(createTransferJob(plan), "running"),
      10,
    );
    const completedBefore = Object.values(job.checkpoints).find(
      ({ result }) => result === "copied",
    );

    const retry = retryFailedOperations(job);

    expect(retry.checkpoints[completedBefore!.operationKey]).toEqual(
      completedBefore,
    );
    expect(Object.values(retry.checkpoints)).not.toContainEqual(
      expect.objectContaining({ result: "failed_terminal" }),
    );
  });
});
