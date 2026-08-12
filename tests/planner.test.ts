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

  it("can preserve duplicate files with a safe renamed target", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(["file-a"]),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
      duplicatePolicy: "rename",
    });

    expect(plan.operations[0]).toMatchObject({
      decision: "rename_duplicate",
      targetName: "Propuesta de proyecto (copia).pdf",
    });
  });

  it("blocks duplicate conflicts when manual review is selected", () => {
    const plan = buildTransferPlan({
      tree: syntheticSourceTree,
      selectedIds: new Set(["file-a"]),
      destination: syntheticDestination,
      destinationSpace: "shared_drive",
      command: "copy",
      duplicatePolicy: "review",
    });

    expect(plan.operations[0]).toMatchObject({
      decision: "blocked",
      reason: "duplicate_review",
    });
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

  it("creates a dated version for modified files during synchronization", () => {
    const source = {
      ...syntheticSourceTree,
      items: syntheticSourceTree.items.map((item) =>
        item.id === "file-a"
          ? {
              ...item,
              modifiedTime: "2026-08-12T08:00:00.000Z",
              md5Checksum: "new-checksum",
            }
          : item,
      ),
    };
    const destination = syntheticDestination.map((item) =>
      item.name === "Propuesta de proyecto.pdf"
        ? {
            ...item,
            modifiedTime: "2026-08-10T08:00:00.000Z",
            md5Checksum: "old-checksum",
          }
        : item,
    );
    const plan = buildTransferPlan({
      tree: source,
      selectedIds: new Set(["file-a"]),
      destination,
      destinationSpace: "shared_drive",
      command: "copy",
      kind: "sync",
      duplicatePolicy: "skip",
      now: "2026-08-12T09:00:00.000Z",
    });

    expect(plan.operations[0]).toMatchObject({
      decision: "rename_duplicate",
      targetName: "Propuesta de proyecto (2026-08-12).pdf",
    });
  });
});
