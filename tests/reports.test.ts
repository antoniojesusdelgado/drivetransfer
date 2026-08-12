import { describe, expect, it } from "vitest";
import { createJobReport } from "../src/domain/reports";
import type { StoredJobManifest } from "../src/domain/types";

const manifest: StoredJobManifest = {
  id: "job_private_internal",
  name: "Informe, mensual",
  kind: "dry_run",
  command: "copy",
  status: "completed",
  sourceLabel: "Origen",
  destinationLabel: "Destino",
  createdAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-12T00:01:00.000Z",
  total: 12,
  completed: 12,
  failed: 0,
};

describe("safe reports", () => {
  it("does not export internal job or folder identifiers", () => {
    const report = createJobReport(manifest, "json");
    expect(report.content).not.toContain(manifest.id);
    expect(report.content).not.toContain("sourceLabel");
    expect(report.content).toContain("Solo");
  });

  it("escapes CSV values", () => {
    const report = createJobReport(manifest, "csv");
    expect(report.content).toContain('"Informe, mensual"');
    expect(report.mimeType).toContain("text/csv");
  });

  it("neutralizes spreadsheet formulas in CSV values", () => {
    const report = createJobReport(
      { ...manifest, name: '=HYPERLINK("https://example.invalid")' },
      "csv",
    );
    expect(report.content).toContain("'=HYPERLINK");
    expect(report.content).not.toContain("\r\n=HYPERLINK");
  });
});
