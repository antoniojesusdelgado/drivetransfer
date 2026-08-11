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
