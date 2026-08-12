import { describe, expect, it } from "vitest";
import { syntheticDestination, syntheticSourceTree } from "../src/demo/fixture";
import { buildTransferPlan } from "../src/domain/planner";
import { assessTransferPlan } from "../src/domain/preflight";

describe("transfer preflight", () => {
  it("summarizes volume, conflicts and cross-space warnings", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(
        syntheticSourceTree.items.slice(1).map(({ id }) => id),
      ),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
      duplicatePolicy: "rename",
    });

    const summary = assessTransferPlan(plan);

    expect(summary.files).toBeGreaterThan(0);
    expect(summary.renamed).toBe(1);
    expect(summary.estimatedSeconds).toBeGreaterThan(0);
    expect(summary.warnings).toContain(
      "La transferencia cruza dos espacios de Drive.",
    );
  });

  it("prevents execution while a duplicate awaits manual review", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(["file-a"]),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
      duplicatePolicy: "review",
    });

    expect(assessTransferPlan(plan).canProceed).toBe(false);
  });
});
