namespace DriveTransferRuntime {
  const FAVORITES_KEY = "driveTransferFavorites";
  const JOB_PREFIX = "driveTransferJob_";
  const CHUNK_SIZE = 7000;
  const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const LATEST_JOB_KEY = "driveTransferLatestJob";
  const FAVORITES_DOCUMENT = "drive-transfer-favorites.v1.json";

  function jobDocument(jobId: string): string {
    return "drive-transfer-job-" + requireOpaqueId(jobId) + "-manifest.v1.json";
  }

  function jobSelectionDocument(jobId: string): string {
    return (
      "drive-transfer-job-" + requireOpaqueId(jobId) + "-selection.v1.json"
    );
  }

  function jobCheckpointDocument(jobId: string): string {
    return (
      "drive-transfer-job-" + requireOpaqueId(jobId) + "-checkpoints.v1.json"
    );
  }

  function properties(): GoogleAppsScript.Properties.Properties {
    return PropertiesService.getUserProperties();
  }

  function jobKey(jobId: string): string {
    return `${JOB_PREFIX}${requireOpaqueId(jobId)}`;
  }

  function deleteChunks(key: string): void {
    const store = properties();
    const count = Number(store.getProperty(`${key}_count`) ?? 0);
    for (let index = 0; index < count; index += 1) {
      store.deleteProperty(`${key}_${index}`);
    }
    store.deleteProperty(`${key}_count`);
  }

  function writeChunks(key: string, value: string): void {
    if (value.length > 400000) throw new Error("INVALID_TRANSFER_REQUEST");
    deleteChunks(key);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    const values: Record<string, string> = { [`${key}_count`]: String(count) };
    for (let index = 0; index < count; index += 1) {
      values[`${key}_${index}`] = value.slice(
        index * CHUNK_SIZE,
        (index + 1) * CHUNK_SIZE,
      );
    }
    properties().setProperties(values, false);
  }

  function readChunks(key: string): string | null {
    const store = properties();
    const count = Number(store.getProperty(`${key}_count`) ?? 0);
    if (!Number.isInteger(count) || count < 1 || count > 60) return null;
    let value = "";
    for (let index = 0; index < count; index += 1) {
      const chunk = store.getProperty(`${key}_${index}`);
      if (chunk === null) return null;
      value += chunk;
    }
    return value;
  }

  export function listFavorites(): readonly TransferFavorite[] {
    try {
      const privateFavorites = readPrivateDocument<TransferFavorite[]>(
        FAVORITES_DOCUMENT,
        "favorites",
      );
      if (privateFavorites) {
        return privateFavorites.slice(0, 12).map(requireFavorite);
      }
      const stored = properties().getProperty(FAVORITES_KEY);
      if (!stored) return [];
      const favorites = JSON.parse(stored) as TransferFavorite[];
      if (!Array.isArray(favorites)) return [];
      const safe = favorites.slice(0, 12).map(requireFavorite);
      writePrivateDocument(FAVORITES_DOCUMENT, "favorites", safe);
      properties().deleteProperty(FAVORITES_KEY);
      return safe;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function saveFavorite(favorite: TransferFavorite): TransferFavorite {
    try {
      const safeFavorite = requireFavorite(favorite);
      const favorites = listFavorites().filter(
        (item) => item.id !== safeFavorite.id,
      );
      writePrivateDocument(
        FAVORITES_DOCUMENT,
        "favorites",
        [safeFavorite, ...favorites].slice(0, 12),
      );
      return safeFavorite;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function deleteFavorite(request: {
    readonly favoriteId: string;
  }): void {
    try {
      const favoriteId = requireOpaqueId(request?.favoriteId);
      writePrivateDocument(
        FAVORITES_DOCUMENT,
        "favorites",
        listFavorites().filter((item) => item.id !== favoriteId),
      );
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function saveJob(
    snapshot: PersistedTransferJob,
  ): PersistedTransferJob {
    try {
      const safeSnapshot = requirePersistedJob({
        ...snapshot,
        updatedAt: new Date().toISOString(),
      });
      writePrivateDocument(jobDocument(safeSnapshot.jobId), "job-manifest", {
        jobId: safeSnapshot.jobId,
        sourceFolderId: safeSnapshot.sourceFolderId,
        destinationFolderId: safeSnapshot.destinationFolderId,
        command: safeSnapshot.command,
        duplicatePolicy: safeSnapshot.duplicatePolicy,
        updatedAt: safeSnapshot.updatedAt,
      });
      writePrivateDocument(
        jobSelectionDocument(safeSnapshot.jobId),
        "job-selection",
        safeSnapshot.selectedIds,
      );
      writePrivateDocument(
        jobCheckpointDocument(safeSnapshot.jobId),
        "job-checkpoints",
        safeSnapshot.checkpoints,
      );
      properties().setProperty(LATEST_JOB_KEY, safeSnapshot.jobId);
      return safeSnapshot;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function loadJob(request: {
    readonly jobId: string;
  }): PersistedTransferJob | null {
    try {
      const jobId = requireOpaqueId(request?.jobId);
      const key = jobKey(jobId);
      const manifest = readPrivateDocument<
        Omit<PersistedTransferJob, "selectedIds" | "checkpoints">
      >(jobDocument(jobId), "job-manifest");
      const selection = readPrivateDocument<
        PersistedTransferJob["selectedIds"]
      >(jobSelectionDocument(jobId), "job-selection");
      const checkpoints = readPrivateDocument<
        PersistedTransferJob["checkpoints"]
      >(jobCheckpointDocument(jobId), "job-checkpoints");
      let snapshot =
        manifest && selection && checkpoints
          ? requirePersistedJob({
              ...manifest,
              selectedIds: selection,
              checkpoints,
            })
          : null;
      if (!snapshot) {
        const stored = readChunks(key);
        if (!stored) return null;
        snapshot = requirePersistedJob(
          JSON.parse(stored) as PersistedTransferJob,
        );
        saveJob(snapshot);
        deleteChunks(key);
      }
      snapshot = requirePersistedJob(snapshot);
      if (Date.now() - new Date(snapshot.updatedAt).getTime() > JOB_TTL_MS) {
        deletePrivateDocument(jobDocument(jobId));
        deletePrivateDocument(jobSelectionDocument(jobId));
        deletePrivateDocument(jobCheckpointDocument(jobId));
        return null;
      }
      return snapshot;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function clearJob(request: { readonly jobId: string }): void {
    try {
      const jobId = requireOpaqueId(request?.jobId);
      deletePrivateDocument(jobDocument(jobId));
      deletePrivateDocument(jobSelectionDocument(jobId));
      deletePrivateDocument(jobCheckpointDocument(jobId));
      deleteChunks(jobKey(jobId));
      if (properties().getProperty(LATEST_JOB_KEY) === jobId) {
        properties().deleteProperty(LATEST_JOB_KEY);
      }
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }

  export function loadLatestJob(): PersistedTransferJob | null {
    try {
      const jobId = properties().getProperty(LATEST_JOB_KEY);
      return jobId ? loadJob({ jobId }) : null;
    } catch (error) {
      throw asSafeRuntimeError(error);
    }
  }
}
