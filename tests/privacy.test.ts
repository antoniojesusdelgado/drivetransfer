import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDriveTransferLocalData,
  savePrivacyPreferences,
} from "../src/privacy";

describe("privacy preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.head
      .querySelectorAll("script")
      .forEach((script) => script.remove());
    document.cookie = "_ga=; Max-Age=0; path=/";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T10:00:00.000Z"));
  });

  it("stores an explicit rejection without loading analytics", () => {
    const preferences = savePrivacyPreferences(false);

    expect(preferences.analytics).toBe(false);
    expect(
      document.querySelector("script[data-drivetransfer-analytics]"),
    ).toBeNull();
    expect(
      window.localStorage.getItem("driveTransfer.privacyPreferences"),
    ).toContain('"analytics":false');
    expect(preferences.version).toBe(3);
  });

  it("clears DriveTransfer keys but preserves unrelated storage", () => {
    window.localStorage.setItem("driveTransfer.resumeJob", "job");
    window.localStorage.setItem("another.application", "keep");

    clearDriveTransferLocalData();

    expect(window.localStorage.getItem("driveTransfer.resumeJob")).toBeNull();
    expect(window.localStorage.getItem("another.application")).toBe("keep");
  });
});
