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
    readonly modifiedTime?: string;
    readonly md5Checksum?: string;
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

  export interface DriveCapacitySummary {
    readonly limit?: number;
    readonly usage?: number;
    readonly remaining?: number;
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
    readonly targetName?: string;
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

  export interface TransferFavorite {
    readonly id: string;
    readonly name: string;
    readonly sourceFolderId: string;
    readonly destinationFolderId: string;
    readonly command: TransferCommand;
    readonly duplicatePolicy: "skip" | "rename" | "review";
  }

  export interface PersistedTransferJob {
    readonly jobId: string;
    readonly sourceFolderId: string;
    readonly destinationFolderId: string;
    readonly command: TransferCommand;
    readonly duplicatePolicy: "skip" | "rename" | "review";
    readonly selectedIds: readonly string[];
    readonly checkpoints: readonly RuntimeCheckpoint[];
    readonly updatedAt: string;
  }

  export interface WorkspaceJobRecord {
    readonly id: string;
    readonly name: string;
    readonly kind: "transfer" | "dry_run" | "sync";
    readonly command: TransferCommand;
    readonly status:
      | "queued"
      | "running"
      | "paused"
      | "needs_attention"
      | "cancelled"
      | "completed";
    readonly sourceLabel: string;
    readonly destinationLabel: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
    readonly scheduleId?: string;
  }

  export interface TransferScheduleRecord {
    readonly id: string;
    readonly name: string;
    readonly sourceFolderId: string;
    readonly destinationFolderId: string;
    readonly kind: "transfer" | "sync";
    readonly frequency: "once" | "daily" | "weekly" | "monthly";
    readonly timeOfDay: string;
    readonly dayOfWeek?: number;
    readonly dayOfMonth?: number;
    readonly timeZone: string;
    readonly nextRunAt: string;
    readonly enabled: boolean;
    readonly duplicatePolicy: "skip" | "rename" | "review";
    readonly filters: {
      readonly nameIncludes: string;
      readonly extensions: readonly string[];
      readonly kinds: readonly ("folder" | "file")[];
      readonly minSize?: number;
      readonly maxSize?: number;
      readonly modifiedAfter?: string;
      readonly modifiedBefore?: string;
      readonly excludedPaths: readonly string[];
      readonly changeMode: "all" | "new" | "new_or_modified";
    };
    readonly notifications: {
      readonly browser: boolean;
      readonly email: boolean;
    };
    readonly createdAt: string;
    readonly updatedAt: string;
  }

  export interface HistoryRecord extends WorkspaceJobRecord {
    readonly finishedAt: string;
    readonly reportAvailable: boolean;
  }

  export interface WorkspaceSnapshot {
    readonly jobs: readonly WorkspaceJobRecord[];
    readonly schedules: readonly TransferScheduleRecord[];
    readonly history: readonly HistoryRecord[];
  }

  export type JobControlAction =
    | "pause"
    | "resume"
    | "cancel"
    | "repeat"
    | "retry_retryable"
    | "retry_permissions";
}
