import { describe, expect, it } from "vitest";
import { advanceSchedule, nextScheduleRun } from "../src/domain/scheduling";
import type { TransferSchedule } from "../src/domain/types";
import { defaultTransferFilters } from "../src/domain/filters";

describe("scheduling", () => {
  it("calculates the next daily execution in its configured time zone", () => {
    const next = nextScheduleRun({
      frequency: "daily",
      timeOfDay: "09:30",
      timeZone: "Europe/Madrid",
      after: new Date("2026-08-12T06:00:00.000Z"),
    });
    expect(next).toBe("2026-08-12T07:30:00.000Z");
  });

  it("honours the configured weekly day", () => {
    const next = nextScheduleRun({
      frequency: "weekly",
      timeOfDay: "10:00",
      timeZone: "UTC",
      dayOfWeek: 1,
      after: new Date("2026-08-12T06:00:00.000Z"),
    });
    expect(new Date(next).getUTCDay()).toBe(1);
  });

  it("disables one-off schedules after their run", () => {
    const schedule: TransferSchedule = {
      id: "plan_schedule_example",
      name: "Una vez",
      sourceFolderId: "source-example",
      destinationFolderId: "destination-example",
      kind: "transfer",
      frequency: "once",
      timeOfDay: "09:00",
      timeZone: "UTC",
      nextRunAt: "2026-08-13T09:00:00.000Z",
      enabled: true,
      filters: defaultTransferFilters,
      duplicatePolicy: "skip",
      notifications: { browser: true, email: false },
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    };
    expect(advanceSchedule(schedule).enabled).toBe(false);
  });

  it("rejects invalid times", () => {
    expect(() =>
      nextScheduleRun({
        frequency: "daily",
        timeOfDay: "25:00",
        timeZone: "UTC",
      }),
    ).toThrow("INVALID_SCHEDULE_TIME");
  });
});
