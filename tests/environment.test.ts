import { describe, expect, it } from "vitest";
import { normalizePublicEnvironmentValue } from "../src/environment";

describe("public environment configuration", () => {
  it("removes an accidental byte-order mark and surrounding whitespace", () => {
    expect(normalizePublicEnvironmentValue("\uFEFF  G-ABC123  ")).toBe(
      "G-ABC123",
    );
  });

  it("returns an empty string for an absent value", () => {
    expect(normalizePublicEnvironmentValue(undefined)).toBe("");
  });
});
