import { describe, expect, it } from "vitest";
import {
  defaultTransferFilters,
  filterDriveItems,
  matchesTransferFilters,
} from "../src/domain/filters";
import type { DestinationEntry, DriveItem } from "../src/domain/types";

const base: DriveItem = {
  id: "file-example-123",
  parentId: "folder-example-123",
  name: "Informe.pdf",
  kind: "file",
  mimeType: "application/pdf",
  size: 2 * 1024 * 1024,
  modifiedTime: "2026-08-10T10:00:00.000Z",
  md5Checksum: "abc",
  relativePath: "Equipo/Informes",
  space: "my_drive",
  capabilities: { canRead: true, canCopy: true, canMove: true },
};

describe("transfer filters", () => {
  it("combines name, extension, size, date and excluded paths", () => {
    expect(
      matchesTransferFilters(base, {
        ...defaultTransferFilters,
        nameIncludes: "infor",
        extensions: ["pdf"],
        minSize: 1024,
        maxSize: 3 * 1024 * 1024,
        modifiedAfter: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      matchesTransferFilters(base, {
        ...defaultTransferFilters,
        excludedPaths: ["equipo"],
      }),
    ).toBe(false);
  });

  it("keeps only new files when requested", () => {
    const destination: DestinationEntry[] = [
      {
        name: base.name,
        relativePath: base.relativePath,
        kind: "file",
        mimeType: base.mimeType,
        size: base.size,
      },
    ];
    expect(
      filterDriveItems(
        [base, { ...base, id: "file-new-456", name: "Nuevo.pdf" }],
        { ...defaultTransferFilters, changeMode: "new" },
        destination,
      ).map((item) => item.name),
    ).toEqual(["Nuevo.pdf"]);
  });

  it("detects metadata changes without replacing the destination", () => {
    const destination: DestinationEntry[] = [
      {
        name: base.name,
        relativePath: base.relativePath,
        kind: "file",
        mimeType: base.mimeType,
        size: base.size,
        md5Checksum: "different",
      },
    ];
    expect(
      matchesTransferFilters(
        base,
        { ...defaultTransferFilters, changeMode: "new_or_modified" },
        destination,
      ),
    ).toBe(true);
  });
});
