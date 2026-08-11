export type DriveSpace = "my_drive" | "shared_drive";

export interface DriveFolderSummary {
  readonly id: string;
  readonly name: string;
  readonly driveId?: string;
  readonly space: DriveSpace;
  readonly capabilities: {
    readonly canRead: boolean;
    readonly canCopy: boolean;
    readonly canMove: boolean;
    readonly canAddChildren: boolean;
  };
}

export interface IndexedDriveItem {
  readonly id: string;
  readonly parentId: string;
  readonly name: string;
  readonly kind: "folder" | "file" | "shortcut";
  readonly mimeType: string;
  readonly size?: number;
  readonly driveId?: string;
  readonly space: DriveSpace;
  readonly shortcutTargetId?: string;
  readonly shortcutTargetMimeType?: string;
  readonly capabilities: DriveFolderSummary["capabilities"];
}

export interface FolderPageRequest {
  readonly folderId: string;
  readonly driveId?: string;
  readonly pageToken?: string;
  readonly pageSize?: number;
}

export interface FolderPageResponse {
  readonly items: readonly IndexedDriveItem[];
  readonly nextPageToken?: string;
  readonly incompleteSearch: boolean;
}

export type RuntimeOperationResult =
  | "copied"
  | "moved"
  | "reused_folder"
  | "skipped_duplicate"
  | "failed_retryable"
  | "failed_terminal";

export interface RuntimeTransferOperation {
  readonly operationKey: string;
  readonly sourceId: string;
  readonly sourceParentId?: string;
  readonly relativePath: string;
  readonly name: string;
  readonly kind: "folder" | "file";
  readonly mimeType: string;
  readonly size?: number;
  readonly sourceSpace: DriveSpace;
}

export interface ExecuteBatchRequest {
  readonly jobId: string;
  readonly command: "copy" | "move";
  readonly sourceRootId: string;
  readonly destinationFolderId: string;
  readonly destinationSpace: DriveSpace;
  readonly moveConfirmed: boolean;
  readonly operations: readonly RuntimeTransferOperation[];
}

export interface RuntimeCheckpoint {
  readonly operationKey: string;
  readonly result: RuntimeOperationResult;
  readonly attempts: number;
  readonly errorCode?:
    | "temporary_unavailable"
    | "permission_denied"
    | "invalid_request"
    | "verification_failed";
}

export interface ExecuteBatchResponse {
  readonly jobId: string;
  readonly checkpoints: readonly RuntimeCheckpoint[];
  readonly paused: boolean;
}

export interface VerifyBatchRequest {
  readonly destinationFolderId: string;
  readonly operationKeys: readonly string[];
}

export interface VerifyBatchResponse {
  readonly verifiedOperationKeys: readonly string[];
}

export interface DriveRuntimeGateway {
  inspectFolder(folderId: string): Promise<DriveFolderSummary>;
  listFolderPage(request: FolderPageRequest): Promise<FolderPageResponse>;
  executeBatch(request: ExecuteBatchRequest): Promise<ExecuteBatchResponse>;
  verifyBatch(request: VerifyBatchRequest): Promise<VerifyBatchResponse>;
}
