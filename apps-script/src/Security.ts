namespace DriveTransferRuntime {
  const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
  const MAX_PAGE_TOKEN_LENGTH = 4096;
  const OPAQUE_ID_PATTERN = /^(job|plan|op)_[a-z0-9_-]{1,160}$/i;
  const MAX_BATCH_SIZE = 10;
  const MAX_PATH_LENGTH = 2048;

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
    if (segments.some((segment) => segment === "." || segment === "..")) {
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
      if (
        typeof operation.name !== "string" ||
        operation.name.length === 0 ||
        operation.name.length > 1024 ||
        (operation.kind !== "file" && operation.kind !== "folder") ||
        typeof operation.mimeType !== "string" ||
        operation.mimeType.length > 256
      ) {
        throw new Error("INVALID_TRANSFER_REQUEST");
      }
    });
    return request;
  }

  export function asSafeRuntimeError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (
      /INVALID_DRIVE_REFERENCE|INVALID_PAGE_TOKEN|INVALID_TRANSFER_REQUEST|MOVE_CONFIRMATION_REQUIRED/.test(
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
