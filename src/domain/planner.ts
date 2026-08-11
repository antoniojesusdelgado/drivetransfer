import type {
  DestinationEntry,
  DriveItem,
  DriveTree,
  PlannedOperation,
  TransferCommand,
  TransferPlan,
} from "./types";

const NORMALIZATION_PATTERN = /\s+/g;

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .replace(NORMALIZATION_PATTERN, " ");
}

function fingerprint(item: DriveItem | DestinationEntry): string {
  return [
    item.kind,
    normalize(item.relativePath),
    normalize(item.name),
    item.mimeType,
    item.size ?? "unknown",
  ].join("|");
}

function hashOpaque(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function planItem(
  item: DriveItem,
  command: TransferCommand,
  duplicateFingerprints: ReadonlySet<string>,
  destinationSpace: DriveItem["space"],
): PlannedOperation {
  let decision: PlannedOperation["decision"] = "transfer";
  let reason: PlannedOperation["reason"];

  if (!item.capabilities.canRead) {
    decision = "blocked";
    reason = "read_denied";
  } else if (command === "copy" && !item.capabilities.canCopy) {
    decision = "blocked";
    reason = "copy_denied";
  } else if (
    command === "move" &&
    item.kind === "folder" &&
    item.space !== destinationSpace &&
    !item.capabilities.canCopy
  ) {
    decision = "blocked";
    reason = "move_denied";
  } else if (
    command === "move" &&
    !(item.kind === "folder" && item.space !== destinationSpace) &&
    !item.capabilities.canMove
  ) {
    decision = "blocked";
    reason = "move_denied";
  } else if (duplicateFingerprints.has(fingerprint(item))) {
    decision = item.kind === "folder" ? "reuse_folder" : "skip_duplicate";
    reason = item.kind === "file" ? "duplicate" : undefined;
  }

  return {
    item,
    command,
    decision,
    reason,
    operationKey: `op_${hashOpaque(`${command}|${item.id}|${item.relativePath}`)}`,
  };
}

export function buildTransferPlan(input: {
  readonly tree: DriveTree;
  readonly selectedIds: ReadonlySet<string>;
  readonly destination: readonly DestinationEntry[];
  readonly destinationSpace: DriveTree["items"][number]["space"];
  readonly command: TransferCommand;
  readonly now?: string;
}): TransferPlan {
  const duplicateFingerprints = new Set(input.destination.map(fingerprint));
  const operations = input.tree.items
    .filter((item) => input.selectedIds.has(item.id))
    .map((item) =>
      planItem(
        item,
        input.command,
        duplicateFingerprints,
        input.destinationSpace,
      ),
    );

  return {
    id: `plan_${hashOpaque(`${input.command}|${operations.map((operation) => operation.operationKey).join("|")}`)}`,
    command: input.command,
    sourceSpace:
      input.tree.items.find((item) => item.id === input.tree.rootId)?.space ??
      "my_drive",
    destinationSpace: input.destinationSpace,
    createdAt: input.now ?? new Date().toISOString(),
    operations,
  };
}
