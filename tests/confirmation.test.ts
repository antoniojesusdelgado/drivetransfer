import { describe, expect, it } from "vitest";
import { isExecutionConfirmed } from "../src/domain/confirmation";

describe("transfer confirmation", () => {
  it("allows copy after preview without an extra risk acknowledgement", () => {
    expect(isExecutionConfirmed("copy", false)).toBe(true);
  });

  it("never allows move until its additional confirmation is accepted", () => {
    expect(isExecutionConfirmed("move", false)).toBe(false);
    expect(isExecutionConfirmed("move", true)).toBe(true);
  });
});
