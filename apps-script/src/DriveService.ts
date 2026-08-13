namespace DriveTransferRuntime {
  type DriveFile = GoogleAppsScript.Drive_v3.Drive.V3.Schema.File;

  function requireDriveService(): GoogleAppsScript.Drive {
    if (!Drive) throw new Error("DRIVE_SERVICE_UNAVAILABLE");
    return Drive;
  }

  function itemCapabilities(file: DriveFile): IndexedDriveItem["capabilities"] {
    const capabilities = file.capabilities ?? {};
    return {
      canRead: true,
      canCopy: capabilities.canCopy === true,
      canMove:
        capabilities.canMoveItemWithinDrive === true ||
        capabilities.canMoveItemOutOfDrive === true,
      canAddChildren: capabilities.canAddChildren === true,
    };
  }

  function itemKind(file: DriveFile): IndexedDriveItem["kind"] {
    if (file.mimeType === FOLDER_MIME_TYPE) return "folder";
    if (file.mimeType === "application/vnd.google-apps.shortcut")
      return "shortcut";
    return "file";
  }

  function toIndexedItem(file: DriveFile, parentId: string): IndexedDriveItem {
    if (!file.id || !file.name || !file.mimeType)
      throw new Error("INCOMPLETE_DRIVE_ITEM");
    return {
      id: file.id,
      parentId,
      name: file.name,
      kind: itemKind(file),
      mimeType: file.mimeType,
      size: file.size ? Number(file.size) : undefined,
      modifiedTime: file.modifiedTime,
      md5Checksum: file.md5Checksum,
      driveId: file.driveId,
      space: file.driveId ? "shared_drive" : "my_drive",
      shortcutTargetId: file.shortcutDetails?.targetId,
      shortcutTargetMimeType: file.shortcutDetails?.targetMimeType,
      capabilities: itemCapabilities(file),
    };
  }

  function getFile(fileId: string, fields: string): DriveFile {
    return requireDriveService().Files.get(fileId, {
      supportsAllDrives: true,
      fields,
    });
  }

  function createMetadataFile(
    resource: DriveFile,
    optionalArgs: Record<string, unknown>,
  ): DriveFile {
    return requireDriveService().Files.create(
      resource,
      undefined as unknown as GoogleAppsScript.Base.Blob,
      optionalArgs,
    );
  }

  function updateMetadataFile(
    resource: DriveFile,
    fileId: string,
    optionalArgs: Record<string, unknown>,
  ): DriveFile {
    return requireDriveService().Files.update(
      resource,
      fileId,
      undefined as unknown as GoogleAppsScript.Base.Blob,
      optionalArgs,
    );
  }

  function listOptions(driveId?: string): Record<string, unknown> {
    return {
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: driveId ? "drive" : "user",
      driveId,
    };
  }

  function findFiles(
    query: string,
    driveId?: string,
    fields = "files(id,name,mimeType,size,parents,driveId,appProperties,trashed)",
  ): DriveFile[] {
    const response = requireDriveService().Files.list({
      ...listOptions(driveId),
      q: `${query} and trashed = false`,
      pageSize: 100,
      fields: `files(${fields.replace(/^files\(|\)$/g, "")})`,
    });
    return response.files ?? [];
  }

  function findOperation(
    operationKey: string,
    driveId?: string,
    destinationRootId?: string,
  ): DriveFile | undefined {
    const escaped = escapeDriveQueryValue(operationKey);
    return findFiles(
      `appProperties has { key='driveTransferOperationKey' and value='${escaped}' }`,
      driveId,
    ).find(
      (file) =>
        !destinationRootId ||
        (!!file.id && isWithinRoot(file.id, destinationRootId)),
    );
  }

  function findFolder(
    parentId: string,
    name: string,
    driveId?: string,
  ): DriveFile | undefined {
    return findFiles(
      `'${escapeDriveQueryValue(parentId)}' in parents and name = '${escapeDriveQueryValue(name)}' and mimeType = '${FOLDER_MIME_TYPE}'`,
      driveId,
    )[0];
  }

  function scheduledOperationKey(value: string): string {
    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      value,
      Utilities.Charset.UTF_8,
    );
    return (
      "op_" +
      Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, "").slice(0, 48)
    );
  }

  function existingDestinationFile(
    destinationFolderId: string,
    relativePath: string,
    name: string,
  ): DriveFile | undefined {
    let folder = getFile(destinationFolderId, "id,driveId");
    if (!folder.id) throw new Error("DRIVE_NOT_FOUND");
    for (const segment of requireRelativePath(relativePath)
      .split("/")
      .filter(Boolean)) {
      const child = findFolder(folder.id as string, segment, folder.driveId);
      if (!child) return undefined;
      folder = child;
    }
    return findFiles(
      "'" +
        escapeDriveQueryValue(folder.id as string) +
        "' in parents and name = '" +
        escapeDriveQueryValue(name) +
        "'",
      folder.driveId,
      "files(id,name,mimeType,size,modifiedTime,md5Checksum,driveId)",
    ).find((item) => item.mimeType !== FOLDER_MIME_TYPE);
  }

  function safeScheduledName(
    destinationFolderId: string,
    relativePath: string,
    name: string,
    stamp?: string,
  ): string {
    const extensionIndex = name.lastIndexOf(".");
    const stem = extensionIndex <= 0 ? name : name.slice(0, extensionIndex);
    const extension = extensionIndex <= 0 ? "" : name.slice(extensionIndex);
    for (let index = 1; index < 1000; index += 1) {
      const suffix = stamp
        ? " (" + stamp + (index === 1 ? "" : " " + index) + ")"
        : index === 1
          ? " (copia)"
          : " (copia " + index + ")";
      const candidate = stem + suffix + extension;
      if (
        !existingDestinationFile(destinationFolderId, relativePath, candidate)
      )
        return candidate;
    }
    throw new Error("DRIVE_REQUEST_FAILED");
  }

  export function prepareScheduledOperation(
    schedule: TransferScheduleRecord,
    item: IndexedDriveItem,
    relativePath: string,
  ): RuntimeTransferOperation | null {
    const normalizedName = item.name.toLocaleLowerCase();
    const extension = normalizedName.includes(".")
      ? normalizedName.slice(normalizedName.lastIndexOf(".") + 1)
      : "";
    if (
      !schedule.filters.kinds.includes(
        item.kind === "folder" ? "folder" : "file",
      ) ||
      (schedule.filters.nameIncludes &&
        normalizedName.indexOf(
          schedule.filters.nameIncludes.toLocaleLowerCase(),
        ) < 0) ||
      (schedule.filters.extensions.length > 0 &&
        item.kind !== "folder" &&
        !schedule.filters.extensions
          .map((value) => value.toLocaleLowerCase())
          .includes(extension)) ||
      (schedule.filters.minSize !== undefined &&
        (item.size ?? 0) < schedule.filters.minSize) ||
      (schedule.filters.maxSize !== undefined &&
        item.size !== undefined &&
        item.size > schedule.filters.maxSize) ||
      (schedule.filters.modifiedAfter &&
        (!item.modifiedTime ||
          item.modifiedTime < schedule.filters.modifiedAfter)) ||
      (schedule.filters.modifiedBefore &&
        (!item.modifiedTime ||
          item.modifiedTime > schedule.filters.modifiedBefore)) ||
      schedule.filters.excludedPaths.some(
        (path) =>
          relativePath.toLocaleLowerCase().indexOf(path.toLocaleLowerCase()) ===
          0,
      )
    )
      return null;
    const existing =
      item.kind === "file"
        ? existingDestinationFile(
            schedule.destinationFolderId,
            relativePath,
            item.name,
          )
        : undefined;
    if (existing && schedule.filters.changeMode === "new") return null;
    let targetName: string | undefined;
    if (existing && schedule.kind === "sync") {
      const unchanged =
        item.md5Checksum && existing.md5Checksum
          ? item.md5Checksum === existing.md5Checksum
          : item.size === (existing.size ? Number(existing.size) : undefined) &&
            item.modifiedTime === existing.modifiedTime;
      if (unchanged) return null;
      targetName = safeScheduledName(
        schedule.destinationFolderId,
        relativePath,
        item.name,
        new Date().toISOString().slice(0, 10),
      );
    } else if (existing && schedule.duplicatePolicy === "skip") {
      return null;
    } else if (existing && schedule.duplicatePolicy === "review") {
      return null;
    } else if (existing) {
      targetName = safeScheduledName(
        schedule.destinationFolderId,
        relativePath,
        item.name,
      );
    }
    const keySource = [
      schedule.id,
      item.id,
      relativePath,
      targetName ?? item.name,
    ].join("|");
    return {
      operationKey: scheduledOperationKey(keySource),
      sourceId: item.id,
      sourceParentId: item.parentId,
      relativePath,
      name: item.name,
      kind: item.kind === "folder" ? "folder" : "file",
      mimeType: item.mimeType,
      size: item.size,
      sourceSpace: item.space,
      targetName,
    };
  }

  function ensureDestinationPath(
    root: DriveFile,
    relativePath: string,
    operationKey?: string,
  ): { readonly id: string; readonly reused: boolean } {
    if (!root.id) throw new Error("INCOMPLETE_DRIVE_FOLDER");
    const segments = requireRelativePath(relativePath)
      .split("/")
      .filter(Boolean);
    let parentId = root.id;
    let reused = true;
    segments.forEach((segment, index) => {
      const existing = findFolder(parentId, segment, root.driveId);
      if (existing?.id) {
        parentId = existing.id;
        return;
      }
      const isLeaf = index === segments.length - 1;
      const created = createMetadataFile(
        {
          name: segment,
          mimeType: FOLDER_MIME_TYPE,
          parents: [parentId],
          appProperties:
            isLeaf && operationKey
              ? { driveTransferOperationKey: operationKey }
              : undefined,
        },
        { supportsAllDrives: true, fields: "id" },
      );
      if (!created.id) throw new Error("INCOMPLETE_DRIVE_FOLDER");
      parentId = created.id;
      reused = false;
    });
    return { id: parentId, reused };
  }

  function isWithinRoot(fileId: string, rootId: string): boolean {
    let currentId: string | undefined = fileId;
    for (let depth = 0; currentId && depth < 100; depth += 1) {
      if (currentId === rootId) return true;
      const current = getFile(currentId, "id,parents");
      currentId = current.parents?.[0];
    }
    return false;
  }

  function assertSafeRoute(
    sourceRootId: string,
    destinationFolderId: string,
  ): void {
    if (
      sourceRootId === destinationFolderId ||
      isWithinRoot(destinationFolderId, sourceRootId)
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
  }

  function exactDuplicate(
    parentId: string,
    source: DriveFile,
    driveId?: string,
  ): DriveFile | undefined {
    if (!source.name || !source.mimeType) return undefined;
    return findFiles(
      `'${escapeDriveQueryValue(parentId)}' in parents and name = '${escapeDriveQueryValue(source.name)}' and mimeType = '${escapeDriveQueryValue(source.mimeType)}'`,
      driveId,
    ).find((candidate) => {
      if (source.size === undefined || candidate.size === undefined)
        return true;
      return String(source.size) === String(candidate.size);
    });
  }

  function executeOperation(
    request: ExecuteBatchRequest,
    operation: RuntimeTransferOperation,
    destination: DriveFile,
  ): RuntimeCheckpoint {
    if (!isWithinRoot(operation.sourceId, request.sourceRootId)) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    const source = getFile(
      operation.sourceId,
      "id,name,mimeType,size,parents,driveId,trashed,appProperties,capabilities(canCopy,canMoveItemWithinDrive,canMoveItemOutOfDrive,canTrash)",
    );
    if (
      source.trashed === true ||
      source.name !== operation.name ||
      source.mimeType !== operation.mimeType ||
      (source.mimeType === FOLDER_MIME_TYPE ? "folder" : "file") !==
        operation.kind ||
      (operation.size !== undefined &&
        String(source.size) !== String(operation.size)) ||
      (operation.sourceParentId !== undefined &&
        !(source.parents ?? []).includes(operation.sourceParentId))
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    const targetName = operation.targetName ?? source.name;
    const actualSourceSpace = source.driveId ? "shared_drive" : "my_drive";
    if (actualSourceSpace !== operation.sourceSpace) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    if (request.command === "copy" && source.capabilities?.canCopy !== true) {
      throw new Error("DRIVE_PERMISSION_DENIED");
    }
    if (
      request.command === "move" &&
      operation.kind === "folder" &&
      operation.sourceSpace !== request.destinationSpace &&
      (source.capabilities?.canCopy !== true ||
        source.capabilities?.canTrash !== true)
    ) {
      throw new Error("DRIVE_PERMISSION_DENIED");
    }
    if (
      request.command === "move" &&
      !(
        operation.kind === "folder" &&
        operation.sourceSpace !== request.destinationSpace
      ) &&
      source.capabilities?.canMoveItemWithinDrive !== true &&
      source.capabilities?.canMoveItemOutOfDrive !== true
    ) {
      throw new Error("DRIVE_PERMISSION_DENIED");
    }
    const existingOperation = findOperation(
      operation.operationKey,
      destination.driveId,
      destination.id,
    );
    if (
      existingOperation &&
      existingOperation.name === targetName &&
      existingOperation.mimeType === source.mimeType &&
      (source.size === undefined ||
        existingOperation.size === undefined ||
        String(existingOperation.size) === String(source.size))
    ) {
      return {
        operationKey: operation.operationKey,
        result: request.command === "copy" ? "copied" : "moved",
        attempts: 1,
      };
    }
    if (existingOperation) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }

    const isNativeFolderMove =
      request.command === "move" &&
      operation.kind === "folder" &&
      operation.sourceSpace === request.destinationSpace;
    const destinationPath = isNativeFolderMove
      ? operation.relativePath.split("/").slice(0, -1).join("/")
      : operation.relativePath;
    const targetPath = ensureDestinationPath(
      destination,
      destinationPath,
      operation.kind === "folder" && !isNativeFolderMove
        ? operation.operationKey
        : undefined,
    );
    if (operation.kind === "folder") {
      if (request.command === "copy") {
        return {
          operationKey: operation.operationKey,
          result: targetPath.reused ? "reused_folder" : "copied",
          attempts: 1,
        };
      }
      if (operation.sourceSpace !== request.destinationSpace) {
        const children = findFiles(
          `'${escapeDriveQueryValue(operation.sourceId)}' in parents`,
          source.driveId,
        );
        if (children.length > 0) {
          return {
            operationKey: operation.operationKey,
            result: "failed_terminal",
            attempts: 1,
            errorCode: "verification_failed",
          };
        }
        updateMetadataFile({ trashed: true }, operation.sourceId, {
          supportsAllDrives: true,
          fields: "id",
        });
        return {
          operationKey: operation.operationKey,
          result: "moved",
          attempts: 1,
        };
      }
    }

    if (request.command === "copy") {
      if (
        targetName === source.name &&
        exactDuplicate(targetPath.id, source, destination.driveId)
      ) {
        return {
          operationKey: operation.operationKey,
          result: "skipped_duplicate",
          attempts: 1,
        };
      }
      const copy = requireDriveService().Files.copy(
        {
          name: targetName,
          parents: [targetPath.id],
          appProperties: {
            ...(source.appProperties ?? {}),
            driveTransferOperationKey: operation.operationKey,
          },
        },
        operation.sourceId,
        { supportsAllDrives: true, fields: "id" },
      );
      if (!copy.id) throw new Error("DRIVE_REQUEST_FAILED");
      return {
        operationKey: operation.operationKey,
        result: "copied",
        attempts: 1,
      };
    }

    const currentParents = source.parents ?? [];
    if (currentParents.includes(targetPath.id)) {
      return {
        operationKey: operation.operationKey,
        result: "moved",
        attempts: 1,
      };
    }
    updateMetadataFile(
      {
        name: targetName,
        appProperties: {
          ...(source.appProperties ?? {}),
          driveTransferOperationKey: operation.operationKey,
        },
      },
      operation.sourceId,
      {
        addParents: targetPath.id,
        removeParents: currentParents.join(","),
        supportsAllDrives: true,
        fields: "id",
      },
    );
    return {
      operationKey: operation.operationKey,
      result: "moved",
      attempts: 1,
    };
  }

  export function inspectFolder(request: FolderRequest): FolderSummary {
    try {
      const folderId = requireDriveId(request?.folderId);
      const file = requireDriveService().Files.get(folderId, {
        supportsAllDrives: true,
        fields:
          "id,name,mimeType,driveId,trashed,capabilities(canCopy,canMoveItemWithinDrive,canMoveItemOutOfDrive,canAddChildren)",
      });
      if (file.mimeType !== FOLDER_MIME_TYPE || file.trashed === true) {
        throw new Error("DRIVE_NOT_A_FOLDER");
      }
      if (!file.id || !file.name) throw new Error("INCOMPLETE_DRIVE_FOLDER");
      const capabilities = itemCapabilities(file);
      return {
        id: file.id,
        name: file.name,
        driveId: file.driveId,
        space: file.driveId ? "shared_drive" : "my_drive",
        capabilities,
      };
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function inspectCapacity(): DriveCapacitySummary {
    try {
      const about = requireDriveService().About.get({
        fields: "storageQuota(limit,usage)",
      });
      const limit = about.storageQuota?.limit
        ? Number(about.storageQuota.limit)
        : undefined;
      const usage = about.storageQuota?.usage
        ? Number(about.storageQuota.usage)
        : undefined;
      return {
        limit,
        usage,
        remaining:
          limit !== undefined && usage !== undefined
            ? Math.max(0, limit - usage)
            : undefined,
      };
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function listFolderPage(
    request: ListFolderPageRequest,
  ): ListFolderPageResponse {
    try {
      const folderId = requireDriveId(request?.folderId);
      const driveId = request?.driveId
        ? requireDriveId(request.driveId)
        : undefined;
      const pageToken = optionalPageToken(request?.pageToken);
      const options: Record<string, unknown> = {
        q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`,
        pageSize: clampPageSize(request?.pageSize),
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        orderBy: "folder,name_natural",
        fields:
          "nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,md5Checksum,parents,driveId,shortcutDetails(targetId,targetMimeType),capabilities(canCopy,canMoveItemWithinDrive,canMoveItemOutOfDrive,canAddChildren))",
      };
      if (driveId) {
        options.corpora = "drive";
        options.driveId = driveId;
      } else {
        options.corpora = "user";
      }

      const response = requireDriveService().Files.list(options);
      return {
        items: (response.files ?? []).map((file) =>
          toIndexedItem(file, folderId),
        ),
        nextPageToken: response.nextPageToken,
        incompleteSearch: response.incompleteSearch === true,
      };
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function executeBatch(
    request: ExecuteBatchRequest,
  ): ExecuteBatchResponse {
    const safeRequest = requireTransferBatch(request);
    try {
      assertSafeRoute(
        safeRequest.sourceRootId,
        safeRequest.destinationFolderId,
      );
      const destination = getFile(
        safeRequest.destinationFolderId,
        "id,name,mimeType,driveId,trashed,capabilities(canAddChildren)",
      );
      const actualDestinationSpace = destination.driveId
        ? "shared_drive"
        : "my_drive";
      if (
        destination.mimeType !== FOLDER_MIME_TYPE ||
        destination.trashed === true ||
        destination.capabilities?.canAddChildren !== true ||
        actualDestinationSpace !== safeRequest.destinationSpace
      ) {
        throw new Error("DRIVE_PERMISSION_DENIED");
      }

      const checkpoints: RuntimeCheckpoint[] = [];
      let paused = false;
      for (const operation of safeRequest.operations) {
        try {
          checkpoints.push(
            executeOperation(safeRequest, operation, destination),
          );
        } catch (operationError) {
          const safeError = asSafeRuntimeError(operationError);
          const retryable = safeError.message === "DRIVE_RATE_LIMITED";
          checkpoints.push({
            operationKey: operation.operationKey,
            result: retryable ? "failed_retryable" : "failed_terminal",
            attempts: 1,
            errorCode:
              safeError.message === "DRIVE_PERMISSION_DENIED"
                ? "permission_denied"
                : retryable
                  ? "temporary_unavailable"
                  : "verification_failed",
          });
          if (retryable) {
            paused = true;
            break;
          }
        }
      }
      return { jobId: safeRequest.jobId, checkpoints, paused };
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function verifyBatch(
    request: VerifyBatchRequest,
  ): VerifyBatchResponse {
    try {
      const destinationId = requireDriveId(request?.destinationFolderId);
      if (
        !Array.isArray(request?.operationKeys) ||
        request.operationKeys.length < 1 ||
        request.operationKeys.length > 100
      ) {
        throw new Error("INVALID_TRANSFER_REQUEST");
      }
      const destination = getFile(destinationId, "id,driveId");
      const verifiedOperationKeys = request.operationKeys
        .map(requireOpaqueId)
        .filter((operationKey) =>
          findOperation(operationKey, destination.driveId, destinationId),
        );
      return { verifiedOperationKeys };
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }
}
