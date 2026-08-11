import type { TransferCommand } from "./types";

export function isExecutionConfirmed(
  command: TransferCommand,
  moveRiskAccepted: boolean,
): boolean {
  return command === "copy" || moveRiskAccepted;
}
