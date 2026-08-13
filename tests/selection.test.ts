import { describe, expect, it } from "vitest";
import { syntheticSourceTree } from "../src/explore/fixture";
import { selectionState, toggleSelection } from "../src/domain/selection";

describe("hierarchical selection", () => {
  it("selects and clears all descendants of a folder", () => {
    const selected = toggleSelection(
      syntheticSourceTree,
      new Set(),
      "folder-alpha",
      true,
    );
    expect(selected).toEqual(new Set(["folder-alpha", "file-b", "file-a"]));

    const cleared = toggleSelection(
      syntheticSourceTree,
      selected,
      "folder-alpha",
      false,
    );
    expect(cleared.size).toBe(0);
  });

  it("reports a partially selected folder", () => {
    expect(
      selectionState(syntheticSourceTree, new Set(["file-a"]), "folder-alpha"),
    ).toBe("mixed");
  });
});
