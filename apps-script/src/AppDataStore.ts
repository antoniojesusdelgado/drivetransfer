namespace DriveTransferRuntime {
  const APP_DATA_SCHEMA = 1;
  const APP_DATA_INDEX_KEY = "driveTransferAppDataIndex";
  const MAX_DOCUMENT_BYTES = 450_000;
  const PRIVATE_FILE_PREFIX = "drive-transfer-";

  export interface DataDeletionSummary {
    readonly deletedDocuments: number;
    readonly deletedProperties: number;
    readonly deletedTriggers: number;
    readonly verified: boolean;
  }

  export interface PrivateDataExport {
    readonly exportedAt: string;
    readonly documents: readonly {
      readonly name: string;
      readonly data: unknown;
    }[];
  }

  interface PrivateEnvelope {
    readonly schemaVersion: number;
    readonly kind: string;
    readonly updatedAt: string;
    readonly payload: unknown;
  }

  function appDataDrive(): GoogleAppsScript.Drive {
    if (!Drive) throw new Error("DRIVE_SERVICE_UNAVAILABLE");
    return Drive;
  }

  function appDataIndex(): Record<string, string> {
    const raw =
      PropertiesService.getUserProperties().getProperty(APP_DATA_INDEX_KEY);
    if (!raw) return {};
    try {
      const value = JSON.parse(raw) as Record<string, string>;
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function saveAppDataIndex(index: Record<string, string>): void {
    PropertiesService.getUserProperties().setProperty(
      APP_DATA_INDEX_KEY,
      JSON.stringify(index),
    );
  }

  function findPrivateFile(name: string): string | undefined {
    const index = appDataIndex();
    const cached = index[name];
    if (cached) return cached;
    const response = appDataDrive().Files.list({
      spaces: "appDataFolder",
      q: "name = '" + escapeDriveQueryValue(name) + "' and trashed = false",
      pageSize: 1,
      fields: "files(id,name)",
    });
    const id = response.files?.[0]?.id;
    if (id) {
      index[name] = id;
      saveAppDataIndex(index);
    }
    return id;
  }

  function downloadPrivateFile(fileId: string): string {
    return DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
  }

  export function readPrivateDocument<T>(name: string, kind: string): T | null {
    const fileId = findPrivateFile(name);
    if (!fileId) return null;
    const envelope = JSON.parse(downloadPrivateFile(fileId)) as PrivateEnvelope;
    if (
      envelope.schemaVersion !== APP_DATA_SCHEMA ||
      envelope.kind !== kind ||
      typeof envelope.updatedAt !== "string"
    ) {
      throw new Error("UNKNOWN_STORAGE_SCHEMA");
    }
    return envelope.payload as T;
  }

  export function writePrivateDocument<T>(
    name: string,
    kind: string,
    payload: T,
  ): T {
    const text = JSON.stringify({
      schemaVersion: APP_DATA_SCHEMA,
      kind,
      updatedAt: new Date().toISOString(),
      payload,
    });
    if (Utilities.newBlob(text).getBytes().length > MAX_DOCUMENT_BYTES) {
      throw new Error("INVALID_TRANSFER_REQUEST");
    }
    const blob = Utilities.newBlob(text, "application/json", name);
    const existingId = findPrivateFile(name);
    let fileId = existingId;
    if (existingId) {
      appDataDrive().Files.update({ name }, existingId, blob, { fields: "id" });
    } else {
      const created = appDataDrive().Files.create(
        { name, parents: ["appDataFolder"] },
        blob,
        { fields: "id" },
      );
      fileId = created.id;
    }
    if (!fileId) throw new Error("DRIVE_REQUEST_FAILED");
    const index = appDataIndex();
    index[name] = fileId;
    saveAppDataIndex(index);
    const verified = readPrivateDocument<T>(name, kind);
    if (verified === null) throw new Error("DRIVE_REQUEST_FAILED");
    return verified;
  }

  export function deletePrivateDocument(name: string): void {
    const fileId = findPrivateFile(name);
    if (fileId) appDataDrive().Files.remove(fileId);
    const index = appDataIndex();
    delete index[name];
    saveAppDataIndex(index);
  }

  function listDriveTransferFiles(): readonly { id: string; name: string }[] {
    const files: { id: string; name: string }[] = [];
    let pageToken: string | undefined;
    do {
      const response = appDataDrive().Files.list({
        spaces: "appDataFolder",
        q: "name contains '" + PRIVATE_FILE_PREFIX + "' and trashed = false",
        pageSize: 100,
        pageToken,
        fields: "nextPageToken,files(id,name)",
      });
      (response.files ?? []).forEach((file) => {
        if (
          file.id &&
          file.name &&
          file.name.indexOf(PRIVATE_FILE_PREFIX) === 0
        ) {
          files.push({ id: file.id, name: file.name });
        }
      });
      pageToken = response.nextPageToken;
    } while (pageToken);
    return files;
  }

  export function exportPrivateData(): PrivateDataExport {
    try {
      const documents = listDriveTransferFiles().map((file) => {
        const envelope = JSON.parse(downloadPrivateFile(file.id)) as {
          readonly payload?: unknown;
        };
        return { name: file.name, data: envelope.payload ?? null };
      });
      return { exportedAt: new Date().toISOString(), documents };
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function deleteAllPrivateData(): DataDeletionSummary {
    const lock = LockService.getUserLock();
    lock.waitLock(20_000);
    try {
      const files = listDriveTransferFiles();
      files.forEach((file) => appDataDrive().Files.remove(file.id));

      const properties = PropertiesService.getUserProperties();
      const allProperties = properties.getProperties();
      const propertyKeys = Object.keys(allProperties).filter(
        (key) => key.indexOf("driveTransfer") === 0,
      );
      propertyKeys.forEach((key) => properties.deleteProperty(key));

      let deletedTriggers = 0;
      ScriptApp.getProjectTriggers().forEach((trigger) => {
        if (trigger.getHandlerFunction() === "dispatchTransferSchedules") {
          ScriptApp.deleteTrigger(trigger);
          deletedTriggers += 1;
        }
      });

      const verified =
        listDriveTransferFiles().length === 0 &&
        Object.keys(properties.getProperties()).every(
          (key) => key.indexOf("driveTransfer") !== 0,
        ) &&
        ScriptApp.getProjectTriggers().every(
          (trigger) =>
            trigger.getHandlerFunction() !== "dispatchTransferSchedules",
        );
      return {
        deletedDocuments: files.length,
        deletedProperties: propertyKeys.length,
        deletedTriggers,
        verified,
      };
    } catch (error) {
      throw asSafeRuntimeError(error);
    } finally {
      lock.releaseLock();
    }
  }
}
