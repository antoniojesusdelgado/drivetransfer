export type DriveSpace = "my_drive" | "shared_drive";
export type DriveItemKind = "folder" | "file";
export type TransferCommand = "copy" | "move";

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
}

export type PlanDecision =
  "transfer" | "reuse_folder" | "skip_duplicate" | "blocked";

export interface PlannedOperation {
  readonly item: DriveItem;
  readonly command: TransferCommand;
  readonly decision: PlanDecision;
  readonly reason?: "duplicate" | "read_denied" | "copy_denied" | "move_denied";
  readonly operationKey: string;
}

export interface TransferPlan {
  readonly id: string;
  readonly command: TransferCommand;
  readonly sourceSpace: DriveSpace;
  readonly destinationSpace: DriveSpace;
  readonly createdAt: string;
  readonly operations: readonly PlannedOperation[];
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
