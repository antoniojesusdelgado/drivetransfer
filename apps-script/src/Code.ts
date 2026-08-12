function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("DriveTransfer")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function inspectDriveFolder(
  request: DriveTransferRuntime.FolderRequest,
): DriveTransferRuntime.FolderSummary {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.inspectFolder(request);
}

function inspectDriveCapacity(): DriveTransferRuntime.DriveCapacitySummary {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.inspectCapacity();
}

function listDriveFolderPage(
  request: DriveTransferRuntime.ListFolderPageRequest,
): DriveTransferRuntime.ListFolderPageResponse {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.listFolderPage(request);
}

function executeTransferBatch(
  request: DriveTransferRuntime.ExecuteBatchRequest,
): DriveTransferRuntime.ExecuteBatchResponse {
  DriveTransferRuntime.enforceUserRateLimit("transfer");
  return DriveTransferRuntime.executeBatch(request);
}

function verifyTransferBatch(
  request: DriveTransferRuntime.VerifyBatchRequest,
): DriveTransferRuntime.VerifyBatchResponse {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.verifyBatch(request);
}

function listTransferFavorites(): readonly DriveTransferRuntime.TransferFavorite[] {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.listFavorites();
}

function saveTransferFavorite(
  favorite: DriveTransferRuntime.TransferFavorite,
): DriveTransferRuntime.TransferFavorite {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.saveFavorite(favorite);
}

function deleteTransferFavorite(request: { readonly favoriteId: string }): {
  readonly ok: true;
} {
  DriveTransferRuntime.enforceUserRateLimit("write");
  DriveTransferRuntime.deleteFavorite(request);
  return { ok: true };
}

function saveTransferJob(
  snapshot: DriveTransferRuntime.PersistedTransferJob,
): DriveTransferRuntime.PersistedTransferJob {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.saveJob(snapshot);
}

function loadTransferJob(request: {
  readonly jobId: string;
}): DriveTransferRuntime.PersistedTransferJob | null {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.loadJob(request);
}

function loadLatestTransferJob(): DriveTransferRuntime.PersistedTransferJob | null {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.loadLatestJob();
}

function clearTransferJob(request: { readonly jobId: string }): {
  readonly ok: true;
} {
  DriveTransferRuntime.enforceUserRateLimit("write");
  DriveTransferRuntime.clearJob(request);
  return { ok: true };
}

function loadTransferWorkspace(): DriveTransferRuntime.WorkspaceSnapshot {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.loadWorkspace();
}

function saveWorkspaceJob(
  job: DriveTransferRuntime.WorkspaceJobRecord,
): DriveTransferRuntime.WorkspaceJobRecord {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.saveWorkspaceJobRecord(job);
}

function controlWorkspaceJob(request: {
  readonly jobId: string;
  readonly action: DriveTransferRuntime.JobControlAction;
}): DriveTransferRuntime.WorkspaceSnapshot {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.controlJob(request);
}

function saveTransferSchedule(
  schedule: DriveTransferRuntime.TransferScheduleRecord,
): DriveTransferRuntime.TransferScheduleRecord {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.saveScheduleRecord(schedule);
}

function deleteTransferSchedule(request: { readonly scheduleId: string }): {
  readonly ok: true;
} {
  DriveTransferRuntime.enforceUserRateLimit("write");
  DriveTransferRuntime.deleteScheduleRecord(request);
  return { ok: true };
}

function runTransferScheduleNow(request: {
  readonly scheduleId: string;
}): DriveTransferRuntime.WorkspaceSnapshot {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.runScheduleNow(request);
}

function pruneTransferHistory(): DriveTransferRuntime.WorkspaceSnapshot {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.prunePrivateHistory();
}

function dispatchTransferSchedules(): void {
  DriveTransferRuntime.dispatchSchedules();
}

function exportDriveTransferData(): DriveTransferRuntime.PrivateDataExport {
  DriveTransferRuntime.enforceUserRateLimit("read");
  return DriveTransferRuntime.exportPrivateData();
}

function deleteDriveTransferData(): DriveTransferRuntime.DataDeletionSummary {
  DriveTransferRuntime.enforceUserRateLimit("write");
  return DriveTransferRuntime.deleteAllPrivateData();
}
