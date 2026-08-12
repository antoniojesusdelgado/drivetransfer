import type { DriveItemKind, DriveSpace, TransferCommand } from "./types";

export interface TransferCompatibility {
  readonly supported: boolean;
  readonly strategy: "native" | "recursive_rebuild" | "blocked";
  readonly requiresElevatedConfirmation: boolean;
  readonly note: string;
}

export function transferCompatibility(
  command: TransferCommand,
  kind: DriveItemKind,
  source: DriveSpace,
  destination: DriveSpace,
): TransferCompatibility {
  if (command === "copy") {
    return {
      supported: true,
      strategy: kind === "folder" ? "recursive_rebuild" : "native",
      requiresElevatedConfirmation: false,
      note:
        kind === "folder"
          ? "La carpeta se recreará y su contenido se copiará."
          : "Copia nativa.",
    };
  }

  const crossesSpaceBoundary = source !== destination;
  if (kind === "folder" && crossesSpaceBoundary) {
    return {
      supported: true,
      strategy: "recursive_rebuild",
      requiresElevatedConfirmation: true,
      note: "Drive no permite este movimiento como cambio de padre; requiere transferir el contenido y verificarlo antes de retirar el origen.",
    };
  }

  return {
    supported: true,
    strategy: "native",
    requiresElevatedConfirmation: command === "move",
    note: "Movimiento mediante actualización explícita del padre.",
  };
}
