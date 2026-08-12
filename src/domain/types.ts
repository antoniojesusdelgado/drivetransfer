export type DriveSpace = "my_drive" | "shared_drive";
export type DriveItemKind = "folder" | "file";
export type TransferCommand = "copy" | "move";
export type DuplicatePolicy = "skip" | "rename" | "review";
export type WorkspaceView =
  "transfer" | "jobs" | "schedules" | "history" | "privacy";
export type JobKind = "transfer" | "dry_run" | "sync";
export type WorkspaceJobStatus =
  | "queued"
  | "running"
  | "paused"
  | "needs_attention"
  | "cancelled"
  | "completed";

export interface ItemCapabilities {
  readonly canRead: boolean;
  readonly canCopy: boolean;
  readonly canMove: boolean;
}

export interface DriveItem {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly kind: DriveItemKind;
  readonly mimeType: string;
  readonly size?: number;
  readonly modifiedTime?: string;
  readonly md5Checksum?: string;
  readonly relativePath: string;
  readonly space: DriveSpace;
  readonly capabilities: ItemCapabilities;
  readonly simulation?: "retry_once";
}

export interface DriveTree {
  readonly rootId: string;
  readonly items: readonly DriveItem[];
}

export interface DestinationEntry {
  readonly name: string;
  readonly relativePath: string;
  readonly kind: DriveItemKind;
  readonly mimeType: string;
  readonly size?: number;
  readonly modifiedTime?: string;
  readonly md5Checksum?: string;
}

export interface TransferFilterSet {
  readonly nameIncludes: string;
  readonly extensions: readonly string[];
  readonly kinds: readonly DriveItemKind[];
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly modifiedAfter?: string;
  readonly modifiedBefore?: string;
  readonly excludedPaths: readonly string[];
  readonly changeMode: "all" | "new" | "new_or_modified";
}

export type ConflictAction = "skip" | "keep_both" | "rename" | "pending";

export interface ConflictResolution {
  readonly operationKey: string;
  readonly action: ConflictAction;
  readonly targetName?: string;
}

export interface VerificationSummary {
  readonly expected: number;
  readonly verified: number;
  readonly checksumVerified: number;
  readonly metadataVerified: number;
  readonly failed: number;
}

export interface NotificationPreferences {
  readonly browser: boolean;
  readonly email: boolean;
}

export type ScheduleFrequency = "once" | "daily" | "weekly" | "monthly";

export interface TransferSchedule {
  readonly id: string;
  readonly name: string;
  readonly sourceFolderId: string;
  readonly destinationFolderId: string;
  readonly kind: "transfer" | "sync";
  readonly frequency: ScheduleFrequency;
  readonly timeOfDay: string;
  readonly dayOfWeek?: number;
  readonly dayOfMonth?: number;
  readonly timeZone: string;
  readonly nextRunAt: string;
  readonly enabled: boolean;
  readonly filters: TransferFilterSet;
  readonly duplicatePolicy: DuplicatePolicy;
  readonly notifications: NotificationPreferences;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredJobManifest {
  readonly id: string;
  readonly name: string;
  readonly kind: JobKind;
  readonly command: TransferCommand;
  readonly status: WorkspaceJobStatus;
  readonly sourceLabel: string;
  readonly destinationLabel: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly scheduleId?: string;
  readonly verification?: VerificationSummary;
}

export interface HistoryEntry extends StoredJobManifest {
  readonly finishedAt: string;
  readonly reportAvailable: boolean;
}

export type PlanDecision =
  | "transfer"
  | "reuse_folder"
  | "skip_duplicate"
  | "rename_duplicate"
  | "blocked";

export interface PlannedOperation {
  readonly item: DriveItem;
  readonly command: TransferCommand;
  readonly decision: PlanDecision;
  readonly reason?:
    | "duplicate"
    | "duplicate_review"
    | "read_denied"
    | "copy_denied"
    | "move_denied";
  readonly targetName?: string;
  readonly operationKey: string;
}

export interface TransferPlan {
  readonly id: string;
  readonly command: TransferCommand;
  readonly duplicatePolicy: DuplicatePolicy;
  readonly kind?: JobKind;
  readonly filters?: TransferFilterSet;
  readonly resolutions?: readonly ConflictResolution[];
  readonly sourceSpace: DriveSpace;
  readonly destinationSpace: DriveSpace;
  readonly createdAt: string;
  readonly operations: readonly PlannedOperation[];
}

export interface TransferPreflight {
  readonly files: number;
  readonly folders: number;
  readonly knownBytes: number;
  readonly unknownSizes: number;
  readonly ready: number;
  readonly skipped: number;
  readonly renamed: number;
  readonly blocked: number;
  readonly estimatedSeconds: number;
  readonly remainingBytes?: number;
  readonly spaceSufficient: boolean;
  readonly canProceed: boolean;
  readonly warnings: readonly string[];
}

export type OperationResult =
  | "pending"
  | "copied"
  | "moved"
  | "reused_folder"
  | "skipped_duplicate"
  | "failed_retryable"
  | "failed_terminal";

export interface OperationCheckpoint {
  readonly operationKey: string;
  readonly result: OperationResult;
  readonly attempts: number;
  readonly errorCode?: "temporary_unavailable" | "permission_denied";
}

export type TransferJobStatus =
  | "queued"
  | "running"
  | "paused"
  | "paused_retryable"
  | "cancelled"
  | "completed"
  | "completed_with_errors";

export interface TransferJob {
  readonly id: string;
  readonly plan: TransferPlan;
  readonly status: TransferJobStatus;
  readonly checkpoints: Readonly<Record<string, OperationCheckpoint>>;
}
