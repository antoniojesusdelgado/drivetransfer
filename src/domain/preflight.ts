import type { TransferPlan, TransferPreflight } from "./types";

export function assessTransferPlan(
  plan: TransferPlan,
  capacity?: { readonly remaining?: number },
): TransferPreflight {
  let files = 0;
  let folders = 0;
  let knownBytes = 0;
  let unknownSizes = 0;
  let ready = 0;
  let skipped = 0;
  let renamed = 0;
  let blocked = 0;
  let invalidNames = 0;

  for (const operation of plan.operations) {
    if (operation.item.kind === "folder") folders += 1;
    else {
      files += 1;
      if (operation.item.size === undefined) unknownSizes += 1;
      else knownBytes += operation.item.size;
    }
    if (operation.decision === "transfer") ready += 1;
    if (operation.decision === "rename_duplicate") {
      ready += 1;
      renamed += 1;
      if (!operation.targetName?.trim()) invalidNames += 1;
    }
    if (operation.decision === "skip_duplicate") skipped += 1;
    if (operation.decision === "blocked") blocked += 1;
  }

  const warnings: string[] = [];
  if (blocked > 0) warnings.push(`${blocked} elementos necesitan revisión.`);
  if (unknownSizes > 0)
    warnings.push("Algunos archivos no informan de su tamaño.");
  if (invalidNames > 0)
    warnings.push("Completa el nombre de los archivos que quieres renombrar.");
  if (plan.sourceSpace !== plan.destinationSpace)
    warnings.push("La transferencia cruza dos espacios de Drive.");
  if (plan.command === "move")
    warnings.push(
      "Los originales solo se retirarán tras verificar el destino.",
    );
  const spaceSufficient =
    capacity?.remaining === undefined || knownBytes <= capacity.remaining;
  if (!spaceSufficient)
    warnings.push("No hay espacio suficiente para completar la transferencia.");

  return {
    files,
    folders,
    knownBytes,
    unknownSizes,
    ready,
    skipped,
    renamed,
    blocked,
    estimatedSeconds: Math.max(2, Math.ceil(files * 0.8 + folders * 0.35)),
    remainingBytes: capacity?.remaining,
    spaceSufficient,
    canProceed:
      ready > 0 &&
      invalidNames === 0 &&
      spaceSufficient &&
      !plan.operations.some(
        (operation) => operation.reason === "duplicate_review",
      ),
    warnings,
  };
}
