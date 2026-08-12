import type { HistoryEntry, StoredJobManifest } from "./types";

export type ReportFormat = "json" | "csv";

function csvCell(value: string | number): string {
  const raw = String(value);
  const text = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function createJobReport(
  job: StoredJobManifest | HistoryEntry,
  format: ReportFormat,
): {
  readonly content: string;
  readonly mimeType: string;
  readonly extension: string;
} {
  const safe = {
    name: job.name,
    kind:
      job.kind === "dry_run"
        ? "Solo comprobación"
        : job.kind === "sync"
          ? "Sincronización"
          : "Transferencia",
    operation: job.command === "copy" ? "Copiar" : "Mover",
    status:
      job.status === "completed"
        ? "Terminado"
        : job.status === "cancelled"
          ? "Cancelado"
          : "En curso",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
  };
  if (format === "json") {
    return {
      content: JSON.stringify(
        { product: "DriveTransfer", ...safe, verification: job.verification },
        null,
        2,
      ),
      mimeType: "application/json",
      extension: "json",
    };
  }
  const keys = Object.keys(safe);
  const values = keys.map(
    (key) => safe[key as keyof typeof safe] as string | number,
  );
  return {
    content:
      keys.map(csvCell).join(",") +
      "\r\n" +
      values.map(csvCell).join(",") +
      "\r\n",
    mimeType: "text/csv;charset=utf-8",
    extension: "csv",
  };
}
