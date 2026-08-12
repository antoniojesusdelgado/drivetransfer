import { describe, expect, it } from "vitest";
import { transferCompatibility } from "../src/domain/capabilities";

describe("Drive space compatibility", () => {
  it("requires recursive reconstruction for cross-space folder moves", () => {
    expect(
      transferCompatibility("move", "folder", "my_drive", "shared_drive"),
    ).toMatchObject({
      supported: true,
      strategy: "recursive_rebuild",
      requiresElevatedConfirmation: true,
    });
  });

  it("uses a native strategy for files", () => {
    expect(
      transferCompatibility("move", "file", "my_drive", "shared_drive")
        .strategy,
    ).toBe("native");
  });
});
