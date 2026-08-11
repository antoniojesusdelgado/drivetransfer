import { describe, expect, it } from "vitest";
import { syntheticDestination, syntheticSourceTree } from "../src/demo/fixture";
import {
  createTransferJob,
  processNextBatch,
  setJobStatus,
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
});
