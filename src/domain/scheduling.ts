import type { ScheduleFrequency, TransferSchedule } from "./types";

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function zonedCandidate(
  reference: Date,
  timeZone: string,
  hour: number,
  minute: number,
  dayOffset: number,
): Date {
  const probe = new Date(reference.getTime() + dayOffset * 86_400_000);
  const parts = partsInTimeZone(probe, timeZone);
  const utcGuess = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    minute,
  );
  const actual = partsInTimeZone(new Date(utcGuess), timeZone);
  const offsetMinutes =
    (Date.UTC(
      Number(actual.year),
      Number(actual.month) - 1,
      Number(actual.day),
      Number(actual.hour),
      Number(actual.minute),
    ) -
      utcGuess) /
    60_000;
  return new Date(utcGuess - offsetMinutes * 60_000);
}

export function nextScheduleRun(input: {
  readonly frequency: ScheduleFrequency;
  readonly timeOfDay: string;
  readonly timeZone: string;
  readonly dayOfWeek?: number;
  readonly dayOfMonth?: number;
  readonly date?: string;
  readonly after?: Date;
}): string {
  const after = input.after ?? new Date();
  const timeParts = input.timeOfDay.split(":").map(Number);
  const hour = timeParts[0];
  const minute = timeParts[1];
  if (
    hour === undefined ||
    minute === undefined ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    throw new Error("INVALID_SCHEDULE_TIME");

  const safeHour = hour as number;
  const safeMinute = minute as number;

  for (let offset = 0; offset <= 370; offset += 1) {
    const candidate = zonedCandidate(
      after,
      input.timeZone,
      safeHour,
      safeMinute,
      offset,
    );
    if (candidate <= after) continue;
    const parts = partsInTimeZone(candidate, input.timeZone);
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      parts.weekday ?? "",
    );
    const day = Number(parts.day);
    const localDate = [parts.year, parts.month, parts.day].join("-");
    if (input.frequency === "once" && (!input.date || localDate === input.date))
      return candidate.toISOString();
    if (input.frequency === "daily") return candidate.toISOString();
    if (input.frequency === "weekly" && weekday === input.dayOfWeek)
      return candidate.toISOString();
    if (
      input.frequency === "monthly" &&
      day === Math.min(input.dayOfMonth ?? 1, 28)
    )
      return candidate.toISOString();
  }
  throw new Error("SCHEDULE_OUT_OF_RANGE");
}

export function advanceSchedule(
  schedule: TransferSchedule,
  after = new Date(),
): TransferSchedule {
  return {
    ...schedule,
    enabled: schedule.frequency === "once" ? false : schedule.enabled,
    nextRunAt:
      schedule.frequency === "once"
        ? schedule.nextRunAt
        : nextScheduleRun({ ...schedule, after }),
    updatedAt: after.toISOString(),
  };
}
