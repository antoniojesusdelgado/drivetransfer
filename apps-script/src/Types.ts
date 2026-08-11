namespace DriveTransferRuntime {
  export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

  export interface FolderRequest {
    readonly folderId: string;
  }

  export interface FolderSummary {
    readonly id: string;
    readonly name: string;
    readonly driveId?: string;
    readonly space: "my_drive" | "shared_drive";
    readonly capabilities: {
      readonly canRead: boolean;
      readonly canCopy: boolean;
      readonly canMove: boolean;
      readonly canAddChildren: boolean;
    };
  }

  export interface ListFolderPageRequest {
    readonly folderId: string;
    readonly driveId?: string;
    readonly pageToken?: string;
    readonly pageSize?: number;
  }

  export interface IndexedDriveItem {
    readonly id: string;
    readonly parentId: string;
    readonly name: string;
    readonly kind: "folder" | "file" | "shortcut";
    readonly mimeType: string;
    readonly size?: number;
    readonly driveId?: string;
    readonly space: "my_drive" | "shared_drive";
    readonly shortcutTargetId?: string;
    readonly shortcutTargetMimeType?: string;
    readonly capabilities: {
      readonly canRead: boolean;
      readonly canCopy: boolean;
      readonly canMove: boolean;
      readonly canAddChildren: boolean;
    };
  }

  export interface ListFolderPageResponse {
    readonly items: readonly IndexedDriveItem[];
    readonly nextPageToken?: string;
    readonly incompleteSearch: boolean;
  }

  export type TransferCommand = "copy" | "move";
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
    readonly sourceSpace: "my_drive" | "shared_drive";
  }

  export interface ExecuteBatchRequest {
    readonly jobId: string;
    readonly command: TransferCommand;
    readonly sourceRootId: string;
    readonly destinationFolderId: string;
    readonly destinationSpace: "my_drive" | "shared_drive";
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
}
