namespace DriveTransferRuntime {
  const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
  const MAX_PAGE_TOKEN_LENGTH = 4096;
  const OPAQUE_ID_PATTERN = /^(job|plan|op)_[a-z0-9_-]{1,160}$/i;
  const MAX_BATCH_SIZE = 10;
  const MAX_PATH_LENGTH = 2048;
  const MAX_PERSISTED_SELECTION = 5000;
  const MAX_FILE_NAME_LENGTH = 255;
  function containsUnsafeText(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code < 32 || code === 127) return true;
    }
    return false;
  }
  type RateLimitBucket = "read" | "write" | "transfer";
  const RATE_LIMITS: Record<RateLimitBucket, number> = {
    read: 240,
    write: 90,
    transfer: 60,
  };
  const RATE_LIMIT_WINDOW_SECONDS = 60;

  export function enforceUserRateLimit(bucket: RateLimitBucket): void {
    const cache = CacheService.getUserCache();
    const lock = LockService.getUserLock();
    if (!lock.tryLock(2_000)) throw new Error("DRIVE_RATE_LIMITED");
    try {
      const windowId = Math.floor(
        Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000),
      );
      const key = `driveTransferRate_${bucket}_${windowId}`;
      const current = Number(cache.get(key) ?? "0");
      if (
        !Number.isInteger(current) ||
        current < 0 ||
        current >= RATE_LIMITS[bucket]
      ) {
        throw new Error("DRIVE_RATE_LIMITED");
      }
      cache.put(key, String(current + 1), RATE_LIMIT_WINDOW_SECONDS + 5);
    } finally {
      lock.releaseLock();
    }
  }

  export function requireSafeText(value: unknown, maxLength: number): string {
    if (
      typeof value !== "string" ||
      value.length < 1 ||
      value.length > maxLength ||
      value.trim().length < 1 ||
      containsUnsafeText(value)
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    return value;
  }

  export function requireDriveId(value: unknown): string {
    if (typeof value !== "string" || !DRIVE_ID_PATTERN.test(value)) {
      throw new Error("INVALID_DRIVE_REFERENCE");
    }
    return value;
  }

  export function optionalPageToken(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || value.length > MAX_PAGE_TOKEN_LENGTH) {
      throw new Error("INVALID_PAGE_TOKEN");
    }
    return value;
  }

  export function clampPageSize(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 100;
    return Math.min(100, Math.max(10, Math.floor(value)));
  }

  export function escapeDriveQueryValue(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  export function requireOpaqueId(value: unknown): string {
    if (typeof value !== "string" || !OPAQUE_ID_PATTERN.test(value)) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    return value;
  }

  export function requireTransferCommand(value: unknown): TransferCommand {
    if (value !== "copy" && value !== "move") {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    return value;
  }

  export function requireRelativePath(value: unknown): string {
    if (typeof value !== "string" || value.length > MAX_PATH_LENGTH) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    const segments = value.split("/").filter(Boolean);
    if (
      segments.some(
        (segment) =>
          segment === "." ||
          segment === ".." ||
          segment.length > MAX_FILE_NAME_LENGTH ||
          containsUnsafeText(segment),
      )
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    return segments.join("/");
  }

  export function requireTransferBatch(
    request: ExecuteBatchRequest,
  ): ExecuteBatchRequest {
    if (!request || typeof request !== "object") {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    requireOpaqueId(request.jobId);
    requireTransferCommand(request.command);
    requireDriveId(request.sourceRootId);
    requireDriveId(request.destinationFolderId);
    if (
      request.destinationSpace !== "my_drive" &&
      request.destinationSpace !== "shared_drive"
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    if (
      !Array.isArray(request.operations) ||
      request.operations.length < 1 ||
      request.operations.length > MAX_BATCH_SIZE
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    if (request.command === "move" && request.moveConfirmed !== true) {
      throw new Error("MOVE_CONFIRMATION_REQUIRED");
    }
    request.operations.forEach((operation) => {
      requireOpaqueId(operation.operationKey);
      requireDriveId(operation.sourceId);
      if (operation.sourceParentId) requireDriveId(operation.sourceParentId);
      requireRelativePath(operation.relativePath);
      requireSafeText(operation.name, MAX_FILE_NAME_LENGTH);
      if (operation.targetName !== undefined) {
        requireSafeText(operation.targetName, MAX_FILE_NAME_LENGTH);
      }
      if (
        (operation.kind !== "file" && operation.kind !== "folder") ||
        typeof operation.mimeType !== "string" ||
        operation.mimeType.length === 0 ||
        operation.mimeType.length > 256 ||
        containsUnsafeText(operation.mimeType) ||
        (operation.sourceSpace !== "my_drive" &&
          operation.sourceSpace !== "shared_drive") ||
        (operation.size !== undefined &&
          (!Number.isSafeInteger(operation.size) || operation.size < 0))
      ) {
        throw new Error("INVALID_TRANSFER_REQUEST");
      }
    });
    return request;
  }

  export function requireDuplicatePolicy(
    value: unknown,
  ): "skip" | "rename" | "review" {
    if (value !== "skip" && value !== "rename" && value !== "review") {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    return value;
  }

  export function requireFavorite(
    favorite: TransferFavorite,
  ): TransferFavorite {
    requireOpaqueId(favorite?.id);
    if (
      typeof favorite?.name !== "string" ||
      favorite.name.length === 0 ||
      favorite.name.length > 80
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    requireDriveId(favorite.sourceFolderId);
    requireDriveId(favorite.destinationFolderId);
    requireTransferCommand(favorite.command);
    requireDuplicatePolicy(favorite.duplicatePolicy);
    return favorite;
  }

  export function requirePersistedJob(
    snapshot: PersistedTransferJob,
  ): PersistedTransferJob {
    requireOpaqueId(snapshot?.jobId);
    requireDriveId(snapshot.sourceFolderId);
    requireDriveId(snapshot.destinationFolderId);
    requireTransferCommand(snapshot.command);
    requireDuplicatePolicy(snapshot.duplicatePolicy);
    if (
      !Array.isArray(snapshot.selectedIds) ||
      snapshot.selectedIds.length > MAX_PERSISTED_SELECTION ||
      !Array.isArray(snapshot.checkpoints) ||
      snapshot.checkpoints.length > MAX_PERSISTED_SELECTION
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    snapshot.selectedIds.forEach(requireDriveId);
    if (
      typeof snapshot.updatedAt !== "string" ||
      !Number.isFinite(new Date(snapshot.updatedAt).getTime())
    ) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    snapshot.checkpoints.forEach((checkpoint) => {
      requireOpaqueId(checkpoint.operationKey);
      if (
        ![
          "copied",
          "moved",
          "reused_folder",
          "skipped_duplicate",
          "failed_retryable",
          "failed_terminal",
        ].includes(checkpoint.result) ||
        !Number.isFinite(checkpoint.attempts) ||
        checkpoint.attempts < 0
      ) {
        throw new Error("INVALID_TRANSFER_REQUEST");
      }
    });
    return snapshot;
  }

  export function asSafeRuntimeError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (
      /INVALID_DRIVE_REFERENCE|INVALID_PAGE_TOKEN|INVALID_TRANSFER_REQUEST|INVALID_JOB_TRANSITION|UNKNOWN_STORAGE_SCHEMA|MOVE_CONFIRMATION_REQUIRED|DRIVE_RATE_LIMITED/.test(
        message,
      )
    ) {
      return new Error(message);
    }
    if (/rateLimit|userRateLimit|too many requests|quota/i.test(message)) {
      return new Error("DRIVE_RATE_LIMITED");
    }
    if (/notFound|File not found/i.test(message))
      return new Error("DRIVE_NOT_FOUND");
    if (/forbidden|permission|insufficient/i.test(message)) {
      return new Error("DRIVE_PERMISSION_DENIED");
    }
    return new Error("DRIVE_REQUEST_FAILED");
  }
}
