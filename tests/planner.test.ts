import { describe, expect, it } from "vitest";
import { syntheticDestination, syntheticSourceTree } from "../src/demo/fixture";
import { buildTransferPlan } from "../src/domain/planner";

describe("transfer planning", () => {
  it("reuses folders, skips duplicate files and blocks missing permissions", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(["folder-alpha", "file-a", "file-denied"]),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
      now: "2026-08-11T00:00:00.000Z",
    });

    expect(plan.operations.map(({ decision }) => decision)).toEqual([
      "reuse_folder",
      "skip_duplicate",
      "blocked",
    ]);
    expect(
      plan.operations.every(
        ({ operationKey }) => !operationKey.includes("file-"),
      ),
    ).toBe(true);
  });

  it("allows a cross-space folder move through the safe recursive strategy", () => {
    const tree = {
      ...syntheticSourceTree,
      items: syntheticSourceTree.items.map((item) =>
        item.id === "folder-alpha"
          ? {
              ...item,
              capabilities: { canRead: true, canCopy: true, canMove: false },
            }
          : item,
      ),
    };
    const plan = buildTransferPlan({
      tree,
      selectedIds: new Set(["folder-alpha"]),
      destination: [],
      destinationSpace: "shared_drive",
      command: "move",
      now: "2026-08-11T00:00:00.000Z",
    });

    expect(plan.operations[0]?.decision).toBe("transfer");
  });
});
