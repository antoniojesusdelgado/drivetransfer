import type {
  ConflictResolution,
  DestinationEntry,
  DuplicatePolicy,
  DriveItem,
  DriveTree,
  JobKind,
  PlannedOperation,
  TransferCommand,
  TransferPlan,
  TransferFilterSet,
} from "./types";
import { defaultTransferFilters, matchesTransferFilters } from "./filters";

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

function renamedDuplicate(
  name: string,
  relativePath: string,
  destinationNames: ReadonlySet<string>,
): string {
  const extensionIndex = name.lastIndexOf(".");
  const stem = extensionIndex <= 0 ? name : name.slice(0, extensionIndex);
  const extension = extensionIndex <= 0 ? "" : name.slice(extensionIndex);
  for (let copy = 1; copy < 1000; copy += 1) {
    const suffix = copy === 1 ? " (copia)" : ` (copia ${copy})`;
    const candidate = `${stem}${suffix}${extension}`;
    if (
      !destinationNames.has(
        `${normalize(relativePath)}|${normalize(candidate)}`,
      )
    ) {
      return candidate;
    }
  }
  return `${stem} (copia nueva)${extension}`;
}

function versionedName(
  name: string,
  date: string,
  relativePath: string,
  destinationNames: ReadonlySet<string>,
): string {
  const extensionIndex = name.lastIndexOf(".");
  const stem = extensionIndex <= 0 ? name : name.slice(0, extensionIndex);
  const extension = extensionIndex <= 0 ? "" : name.slice(extensionIndex);
  const stamp = date.slice(0, 10);
  for (let version = 1; version < 1000; version += 1) {
    const suffix = version === 1 ? "" : " " + version;
    const candidate = stem + " (" + stamp + suffix + ")" + extension;
    if (
      !destinationNames.has(
        normalize(relativePath) + "|" + normalize(candidate),
      )
    )
      return candidate;
  }
  return stem + " (" + stamp + " nueva)" + extension;
}

function planItem(
  item: DriveItem,
  command: TransferCommand,
  duplicateFingerprints: ReadonlySet<string>,
  destinationSpace: DriveItem["space"],
  duplicatePolicy: DuplicatePolicy,
  destinationNames: ReadonlySet<string>,
): PlannedOperation {
  let decision: PlannedOperation["decision"] = "transfer";
  let reason: PlannedOperation["reason"];
  let targetName: string | undefined;

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
    if (item.kind === "folder") {
      decision = "reuse_folder";
    } else if (duplicatePolicy === "rename") {
      decision = "rename_duplicate";
      reason = "duplicate";
      targetName = renamedDuplicate(
        item.name,
        item.relativePath,
        destinationNames,
      );
    } else if (duplicatePolicy === "review") {
      decision = "blocked";
      reason = "duplicate_review";
    } else {
      decision = "skip_duplicate";
      reason = "duplicate";
    }
  }

  return {
    item,
    command,
    decision,
    reason,
    targetName,
    operationKey: `op_${hashOpaque(
      `${command}|${duplicatePolicy}|${item.id}|${item.relativePath}|${targetName ?? item.name}`,
    )}`,
  };
}

export function buildTransferPlan(input: {
  readonly tree: DriveTree;
  readonly selectedIds: ReadonlySet<string>;
  readonly destination: readonly DestinationEntry[];
  readonly destinationSpace: DriveTree["items"][number]["space"];
  readonly command: TransferCommand;
  readonly duplicatePolicy?: DuplicatePolicy;
  readonly kind?: JobKind;
  readonly filters?: TransferFilterSet;
  readonly resolutions?: readonly ConflictResolution[];
  readonly now?: string;
}): TransferPlan {
  const duplicateFingerprints = new Set(input.destination.map(fingerprint));
  const destinationNames = new Set(
    input.destination.map(
      (item) => `${normalize(item.relativePath)}|${normalize(item.name)}`,
    ),
  );
  const filters = input.filters ?? defaultTransferFilters;
  const resolutions = new Map(
    (input.resolutions ?? []).map((resolution) => [
      resolution.operationKey,
      resolution,
    ]),
  );
  const operations = input.tree.items
    .filter(
      (item) =>
        input.selectedIds.has(item.id) &&
        matchesTransferFilters(item, filters, input.destination),
    )
    .map((item) =>
      planItem(
        item,
        input.command,
        duplicateFingerprints,
        input.destinationSpace,
        input.duplicatePolicy ?? "skip",
        destinationNames,
      ),
    )
    .map((operation) => {
      if (input.kind !== "sync" || operation.item.kind !== "file")
        return operation;
      const existing = input.destination.find(
        (item) =>
          item.kind === "file" &&
          normalize(item.relativePath) ===
            normalize(operation.item.relativePath) &&
          normalize(item.name) === normalize(operation.item.name),
      );
      const modified =
        existing &&
        (operation.item.md5Checksum !== existing.md5Checksum ||
          operation.item.modifiedTime !== existing.modifiedTime);
      if (!modified) return operation;
      return {
        ...operation,
        decision: "rename_duplicate" as const,
        reason: "duplicate" as const,
        targetName: versionedName(
          operation.item.name,
          input.now ?? new Date().toISOString(),
          operation.item.relativePath,
          destinationNames,
        ),
      };
    })
    .map((operation) => {
      const resolution = resolutions.get(operation.operationKey);
      if (operation.reason !== "duplicate_review" || !resolution)
        return operation;
      if (resolution.action === "skip") {
        return { ...operation, decision: "skip_duplicate" as const };
      }
      if (resolution.action === "keep_both" || resolution.action === "rename") {
        return {
          ...operation,
          decision: "rename_duplicate" as const,
          targetName:
            resolution.targetName ??
            renamedDuplicate(
              operation.item.name,
              operation.item.relativePath,
              destinationNames,
            ),
        };
      }
      return operation;
    });

  return {
    id: `plan_${hashOpaque(`${input.command}|${operations.map((operation) => operation.operationKey).join("|")}`)}`,
    command: input.command,
    duplicatePolicy: input.duplicatePolicy ?? "skip",
    kind: input.kind ?? "transfer",
    filters,
    resolutions: input.resolutions ?? [],
    sourceSpace:
      input.tree.items.find((item) => item.id === input.tree.rootId)?.space ??
      "my_drive",
    destinationSpace: input.destinationSpace,
    createdAt: input.now ?? new Date().toISOString(),
    operations,
  };
}
