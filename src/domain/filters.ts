import type { DestinationEntry, DriveItem, TransferFilterSet } from "./types";

export const defaultTransferFilters: TransferFilterSet = {
  nameIncludes: "",
  extensions: [],
  kinds: ["folder", "file"],
  excludedPaths: [],
  changeMode: "all",
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index > 0 ? normalized(name.slice(index + 1)) : "";
}

function destinationMatch(
  item: DriveItem,
  destination: readonly DestinationEntry[] = [],
): DestinationEntry | undefined {
  return destination.find(
    (entry) =>
      normalized(entry.relativePath) === normalized(item.relativePath) &&
      normalized(entry.name) === normalized(item.name) &&
      entry.kind === item.kind,
  );
}

export function matchesTransferFilters(
  item: DriveItem,
  filters: TransferFilterSet,
  destination: readonly DestinationEntry[] = [],
): boolean {
  if (!filters.kinds.includes(item.kind)) return false;
  if (
    filters.nameIncludes &&
    !normalized(item.name).includes(normalized(filters.nameIncludes))
  )
    return false;
  if (
    filters.extensions.length > 0 &&
    item.kind === "file" &&
    !filters.extensions.map(normalized).includes(extension(item.name))
  )
    return false;
  if (filters.minSize !== undefined && (item.size ?? 0) < filters.minSize)
    return false;
  if (
    filters.maxSize !== undefined &&
    item.size !== undefined &&
    item.size > filters.maxSize
  )
    return false;
  if (
    filters.modifiedAfter &&
    (!item.modifiedTime || item.modifiedTime < filters.modifiedAfter)
  )
    return false;
  if (
    filters.modifiedBefore &&
    (!item.modifiedTime || item.modifiedTime > filters.modifiedBefore)
  )
    return false;
  if (
    filters.excludedPaths.some((path) =>
      normalized(item.relativePath).startsWith(normalized(path)),
    )
  )
    return false;

  const existing = destinationMatch(item, destination);
  if (filters.changeMode === "new") return existing === undefined;
  if (filters.changeMode === "new_or_modified") {
    if (!existing) return true;
    return (
      item.modifiedTime !== existing.modifiedTime ||
      (item.md5Checksum !== undefined &&
        item.md5Checksum !== existing.md5Checksum)
    );
  }
  return true;
}

export function filterDriveItems(
  items: readonly DriveItem[],
  filters: TransferFilterSet,
  destination: readonly DestinationEntry[],
): readonly DriveItem[] {
  return items.filter((item) =>
    matchesTransferFilters(item, filters, destination),
  );
}
