import { Check, File, WarningCircle } from "@phosphor-icons/react";
import type { OperationResult, TransferJob } from "../domain/types";

const finishedResults = new Set<OperationResult>([
  "copied",
  "moved",
  "reused_folder",
  "skipped_duplicate",
  "failed_terminal",
]);

export function JobProgress({
  job,
  compact = false,
}: {
  readonly job: TransferJob;
  readonly compact?: boolean;
}) {
  const checkpoints = Object.values(job.checkpoints);
  const finished = checkpoints.filter((checkpoint) =>
    finishedResults.has(checkpoint.result),
  ).length;
  const failed = checkpoints.filter(
    ({ result }) => result === "failed_terminal",
  ).length;
  const total = job.plan.operations.length;
  const percentage = total === 0 ? 0 : Math.round((finished / total) * 100);

  return (
    <section
      className={
        compact
          ? "progress-card progress-card--compact"
          : "surface progress-card"
      }
      aria-live="polite"
      aria-labelledby={compact ? undefined : "progress-title"}
    >
      <div className="progress-card__header">
        <span className="progress-card__file">
          <File weight="duotone" />
        </span>
        <div>
          <strong id={compact ? undefined : "progress-title"}>
            {finished} de {total} elementos
          </strong>
          <span>
            {failed > 0
              ? `${failed} necesitan atención`
              : "Todo avanza correctamente"}
          </span>
        </div>
        <strong>{percentage}%</strong>
      </div>
      <progress max="100" value={percentage}>
        {percentage}%
      </progress>
      <div className="progress-card__facts">
        <span>
          <Check weight="bold" /> {finished - failed} completados
        </span>
        {failed > 0 ? (
          <span className="progress-card__warning">
            <WarningCircle weight="fill" /> {failed} sin cambios
          </span>
        ) : null}
      </div>
    </section>
  );
}
