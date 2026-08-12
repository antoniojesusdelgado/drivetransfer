function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("DriveTransfer")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function inspectDriveFolder(
  request: DriveTransferRuntime.FolderRequest,
): DriveTransferRuntime.FolderSummary {
  return DriveTransferRuntime.inspectFolder(request);
}

function inspectDriveCapacity(): DriveTransferRuntime.DriveCapacitySummary {
  return DriveTransferRuntime.inspectCapacity();
}

function listDriveFolderPage(
  request: DriveTransferRuntime.ListFolderPageRequest,
): DriveTransferRuntime.ListFolderPageResponse {
  return DriveTransferRuntime.listFolderPage(request);
}

function executeTransferBatch(
  request: DriveTransferRuntime.ExecuteBatchRequest,
): DriveTransferRuntime.ExecuteBatchResponse {
  return DriveTransferRuntime.executeBatch(request);
}

function verifyTransferBatch(
  request: DriveTransferRuntime.VerifyBatchRequest,
): DriveTransferRuntime.VerifyBatchResponse {
  return DriveTransferRuntime.verifyBatch(request);
}

function listTransferFavorites(): readonly DriveTransferRuntime.TransferFavorite[] {
  return DriveTransferRuntime.listFavorites();
}

function saveTransferFavorite(
  favorite: DriveTransferRuntime.TransferFavorite,
): DriveTransferRuntime.TransferFavorite {
  return DriveTransferRuntime.saveFavorite(favorite);
}

function deleteTransferFavorite(request: { readonly favoriteId: string }): {
  readonly ok: true;
} {
  DriveTransferRuntime.deleteFavorite(request);
  return { ok: true };
}

function saveTransferJob(
  snapshot: DriveTransferRuntime.PersistedTransferJob,
): DriveTransferRuntime.PersistedTransferJob {
  return DriveTransferRuntime.saveJob(snapshot);
}

function loadTransferJob(request: {
  readonly jobId: string;
}): DriveTransferRuntime.PersistedTransferJob | null {
  return DriveTransferRuntime.loadJob(request);
}

function loadLatestTransferJob(): DriveTransferRuntime.PersistedTransferJob | null {
  return DriveTransferRuntime.loadLatestJob();
}

function clearTransferJob(request: { readonly jobId: string }): {
  readonly ok: true;
} {
  DriveTransferRuntime.clearJob(request);
  return { ok: true };
}

function loadTransferWorkspace(): DriveTransferRuntime.WorkspaceSnapshot {
  return DriveTransferRuntime.loadWorkspace();
}

function saveWorkspaceJob(
  job: DriveTransferRuntime.WorkspaceJobRecord,
): DriveTransferRuntime.WorkspaceJobRecord {
  return DriveTransferRuntime.saveWorkspaceJobRecord(job);
}

function controlWorkspaceJob(request: {
  readonly jobId: string;
  readonly action: DriveTransferRuntime.JobControlAction;
}): DriveTransferRuntime.WorkspaceSnapshot {
  return DriveTransferRuntime.controlJob(request);
}

function saveTransferSchedule(
  schedule: DriveTransferRuntime.TransferScheduleRecord,
): DriveTransferRuntime.TransferScheduleRecord {
  return DriveTransferRuntime.saveScheduleRecord(schedule);
}

function deleteTransferSchedule(request: { readonly scheduleId: string }): {
  readonly ok: true;
} {
  DriveTransferRuntime.deleteScheduleRecord(request);
  return { ok: true };
}

function runTransferScheduleNow(request: {
  readonly scheduleId: string;
}): DriveTransferRuntime.WorkspaceSnapshot {
  return DriveTransferRuntime.runScheduleNow(request);
}

function pruneTransferHistory(): DriveTransferRuntime.WorkspaceSnapshot {
  return DriveTransferRuntime.prunePrivateHistory();
}

function dispatchTransferSchedules(): void {
  DriveTransferRuntime.dispatchSchedules();
}

function exportDriveTransferData(): DriveTransferRuntime.PrivateDataExport {
  return DriveTransferRuntime.exportPrivateData();
}

function deleteDriveTransferData(): DriveTransferRuntime.DataDeletionSummary {
  return DriveTransferRuntime.deleteAllPrivateData();
}
