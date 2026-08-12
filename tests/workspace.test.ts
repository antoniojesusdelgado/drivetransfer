import { describe, expect, it } from "vitest";
import {
  enqueueJob,
  promoteNextJob,
  pruneHistory,
} from "../src/domain/workspace";
import type { HistoryEntry, StoredJobManifest } from "../src/domain/types";

function job(
  id: string,
  status: StoredJobManifest["status"],
): StoredJobManifest {
  return {
    id,
    name: id,
    kind: "transfer",
    command: "copy",
    status,
    sourceLabel: "Origen",
    destinationLabel: "Destino",
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    total: 10,
    completed: 0,
    failed: 0,
  };
}

describe("workspace queue and history", () => {
  it("allows only one active job and queues the next one", () => {
    const jobs = enqueueJob(
      [job("job_active", "running")],
      job("job_new", "running"),
    );
    expect(jobs.map((item) => item.status)).toEqual(["running", "queued"]);
  });

  it("promotes the oldest queued job when no job is running", () => {
    const jobs = promoteNextJob([
      job("job_paused", "paused"),
      job("job_first", "queued"),
      job("job_second", "queued"),
    ]);
    expect(jobs[1]?.status).toBe("running");
    expect(jobs[2]?.status).toBe("queued");
  });

  it("removes history older than ninety days", () => {
    const recent: HistoryEntry = {
      ...job("job_recent", "completed"),
      finishedAt: "2026-08-01T00:00:00.000Z",
      reportAvailable: true,
    };
    const old: HistoryEntry = {
      ...job("job_old", "completed"),
      finishedAt: "2026-04-01T00:00:00.000Z",
      reportAvailable: true,
    };
    expect(
      pruneHistory([recent, old], new Date("2026-08-12T00:00:00.000Z")).map(
        (item) => item.id,
      ),
    ).toEqual(["job_recent"]);
  });
});
