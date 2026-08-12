import type {
  DriveFolderSummary,
  DriveRuntimeGateway,
  FolderPageResponse,
  IndexedDriveItem,
} from "./types";

export interface FolderCursor {
  readonly folderId: string;
  readonly driveId?: string;
  readonly relativePath: string;
  readonly pageToken?: string;
}

export interface IndexedItemWithPath extends IndexedDriveItem {
  readonly relativePath: string;
}

export interface DriveIndexSession {
  readonly root: DriveFolderSummary;
  readonly pending: readonly FolderCursor[];
  readonly discoveredFolderIds: ReadonlySet<string>;
  readonly items: readonly IndexedItemWithPath[];
  readonly pagesProcessed: number;
}

export function createDriveIndexSession(
  root: DriveFolderSummary,
): DriveIndexSession {
  return {
    root,
    pending: [{ folderId: root.id, driveId: root.driveId, relativePath: "" }],
    discoveredFolderIds: new Set([root.id]),
    items: [],
    pagesProcessed: 0,
  };
}

export function applyDrivePage(
  session: DriveIndexSession,
  cursor: FolderCursor,
  page: FolderPageResponse,
): DriveIndexSession {
  if (page.incompleteSearch) throw new Error("DRIVE_INCOMPLETE_SEARCH");

  const discoveredFolderIds = new Set(session.discoveredFolderIds);
  const childFolders: FolderCursor[] = [];
  const items = page.items.map((item) => {
    if (item.kind === "folder" && !discoveredFolderIds.has(item.id)) {
      discoveredFolderIds.add(item.id);
      childFolders.push({
        folderId: item.id,
        driveId: item.driveId,
        relativePath: cursor.relativePath
          ? `${cursor.relativePath}/${item.name}`
          : item.name,
      });
    }
    return { ...item, relativePath: cursor.relativePath };
  });
  const paginationCursor = page.nextPageToken
    ? [{ ...cursor, pageToken: page.nextPageToken }]
    : [];

  return {
    ...session,
    pending: [
      ...paginationCursor,
      ...session.pending.slice(1),
      ...childFolders,
    ],
    discoveredFolderIds,
    items: [...session.items, ...items],
    pagesProcessed: session.pagesProcessed + 1,
  };
}

export async function processDriveIndexPage(
  session: DriveIndexSession,
  gateway: DriveRuntimeGateway,
): Promise<DriveIndexSession> {
  const cursor = session.pending[0];
  if (!cursor) return session;
  const page = await gateway.listFolderPage({
    folderId: cursor.folderId,
    driveId: cursor.driveId,
    pageToken: cursor.pageToken,
    pageSize: 100,
  });
  return applyDrivePage(session, cursor, page);
}
