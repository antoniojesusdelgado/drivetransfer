import type {
  DriveFolderSummary,
  DriveCapacitySummary,
  DriveRuntimeGateway,
  ExecuteBatchRequest,
  ExecuteBatchResponse,
  FolderPageRequest,
  FolderPageResponse,
  PersistedTransferJob,
  JobControlAction,
  TransferScheduleRecord,
  TransferFavorite,
  VerifyBatchRequest,
  VerifyBatchResponse,
  WorkspaceJobRecord,
  WorkspaceSnapshot,
} from "./types";

interface ExecutionError {
  readonly errorMessage?: string;
  readonly errorType?: string;
}

interface ExecutionResponse<T> {
  readonly done?: boolean;
  readonly response?: { readonly result?: T };
  readonly error?: { readonly details?: readonly ExecutionError[] };
}

const MAX_ATTEMPTS = 4;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function safeExecutionError(response: ExecutionResponse<unknown>): Error {
  const code = response.error?.details?.[0]?.errorMessage;
  const allowedCodes = new Set([
    "INVALID_DRIVE_REFERENCE",
    "INVALID_TRANSFER_REQUEST",
    "MOVE_CONFIRMATION_REQUIRED",
    "INVALID_JOB_TRANSITION",
    "UNKNOWN_STORAGE_SCHEMA",
    "DRIVE_RATE_LIMITED",
    "DRIVE_NOT_FOUND",
    "DRIVE_PERMISSION_DENIED",
    "DRIVE_REQUEST_FAILED",
  ]);
  return new Error(
    code && allowedCodes.has(code) ? code : "DRIVE_REQUEST_FAILED",
  );
}

export function createExecutionApiGateway(input: {
  readonly accessToken: string;
  readonly deploymentId: string;
}): DriveRuntimeGateway {
  async function invoke<T>(
    functionName: string,
    argument: unknown,
  ): Promise<T> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(
        `https://script.googleapis.com/v1/scripts/${encodeURIComponent(input.deploymentId)}:run`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            function: functionName,
            parameters: [argument],
          }),
        },
      );
      if (response.status === 401) throw new Error("GOOGLE_SESSION_EXPIRED");
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < MAX_ATTEMPTS - 1) {
        await wait(400 * 2 ** attempt);
        continue;
      }
      if (response.status === 429) throw new Error("DRIVE_RATE_LIMITED");
      if (!response.ok) throw new Error("DRIVE_REQUEST_FAILED");
      const payload = (await response.json()) as ExecutionResponse<T>;
      if (payload.error || payload.response?.result === undefined) {
        throw safeExecutionError(payload);
      }
      return payload.response.result;
    }
    throw new Error("DRIVE_REQUEST_FAILED");
  }

  return {
    inspectFolder: (folderId) =>
      invoke<DriveFolderSummary>("inspectDriveFolder", { folderId }),
    inspectCapacity: () =>
      invoke<DriveCapacitySummary>("inspectDriveCapacity", {}),
    listFolderPage: (request: FolderPageRequest) =>
      invoke<FolderPageResponse>("listDriveFolderPage", request),
    executeBatch: (request: ExecuteBatchRequest) =>
      invoke<ExecuteBatchResponse>("executeTransferBatch", request),
    verifyBatch: (request: VerifyBatchRequest) =>
      invoke<VerifyBatchResponse>("verifyTransferBatch", request),
    listFavorites: () =>
      invoke<readonly TransferFavorite[]>("listTransferFavorites", {}),
    saveFavorite: (favorite: TransferFavorite) =>
      invoke<TransferFavorite>("saveTransferFavorite", favorite),
    deleteFavorite: (favoriteId: string) =>
      invoke<{ readonly ok: true }>("deleteTransferFavorite", {
        favoriteId,
      }).then(() => undefined),
    saveJob: (snapshot: PersistedTransferJob) =>
      invoke<PersistedTransferJob>("saveTransferJob", snapshot),
    loadJob: (jobId: string) =>
      invoke<PersistedTransferJob | null>("loadTransferJob", { jobId }),
    loadLatestJob: () =>
      invoke<PersistedTransferJob | null>("loadLatestTransferJob", {}),
    clearJob: (jobId: string) =>
      invoke<{ readonly ok: true }>("clearTransferJob", { jobId }).then(
        () => undefined,
      ),
    loadWorkspace: () => invoke<WorkspaceSnapshot>("loadTransferWorkspace", {}),
    saveWorkspaceJob: (job: WorkspaceJobRecord) =>
      invoke<WorkspaceJobRecord>("saveWorkspaceJob", job),
    controlWorkspaceJob: (jobId: string, action: JobControlAction) =>
      invoke<WorkspaceSnapshot>("controlWorkspaceJob", { jobId, action }),
    saveSchedule: (schedule: TransferScheduleRecord) =>
      invoke<TransferScheduleRecord>("saveTransferSchedule", schedule),
    deleteSchedule: (scheduleId: string) =>
      invoke<{ readonly ok: true }>("deleteTransferSchedule", {
        scheduleId,
      }).then(() => undefined),
    runScheduleNow: (scheduleId: string) =>
      invoke<WorkspaceSnapshot>("runTransferScheduleNow", { scheduleId }),
    exportAccountData: () =>
      invoke<{
        readonly exportedAt: string;
        readonly documents: readonly {
          readonly name: string;
          readonly data: unknown;
        }[];
      }>("exportDriveTransferData", {}),
    deleteAccountData: () =>
      invoke<import("../../privacy").DataDeletionSummary>(
        "deleteDriveTransferData",
        {},
      ),
  };
}
