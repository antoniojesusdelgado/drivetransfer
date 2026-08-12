import { describe, expect, it, vi } from "vitest";
import {
  applyDrivePage,
  createDriveIndexSession,
  processDriveIndexPage,
} from "../src/integrations/drive/indexer";
import type {
  DriveFolderSummary,
  DriveRuntimeGateway,
  FolderPageResponse,
  IndexedDriveItem,
} from "../src/integrations/drive/types";

const capabilities = {
  canRead: true,
  canCopy: true,
  canMove: true,
  canAddChildren: true,
} as const;

const root: DriveFolderSummary = {
  id: "shared-root-123",
  name: "Shared root",
  driveId: "shared-drive-123",
  space: "shared_drive",
  capabilities,
};

function item(
  input: Partial<IndexedDriveItem> & Pick<IndexedDriveItem, "id" | "name">,
): IndexedDriveItem {
  return {
    parentId: root.id,
    kind: "file",
    mimeType: "application/pdf",
    space: "shared_drive",
    driveId: root.driveId,
    capabilities,
    ...input,
  };
}

describe("Drive recursive indexer", () => {
  it("keeps pagination resumable and indexes shared-drive descendants without following shortcuts", async () => {
    const pages: FolderPageResponse[] = [
      {
        items: [
          item({
            id: "nested-folder-123",
            name: "Nested",
            kind: "folder",
            mimeType: "application/vnd.google-apps.folder",
          }),
          item({
            id: "shortcut-item-123",
            name: "Shortcut",
            kind: "shortcut",
            mimeType: "application/vnd.google-apps.shortcut",
            shortcutTargetId: "nested-folder-123",
          }),
        ],
        nextPageToken: "next-page",
        incompleteSearch: false,
      },
      {
        items: [item({ id: "root-file-123", name: "Root.pdf" })],
        incompleteSearch: false,
      },
      {
        items: [
          item({
            id: "nested-file-123",
            name: "Nested.pdf",
            parentId: "nested-folder-123",
          }),
        ],
        incompleteSearch: false,
      },
    ];
    const listFolderPage = vi.fn(
      async () => pages.shift() as FolderPageResponse,
    );
    const gateway: DriveRuntimeGateway = {
      inspectFolder: vi.fn(),
      inspectCapacity: vi.fn(),
      listFolderPage,
      executeBatch: vi.fn(),
      verifyBatch: vi.fn(),
      listFavorites: vi.fn(),
      saveFavorite: vi.fn(),
      deleteFavorite: vi.fn(),
      saveJob: vi.fn(),
      loadJob: vi.fn(),
      loadLatestJob: vi.fn(),
      clearJob: vi.fn(),
      loadWorkspace: vi.fn(),
      saveWorkspaceJob: vi.fn(),
      controlWorkspaceJob: vi.fn(),
      saveSchedule: vi.fn(),
      deleteSchedule: vi.fn(),
      runScheduleNow: vi.fn(),
    };

    let session = createDriveIndexSession(root);
    session = await processDriveIndexPage(session, gateway);
    expect(session.pending[0]).toMatchObject({
      folderId: root.id,
      pageToken: "next-page",
    });
    session = await processDriveIndexPage(session, gateway);
    session = await processDriveIndexPage(session, gateway);

    expect(session.pending).toHaveLength(0);
    expect(session.items).toHaveLength(4);
    expect(
      session.items.find(({ id }) => id === "nested-file-123")?.relativePath,
    ).toBe("Nested");
    expect(listFolderPage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        driveId: root.driveId,
        pageSize: 100,
      }),
    );
    expect(listFolderPage).toHaveBeenCalledTimes(3);
  });

  it("stops instead of accepting an incomplete Drive search", () => {
    const session = createDriveIndexSession(root);
    expect(() =>
      applyDrivePage(session, session.pending[0]!, {
        items: [],
        incompleteSearch: true,
      }),
    ).toThrow("DRIVE_INCOMPLETE_SEARCH");
  });
});
