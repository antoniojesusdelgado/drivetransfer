import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  Copy,
  DownloadSimple,
  FolderOpen,
  FolderSimple,
  MagnifyingGlass,
  Pause,
  Play,
  ShieldCheck,
  SignOut,
  Warning,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isExecutionConfirmed } from "./domain/confirmation";
import {
  createTransferJob,
  processNextBatch,
  retryFailedOperations,
  setJobStatus,
} from "./domain/executor";
import { buildTransferPlan } from "./domain/planner";
import { assessTransferPlan } from "./domain/preflight";
import { defaultTransferFilters } from "./domain/filters";
import { createJobReport, type ReportFormat } from "./domain/reports";
import { toggleSelection } from "./domain/selection";
import type {
  ConflictResolution,
  DestinationEntry,
  DuplicatePolicy,
  DriveItem,
  DriveTree,
  HistoryEntry,
  JobKind,
  OperationCheckpoint,
  StoredJobManifest,
  TransferCommand,
  TransferFilterSet,
  TransferJob,
  TransferPlan,
  TransferSchedule,
  WorkspaceView,
} from "./domain/types";
import { syntheticDestination, syntheticSourceTree } from "./demo/fixture";
import { createExecutionApiGateway } from "./integrations/drive/executionApiGateway";
import {
  createDriveIndexSession,
  processDriveIndexPage,
  type DriveIndexSession,
  type IndexedItemWithPath,
} from "./integrations/drive/indexer";
import { openFolderPicker } from "./integrations/drive/picker";
import type {
  DriveFolderSummary,
  DriveCapacitySummary,
  DriveRuntimeGateway,
  PersistedTransferJob,
  RuntimeCheckpoint,
  RuntimeTransferOperation,
  TransferFavorite,
} from "./integrations/drive/types";
import {
  googleClientConfiguration,
  isGoogleSessionValid,
  requestGoogleSession,
  revokeGoogleSession,
  type GoogleSession,
} from "./integrations/google/auth";
import { Brand } from "./ui/Brand";
import { DriveTreeView } from "./ui/DriveTreeView";
import { JobProgress } from "./ui/JobProgress";
import { LandingView } from "./ui/LandingView";
import { PlanSummary } from "./ui/PlanSummary";
import { PrivacyDataView } from "./ui/PrivacyDataView";
import { clearDriveTransferLocalData } from "./privacy";
import {
  CompletionPreferences,
  DuplicatePolicySelector,
  FavoriteRoutes,
  PreflightPanel,
  ResumeTransferBanner,
  SaveFavoriteForm,
} from "./ui/TransferEnhancements";
import {
  ConflictCenter,
  HistoryView,
  JobsCenter,
  SchedulesView,
  TransferFilters,
  type WorkspaceJobAction,
} from "./ui/WorkspaceViews";

export type AppMode = "landing" | "explore" | "google";
export type AuthState =
  "idle" | "authorizing" | "connected" | "expired" | "denied" | "error";
export type TransferPhase =
  "select" | "review" | "confirm" | "running" | "paused" | "complete";

const MAX_INDEXED_ITEMS = 25_000;
const EXECUTION_BATCH_SIZE = 10;
const GOOGLE_RESUME_KEY = "driveTransfer.resumeJob";
const EXPLORE_RESUME_KEY = "driveTransfer.exploreJob";

const syntheticFavorite: TransferFavorite = {
  id: "plan_example_favorite",
  name: "Documentos → Archivo",
  sourceFolderId: syntheticSourceTree.rootId,
  destinationFolderId: "destination-example",
  command: "copy",
  duplicatePolicy: "skip",
};

const exampleJobs: readonly StoredJobManifest[] = [
  {
    id: "job_example_active",
    name: "Documentos del equipo",
    kind: "transfer",
    command: "copy",
    status: "running",
    sourceLabel: "Documentos del equipo",
    destinationLabel: "Archivo organizado",
    createdAt: "2026-08-12T08:30:00.000Z",
    updatedAt: "2026-08-12T08:34:00.000Z",
    total: 148,
    completed: 76,
    failed: 0,
  },
  {
    id: "job_example_queue",
    name: "Material del proyecto",
    kind: "dry_run",
    command: "copy",
    status: "queued",
    sourceLabel: "Material del proyecto",
    destinationLabel: "Revisión",
    createdAt: "2026-08-12T08:35:00.000Z",
    updatedAt: "2026-08-12T08:35:00.000Z",
    total: 54,
    completed: 0,
    failed: 0,
  },
];

const exampleHistory: readonly HistoryEntry[] = [
  {
    id: "job_example_history",
    name: "Archivo mensual",
    kind: "sync",
    command: "copy",
    status: "completed",
    sourceLabel: "Documentos",
    destinationLabel: "Archivo mensual",
    createdAt: "2026-08-01T07:00:00.000Z",
    updatedAt: "2026-08-01T07:04:00.000Z",
    finishedAt: "2026-08-01T07:04:00.000Z",
    total: 96,
    completed: 96,
    failed: 0,
    reportAvailable: true,
  },
];

function waitBetweenBatches(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 240));
}

function userFacingError(error: unknown): string {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const messages: Record<string, string> = {
    GOOGLE_AUTH_CANCELLED: "Has cerrado Google antes de terminar.",
    GOOGLE_AUTH_DENIED: "Google no ha concedido acceso a tus archivos.",
    GOOGLE_AUTH_UNAVAILABLE:
      "No hemos podido abrir Google. Inténtalo de nuevo.",
    GOOGLE_SESSION_EXPIRED:
      "La conexión con Google ha caducado. Vuelve a conectar.",
    DRIVE_RATE_LIMITED:
      "Google necesita un momento. Puedes continuar en unos segundos.",
    DRIVE_PERMISSION_DENIED: "No tienes permiso para completar esta acción.",
    DRIVE_NOT_FOUND: "La carpeta ya no está disponible.",
    DRIVE_INCOMPLETE_SEARCH:
      "Google no ha podido mostrar todo el contenido. No se hará ningún cambio.",
  };
  return (
    messages[code] ??
    "Algo no ha salido bien. Tus archivos no se han modificado."
  );
}

function folderLabel(folder: DriveFolderSummary | null): string {
  if (!folder) return "Ninguna carpeta elegida";
  return folder.space === "shared_drive" ? "Unidad compartida" : "Mi unidad";
}

async function indexFolder(
  root: DriveFolderSummary,
  gateway: DriveRuntimeGateway,
  onProgress: (count: number) => void,
): Promise<DriveIndexSession> {
  let session = createDriveIndexSession(root);
  while (session.pending.length > 0) {
    session = await processDriveIndexPage(session, gateway);
    if (session.items.length > MAX_INDEXED_ITEMS) {
      throw new Error("DRIVE_INDEX_LIMIT_REACHED");
    }
    onProgress(session.items.length);
  }
  return session;
}

function indexedTree(
  root: DriveFolderSummary,
  items: readonly IndexedItemWithPath[],
): DriveTree {
  const rootItem: DriveItem = {
    id: root.id,
    parentId: null,
    name: root.name,
    kind: "folder",
    mimeType: "application/vnd.google-apps.folder",
    relativePath: "",
    space: root.space,
    capabilities: root.capabilities,
  };
  return {
    rootId: root.id,
    items: [
      rootItem,
      ...items
        .filter((item) => item.kind !== "shortcut")
        .map<DriveItem>((item) => ({
          id: item.id,
          parentId: item.parentId,
          name: item.name,
          kind: item.kind === "folder" ? "folder" : "file",
          mimeType: item.mimeType,
          size: item.size,
          modifiedTime: item.modifiedTime,
          md5Checksum: item.md5Checksum,
          relativePath: item.relativePath,
          space: item.space,
          capabilities: item.capabilities,
        })),
    ],
  };
}

function destinationEntries(
  items: readonly IndexedItemWithPath[],
): readonly DestinationEntry[] {
  return items
    .filter((item) => item.kind !== "shortcut")
    .map((item) => ({
      name: item.name,
      relativePath: item.relativePath,
      kind: item.kind === "folder" ? "folder" : "file",
      mimeType: item.mimeType,
      size: item.size,
      modifiedTime: item.modifiedTime,
      md5Checksum: item.md5Checksum,
    }));
}

function initialJob(plan: TransferPlan): TransferJob {
  const checkpoints: Record<string, OperationCheckpoint> = {};
  for (const operation of plan.operations) {
    if (operation.decision === "skip_duplicate") {
      checkpoints[operation.operationKey] = {
        operationKey: operation.operationKey,
        result: "skipped_duplicate",
        attempts: 0,
      };
    } else if (operation.decision === "reuse_folder") {
      checkpoints[operation.operationKey] = {
        operationKey: operation.operationKey,
        result: "reused_folder",
        attempts: 0,
      };
    } else if (operation.decision === "blocked") {
      checkpoints[operation.operationKey] = {
        operationKey: operation.operationKey,
        result: "failed_terminal",
        attempts: 0,
        errorCode: "permission_denied",
      };
    }
  }
  return { ...createTransferJob(plan), status: "running", checkpoints };
}

function runtimeCheckpoint(checkpoint: RuntimeCheckpoint): OperationCheckpoint {
  return {
    operationKey: checkpoint.operationKey,
    result: checkpoint.result,
    attempts: checkpoint.attempts,
    errorCode:
      checkpoint.errorCode === "temporary_unavailable"
        ? "temporary_unavailable"
        : checkpoint.errorCode
          ? "permission_denied"
          : undefined,
  };
}

function finalJobStatus(job: TransferJob): TransferJob["status"] {
  return Object.values(job.checkpoints).some(
    ({ result }) => result === "failed_terminal",
  )
    ? "completed_with_errors"
    : "completed";
}

function transferOperation(
  item: DriveItem,
  operationKey: string,
  targetName?: string,
): RuntimeTransferOperation {
  return {
    operationKey,
    sourceId: item.id,
    sourceParentId: item.parentId ?? undefined,
    relativePath: item.relativePath,
    name: item.name,
    kind: item.kind,
    mimeType: item.mimeType,
    size: item.size,
    sourceSpace: item.space,
    targetName,
  };
}

export default function App() {
  const configuration = useMemo(() => googleClientConfiguration(), []);
  const [mode, setMode] = useState<AppMode>("landing");
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [gateway, setGateway] = useState<DriveRuntimeGateway | null>(null);
  const [phase, setPhase] = useState<TransferPhase>("select");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("transfer");
  const [sourceFolder, setSourceFolder] = useState<DriveFolderSummary | null>(
    null,
  );
  const [destinationFolder, setDestinationFolder] =
    useState<DriveFolderSummary | null>(null);
  const [tree, setTree] = useState<DriveTree>(syntheticSourceTree);
  const [destination, setDestination] =
    useState<readonly DestinationEntry[]>(syntheticDestination);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [command, setCommand] = useState<TransferCommand>("copy");
  const [duplicatePolicy, setDuplicatePolicy] =
    useState<DuplicatePolicy>("skip");
  const [jobKind, setJobKind] = useState<JobKind>("transfer");
  const [filters, setFilters] = useState<TransferFilterSet>(
    defaultTransferFilters,
  );
  const [resolutions, setResolutions] = useState<readonly ConflictResolution[]>(
    [],
  );
  const [workspaceJobs, setWorkspaceJobs] = useState<
    readonly StoredJobManifest[]
  >([]);
  const [schedules, setSchedules] = useState<readonly TransferSchedule[]>([]);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [plan, setPlan] = useState<TransferPlan | null>(null);
  const [job, setJob] = useState<TransferJob | null>(null);
  const [moveConfirmed, setMoveConfirmed] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [capacity, setCapacity] = useState<DriveCapacitySummary | null>(null);
  const [preparedCount, setPreparedCount] = useState(0);
  const [favorites, setFavorites] = useState<readonly TransferFavorite[]>([]);
  const [resumeSnapshot, setResumeSnapshot] =
    useState<PersistedTransferJob | null>(null);
  const [notifyOnComplete, setNotifyOnComplete] = useState(false);
  const notificationSent = useRef(false);
  const recordedJobId = useRef<string | null>(null);
  const pauseRequested = useRef(false);
  const cancelRequested = useRef(false);

  const selectedCount = selectedIds.size;
  const filesReady =
    mode === "explore" ||
    (sourceFolder !== null && tree.rootId === sourceFolder.id);
  const preflight = useMemo(
    () => (plan ? assessTransferPlan(plan, capacity ?? undefined) : null),
    [capacity, plan],
  );
  const canExecute =
    plan !== null &&
    preflight?.canProceed === true &&
    isExecutionConfirmed(plan.command, moveConfirmed);
  const hasFailedJob =
    job !== null &&
    Object.values(job.checkpoints).some(
      ({ result }) =>
        result === "failed_retryable" || result === "failed_terminal",
    );

  const updateNotificationPreference = async (value: boolean) => {
    if (!value) {
      setNotifyOnComplete(false);
      return;
    }
    if (!("Notification" in window)) {
      setError("Este navegador no permite avisos al terminar.");
      return;
    }
    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") {
      setError("Los avisos están desactivados en el navegador.");
      return;
    }
    setNotifyOnComplete(true);
  };

  useEffect(() => {
    if (mode !== "explore" || job?.status !== "running") return;
    const timer = window.setTimeout(() => {
      setJob((current) => {
        if (!current) return current;
        const next = processNextBatch(current);
        if (
          next.status === "completed" ||
          next.status === "completed_with_errors"
        ) {
          setPhase("complete");
        } else if (next.status === "paused_retryable") {
          setPhase("paused");
        }
        return next;
      });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [job, mode]);

  useEffect(() => {
    if (mode !== "explore") return;
    if (
      !job ||
      job.status === "completed" ||
      job.status === "completed_with_errors"
    ) {
      window.localStorage.removeItem(EXPLORE_RESUME_KEY);
      return;
    }
    window.localStorage.setItem(
      EXPLORE_RESUME_KEY,
      JSON.stringify({ version: 1, job, phase, duplicatePolicy }),
    );
  }, [duplicatePolicy, job, mode, phase]);

  useEffect(() => {
    if (
      phase !== "complete" ||
      !job ||
      !notifyOnComplete ||
      notificationSent.current
    )
      return;
    notificationSent.current = true;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("DriveTransfer", {
        body:
          job.status === "completed_with_errors"
            ? "La transferencia terminó con elementos que necesitan atención."
            : "La transferencia ha terminado.",
      });
    }
  }, [job, notifyOnComplete, phase]);

  useEffect(() => {
    if (phase !== "complete" || !job || recordedJobId.current === job.id)
      return;
    recordedJobId.current = job.id;
    const checkpoints = Object.values(job.checkpoints);
    const failed = checkpoints.filter(({ result }) =>
      ["failed_retryable", "failed_terminal"].includes(result),
    ).length;
    const now = new Date().toISOString();
    const manifest: StoredJobManifest = {
      id: job.id,
      name:
        jobKind === "dry_run"
          ? "Comprobación de transferencia"
          : command === "copy"
            ? "Copia de archivos"
            : "Traslado de archivos",
      kind: jobKind,
      command,
      status: job.status === "cancelled" ? "cancelled" : "completed",
      sourceLabel: sourceFolder?.name ?? "Origen",
      destinationLabel: destinationFolder?.name ?? "Destino",
      createdAt: job.plan.createdAt,
      updatedAt: now,
      total: job.plan.operations.length,
      completed: Math.max(0, checkpoints.length - failed),
      failed,
    };
    const entry: HistoryEntry = {
      ...manifest,
      finishedAt: now,
      reportAvailable: true,
    };
    setWorkspaceJobs((current) => [
      manifest,
      ...current.filter((item) => item.id !== manifest.id),
    ]);
    setHistory((current) => [
      entry,
      ...current.filter((item) => item.id !== entry.id),
    ]);
    if (mode === "google" && gateway) {
      void gateway.saveWorkspaceJob(manifest).catch((saveError) => {
        setError(userFacingError(saveError));
      });
    }
  }, [
    command,
    destinationFolder?.name,
    gateway,
    job,
    jobKind,
    mode,
    phase,
    sourceFolder?.name,
  ]);

  const resetTransfer = () => {
    setSelectedIds(new Set());
    setCommand("copy");
    setDuplicatePolicy("skip");
    setJobKind("transfer");
    setFilters(defaultTransferFilters);
    setResolutions([]);
    setPlan(null);
    setJob(null);
    setMoveConfirmed(false);
    setQuery("");
    setError(null);
    setCapacity(null);
    setNotifyOnComplete(false);
    notificationSent.current = false;
    recordedJobId.current = null;
    setPhase("select");
    setWorkspaceView("transfer");
  };

  const enterExplore = () => {
    setMode("explore");
    setTree(syntheticSourceTree);
    setDestination(syntheticDestination);
    setSourceFolder({
      id: syntheticSourceTree.rootId,
      name: "Documentos del equipo",
      space: "my_drive",
      capabilities: {
        canRead: true,
        canCopy: true,
        canMove: true,
        canAddChildren: true,
      },
    });
    setDestinationFolder({
      id: "destination-example",
      name: "Archivo organizado",
      space: "shared_drive",
      capabilities: {
        canRead: true,
        canCopy: true,
        canMove: true,
        canAddChildren: true,
      },
    });
    setFavorites([syntheticFavorite]);
    setWorkspaceJobs(exampleJobs);
    setHistory(exampleHistory);
    setSchedules([]);
    resetTransfer();
    const stored = window.localStorage.getItem(EXPLORE_RESUME_KEY);
    if (stored) {
      try {
        const restored = JSON.parse(stored) as {
          readonly version?: number;
          readonly job: TransferJob;
          readonly phase: TransferPhase;
          readonly duplicatePolicy?: DuplicatePolicy;
        };
        if (restored.version !== 1 || !restored.job?.plan) {
          throw new Error("INVALID_EXPLORE_STATE");
        }
        setJob(restored.job);
        setPlan(restored.job.plan);
        setDuplicatePolicy(restored.duplicatePolicy ?? "skip");
        setPhase(restored.phase === "running" ? "paused" : restored.phase);
      } catch {
        window.localStorage.removeItem(EXPLORE_RESUME_KEY);
      }
    }
  };

  const connectGoogle = async () => {
    if (!configuration) {
      setError(
        "La conexión con Google aún no está configurada. Puedes explorar la herramienta mientras tanto.",
      );
      return;
    }
    setAuthState("authorizing");
    setError(null);
    try {
      const nextSession = await requestGoogleSession(configuration.clientId);
      const nextGateway = createExecutionApiGateway({
        accessToken: nextSession.accessToken,
        deploymentId: configuration.appsScriptDeploymentId,
      });
      setSession(nextSession);
      setGateway(nextGateway);
      setAuthState("connected");
      setMode("google");
      resetTransfer();
      const [savedFavorites, savedJob, savedWorkspace] = await Promise.all([
        nextGateway.listFavorites(),
        (async () => {
          const jobId = window.localStorage.getItem(GOOGLE_RESUME_KEY);
          return jobId
            ? nextGateway.loadJob(jobId)
            : nextGateway.loadLatestJob();
        })(),
        nextGateway.loadWorkspace(),
      ]);
      setFavorites(savedFavorites);
      setResumeSnapshot(savedJob);
      setWorkspaceJobs(savedWorkspace.jobs);
      setSchedules(savedWorkspace.schedules as readonly TransferSchedule[]);
      setHistory(savedWorkspace.history as readonly HistoryEntry[]);
      if (!savedJob) window.localStorage.removeItem(GOOGLE_RESUME_KEY);
    } catch (connectionError) {
      setAuthState("denied");
      setError(userFacingError(connectionError));
    }
  };

  const disconnect = () => {
    if (session) revokeGoogleSession(session);
    setSession(null);
    setGateway(null);
    setAuthState("idle");
    setSourceFolder(null);
    setDestinationFolder(null);
    setMode("landing");
    setFavorites([]);
    setResumeSnapshot(null);
    setWorkspaceJobs([]);
    setSchedules([]);
    setHistory([]);
    resetTransfer();
  };

  const chooseFolder = async (target: "source" | "destination") => {
    if (!configuration || !session || !gateway) return;
    if (!isGoogleSessionValid(session)) {
      setAuthState("expired");
      setError(userFacingError(new Error("GOOGLE_SESSION_EXPIRED")));
      return;
    }
    setError(null);
    try {
      const selection = await openFolderPicker({
        accessToken: session.accessToken,
        apiKey: configuration.apiKey,
        appId: configuration.appId,
      });
      if (!selection) return;
      const folder = await gateway.inspectFolder(selection.id);
      const other = target === "source" ? destinationFolder : sourceFolder;
      if (other?.id === folder.id) {
        setError("Elige dos carpetas diferentes para continuar.");
        return;
      }
      if (target === "source") setSourceFolder(folder);
      else setDestinationFolder(folder);
      setTree(syntheticSourceTree);
      setSelectedIds(new Set());
    } catch (selectionError) {
      setError(userFacingError(selectionError));
    }
  };

  const prepareGoogleFolders = async () => {
    if (!sourceFolder || !destinationFolder || !gateway) return;
    setPreparing(true);
    setPreparedCount(0);
    setError(null);
    try {
      const sourceSession = await indexFolder(
        sourceFolder,
        gateway,
        setPreparedCount,
      );
      const destinationSession = await indexFolder(
        destinationFolder,
        gateway,
        setPreparedCount,
      );
      setTree(indexedTree(sourceFolder, sourceSession.items));
      setDestination(destinationEntries(destinationSession.items));
    } catch (prepareError) {
      setError(userFacingError(prepareError));
    } finally {
      setPreparing(false);
    }
  };

  const handleToggle = (itemId: string, selected: boolean) => {
    setSelectedIds((current) =>
      toggleSelection(tree, current, itemId, selected),
    );
    setPlan(null);
  };

  const selectAll = () => {
    setSelectedIds(
      new Set(
        tree.items.filter(({ id }) => id !== tree.rootId).map(({ id }) => id),
      ),
    );
  };

  const reviewTransfer = async () => {
    if (!destinationFolder) return;
    const nextPlan = buildTransferPlan({
      tree,
      selectedIds,
      destination,
      destinationSpace: destinationFolder.space,
      command,
      duplicatePolicy,
      kind: jobKind,
      filters,
      resolutions,
    });
    if (mode === "explore") {
      setCapacity({
        limit: 100 * 1024 ** 3,
        usage: 28 * 1024 ** 3,
        remaining: 72 * 1024 ** 3,
      });
    } else if (gateway) {
      try {
        setCapacity(await gateway.inspectCapacity());
      } catch {
        setCapacity(null);
      }
    }
    setPlan(nextPlan);
    setPhase("review");
  };

  const saveFavorite = async (name: string) => {
    if (!sourceFolder || !destinationFolder) return;
    const favorite: TransferFavorite = {
      id: `plan_favorite_${Date.now().toString(36)}`,
      name,
      sourceFolderId: sourceFolder.id,
      destinationFolderId: destinationFolder.id,
      command,
      duplicatePolicy,
    };
    if (mode === "google" && gateway) {
      const saved = await gateway.saveFavorite(favorite);
      setFavorites((current) => [
        saved,
        ...current.filter(({ id }) => id !== saved.id),
      ]);
    } else {
      setFavorites((current) => [
        favorite,
        ...current.filter(({ id }) => id !== favorite.id),
      ]);
    }
  };

  const applyFavorite = async (favorite: TransferFavorite) => {
    setCommand(favorite.command);
    setDuplicatePolicy(favorite.duplicatePolicy);
    setPlan(null);
    setSelectedIds(new Set());
    if (mode !== "google" || !gateway) return;
    setPreparing(true);
    setError(null);
    try {
      const [source, target] = await Promise.all([
        gateway.inspectFolder(favorite.sourceFolderId),
        gateway.inspectFolder(favorite.destinationFolderId),
      ]);
      setSourceFolder(source);
      setDestinationFolder(target);
      setTree(syntheticSourceTree);
    } catch (favoriteError) {
      setError(userFacingError(favoriteError));
    } finally {
      setPreparing(false);
    }
  };

  const deleteFavorite = async (favorite: TransferFavorite) => {
    if (mode === "google" && gateway) await gateway.deleteFavorite(favorite.id);
    setFavorites((current) => current.filter(({ id }) => id !== favorite.id));
  };

  const persistedSnapshot = (current: TransferJob): PersistedTransferJob => ({
    jobId: current.id,
    sourceFolderId: sourceFolder?.id ?? "",
    destinationFolderId: destinationFolder?.id ?? "",
    command: current.plan.command,
    duplicatePolicy: current.plan.duplicatePolicy,
    selectedIds: [...selectedIds],
    checkpoints: Object.values(current.checkpoints).map((checkpoint) => ({
      operationKey: checkpoint.operationKey,
      result:
        checkpoint.result === "pending"
          ? "failed_retryable"
          : checkpoint.result,
      attempts: checkpoint.attempts,
      errorCode: checkpoint.errorCode,
    })),
    updatedAt: new Date().toISOString(),
  });

  const saveResumableJob = async (current: TransferJob) => {
    if (mode !== "google" || !gateway || !sourceFolder || !destinationFolder)
      return;
    const saved = await gateway.saveJob(persistedSnapshot(current));
    window.localStorage.setItem(GOOGLE_RESUME_KEY, saved.jobId);
    setResumeSnapshot(saved);
  };

  const clearResumableJob = async (jobId: string) => {
    window.localStorage.removeItem(GOOGLE_RESUME_KEY);
    setResumeSnapshot(null);
    if (mode === "google" && gateway) await gateway.clearJob(jobId);
  };

  const restoreResumableJob = async () => {
    if (!resumeSnapshot || !gateway) return;
    setPreparing(true);
    setError(null);
    try {
      const [source, target] = await Promise.all([
        gateway.inspectFolder(resumeSnapshot.sourceFolderId),
        gateway.inspectFolder(resumeSnapshot.destinationFolderId),
      ]);
      const [sourceIndex, targetIndex] = await Promise.all([
        indexFolder(source, gateway, setPreparedCount),
        indexFolder(target, gateway, setPreparedCount),
      ]);
      const restoredTree = indexedTree(source, sourceIndex.items);
      const restoredPlan = buildTransferPlan({
        tree: restoredTree,
        selectedIds: new Set(resumeSnapshot.selectedIds),
        destination: destinationEntries(targetIndex.items),
        destinationSpace: target.space,
        command: resumeSnapshot.command,
        duplicatePolicy: resumeSnapshot.duplicatePolicy,
      });
      const checkpoints = Object.fromEntries(
        resumeSnapshot.checkpoints.map((checkpoint) => [
          checkpoint.operationKey,
          runtimeCheckpoint(checkpoint),
        ]),
      );
      setSourceFolder(source);
      setDestinationFolder(target);
      setTree(restoredTree);
      setDestination(destinationEntries(targetIndex.items));
      setSelectedIds(new Set(resumeSnapshot.selectedIds));
      setCommand(resumeSnapshot.command);
      setDuplicatePolicy(resumeSnapshot.duplicatePolicy);
      setPlan(restoredPlan);
      setJob({
        ...createTransferJob(restoredPlan),
        id: resumeSnapshot.jobId,
        status: "paused",
        checkpoints,
      });
      setMoveConfirmed(false);
      setPhase(resumeSnapshot.command === "move" ? "confirm" : "paused");
    } catch (restoreError) {
      setError(userFacingError(restoreError));
    } finally {
      setPreparing(false);
    }
  };

  const discardResumableJob = () => {
    if (!resumeSnapshot) return;
    void clearResumableJob(resumeSnapshot.jobId);
  };

  const executeRealTransfer = async (resumeJob?: TransferJob) => {
    if (!plan || !gateway || !destinationFolder || !sourceFolder) return;
    pauseRequested.current = false;
    cancelRequested.current = false;
    setPhase("running");
    setError(null);
    let current = resumeJob ?? initialJob(plan);
    setJob(current);

    const completed = new Set(
      Object.values(current.checkpoints)
        .filter(({ result }) =>
          ["copied", "moved", "reused_folder", "skipped_duplicate"].includes(
            result,
          ),
        )
        .map(({ operationKey }) => operationKey),
    );
    const pending = plan.operations
      .filter(
        (operation) =>
          (operation.decision === "transfer" ||
            operation.decision === "rename_duplicate") &&
          !completed.has(operation.operationKey),
      )
      .sort((left, right) => {
        const depthDifference =
          right.item.relativePath.split("/").length -
          left.item.relativePath.split("/").length;
        return command === "move" ? depthDifference : -depthDifference;
      });

    try {
      await saveResumableJob(current);
      for (
        let offset = 0;
        offset < pending.length;
        offset += EXECUTION_BATCH_SIZE
      ) {
        if (cancelRequested.current) {
          current = setJobStatus(current, "cancelled");
          setJob(current);
          setPhase("complete");
          await clearResumableJob(current.id);
          return;
        }
        if (pauseRequested.current) {
          current = setJobStatus(current, "paused");
          setJob(current);
          setPhase("paused");
          await saveResumableJob(current);
          return;
        }
        const batch = pending.slice(offset, offset + EXECUTION_BATCH_SIZE);
        const response = await gateway.executeBatch({
          jobId: current.id,
          command,
          sourceRootId: sourceFolder.id,
          destinationFolderId: destinationFolder.id,
          destinationSpace: destinationFolder.space,
          moveConfirmed,
          operations: batch.map((operation) =>
            transferOperation(
              operation.item,
              operation.operationKey,
              operation.targetName,
            ),
          ),
        });
        const checkpoints = { ...current.checkpoints };
        for (const checkpoint of response.checkpoints) {
          checkpoints[checkpoint.operationKey] = runtimeCheckpoint(checkpoint);
        }
        current = {
          ...current,
          checkpoints,
          status: response.paused ? "paused_retryable" : "running",
        };
        setJob(current);
        await saveResumableJob(current);
        if (cancelRequested.current) {
          current = setJobStatus(current, "cancelled");
          setJob(current);
          setPhase("complete");
          await clearResumableJob(current.id);
          return;
        }
        if (response.paused) {
          setPhase("paused");
          return;
        }
        await waitBetweenBatches();
      }

      const successfulKeys = Object.values(current.checkpoints)
        .filter(({ result }) => result === "copied" || result === "moved")
        .map(({ operationKey }) => operationKey);
      if (successfulKeys.length > 0) {
        const verification = await gateway.verifyBatch({
          destinationFolderId: destinationFolder.id,
          operationKeys: successfulKeys,
        });
        const verified = new Set(verification.verifiedOperationKeys);
        const checkpoints = { ...current.checkpoints };
        for (const operationKey of successfulKeys) {
          if (!verified.has(operationKey)) {
            checkpoints[operationKey] = {
              operationKey,
              result: "failed_terminal",
              attempts: checkpoints[operationKey]?.attempts ?? 1,
              errorCode: "permission_denied",
            };
          }
        }
        current = { ...current, checkpoints };
      }
      current = { ...current, status: finalJobStatus(current) };
      setJob(current);
      setPhase("complete");
      await clearResumableJob(current.id);
    } catch (executionError) {
      current = setJobStatus(current, "paused_retryable");
      setJob(current);
      try {
        await saveResumableJob(current);
      } catch {
        // The opaque browser reference remains unchanged if persistence is unavailable.
      }
      setError(userFacingError(executionError));
      setPhase("paused");
    }
  };

  const startExecution = () => {
    if (!canExecute || !plan) return;
    if (jobKind === "dry_run") {
      const checked = initialJob(plan);
      const checkpoints = Object.fromEntries(
        plan.operations.map((operation) => [
          operation.operationKey,
          {
            operationKey: operation.operationKey,
            result:
              operation.decision === "blocked"
                ? ("failed_terminal" as const)
                : operation.decision === "skip_duplicate"
                  ? ("skipped_duplicate" as const)
                  : operation.decision === "reuse_folder"
                    ? ("reused_folder" as const)
                    : ("copied" as const),
            attempts: 0,
          },
        ]),
      );
      setJob({ ...checked, status: "completed", checkpoints });
      setPhase("complete");
      return;
    }
    if (mode === "explore") {
      setJob(setJobStatus(createTransferJob(plan), "running"));
      setPhase("running");
    } else {
      void executeRealTransfer(job?.status === "paused" ? job : undefined);
    }
  };

  const pauseExecution = () => {
    pauseRequested.current = true;
    if (mode === "explore") {
      setJob((current) =>
        current ? setJobStatus(current, "paused") : current,
      );
      setPhase("paused");
    }
  };

  const cancelExecution = () => {
    cancelRequested.current = true;
    setJob((current) =>
      current ? setJobStatus(current, "cancelled") : current,
    );
    setPhase("complete");
    if (job && mode === "google") void clearResumableJob(job.id);
  };

  const resumeExecution = () => {
    if (!job) return;
    if (mode === "explore") {
      setJob(setJobStatus(job, "running"));
      setPhase("running");
    } else {
      void executeRealTransfer(setJobStatus(job, "running"));
    }
  };

  const retryFailed = () => {
    if (!job) return;
    const retryJob = retryFailedOperations(job);
    notificationSent.current = false;
    if (mode === "explore") {
      setJob(retryJob);
      setPhase("running");
    } else {
      void executeRealTransfer(retryJob);
    }
  };

  const downloadReport = () => {
    if (!job) return;
    const results = Object.values(job.checkpoints).reduce<
      Record<string, number>
    >((counts, checkpoint) => {
      counts[checkpoint.result] = (counts[checkpoint.result] ?? 0) + 1;
      return counts;
    }, {});
    const report = JSON.stringify(
      {
        product: "DriveTransfer",
        operation: job.plan.command,
        finishedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([report], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "drive-transfer-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadWorkspaceReport = (
    item: StoredJobManifest | HistoryEntry,
    format: ReportFormat,
  ) => {
    const report = createJobReport(item, format);
    const url = URL.createObjectURL(
      new Blob([report.content], { type: report.mimeType }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "drive-transfer-report." + report.extension;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAccountData = async () => {
    if (!gateway) return;
    try {
      const data = await gateway.exportAccountData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "drive-transfer-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(userFacingError(exportError));
    }
  };

  const deleteAccountData = async () => {
    if (!gateway) throw new Error("GOOGLE_SESSION_EXPIRED");
    const summary = await gateway.deleteAccountData();
    if (!summary.verified) throw new Error("DRIVE_REQUEST_FAILED");
    clearDriveTransferLocalData();
    if (session) revokeGoogleSession(session);
    setSession(null);
    setGateway(null);
    setMode("landing");
    resetTransfer();
    return summary;
  };

  const controlJob = (
    selected: StoredJobManifest,
    action: WorkspaceJobAction,
  ) => {
    if (mode === "google" && gateway) {
      void gateway
        .controlWorkspaceJob(selected.id, action)
        .then((snapshot) => {
          setWorkspaceJobs(snapshot.jobs);
          setHistory(snapshot.history as readonly HistoryEntry[]);
        })
        .catch((actionError) => setError(userFacingError(actionError)));
      return;
    }
    const now = new Date().toISOString();
    setWorkspaceJobs((current) => {
      if (action === "repeat") {
        const hasRunning = current.some((item) => item.status === "running");
        return [
          ...current,
          {
            ...selected,
            id: "job_repeat_" + Date.now().toString(36),
            status: hasRunning ? "queued" : "running",
            completed: 0,
            failed: 0,
            createdAt: now,
            updatedAt: now,
          },
        ];
      }
      return current.map((item) => {
        if (item.id !== selected.id) return item;
        const status =
          action === "pause"
            ? "paused"
            : action === "cancel"
              ? "cancelled"
              : "running";
        return {
          ...item,
          status,
          failed: action.startsWith("retry_") ? 0 : item.failed,
          updatedAt: now,
        };
      });
    });
  };

  const saveSchedule = (schedule: TransferSchedule) => {
    if (schedule.kind === "transfer" && command === "move") {
      setError("Los traslados se confirman en el momento y no se programan.");
      return;
    }
    setSchedules((current) => [
      schedule,
      ...current.filter((item) => item.id !== schedule.id),
    ]);
    if (mode === "google" && gateway) {
      void gateway.saveSchedule(schedule).catch((scheduleError) => {
        setError(userFacingError(scheduleError));
      });
    }
  };

  const toggleSchedule = (schedule: TransferSchedule) =>
    saveSchedule({
      ...schedule,
      enabled: !schedule.enabled,
      updatedAt: new Date().toISOString(),
    });

  const runSchedule = (schedule: TransferSchedule) => {
    if (mode === "google" && gateway) {
      void gateway
        .runScheduleNow(schedule.id)
        .then((snapshot) => setWorkspaceJobs(snapshot.jobs))
        .catch((scheduleError) => setError(userFacingError(scheduleError)));
      return;
    }
    const now = new Date().toISOString();
    setWorkspaceJobs((current) => [
      ...current,
      {
        id: "job_schedule_" + Date.now().toString(36),
        name: schedule.name,
        kind: schedule.kind === "sync" ? "sync" : "transfer",
        command: "copy",
        status: current.some((item) => item.status === "running")
          ? "queued"
          : "running",
        sourceLabel: "Origen programado",
        destinationLabel: "Destino programado",
        createdAt: now,
        updatedAt: now,
        total: 0,
        completed: 0,
        failed: 0,
        scheduleId: schedule.id,
      },
    ]);
    setWorkspaceView("jobs");
  };

  const deleteSchedule = (schedule: TransferSchedule) => {
    setSchedules((current) =>
      current.filter((item) => item.id !== schedule.id),
    );
    if (mode === "google" && gateway)
      void gateway.deleteSchedule(schedule.id).catch((scheduleError) => {
        setError(userFacingError(scheduleError));
      });
  };

  if (mode === "landing") {
    return (
      <LandingView
        connecting={authState === "authorizing"}
        error={error}
        onConnect={() => void connectGoogle()}
        onExplore={enterExplore}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button
          className="brand-button"
          onClick={disconnect}
          aria-label="Volver al inicio"
        >
          <Brand compact />
        </button>
        <nav className="workspace-nav" aria-label="Secciones">
          {[
            ["transfer", "Transferir"],
            ["jobs", "Centro"],
            ["schedules", "Programaciones"],
            ["history", "Historial"],
            ["privacy", "Privacidad"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={workspaceView === value ? "is-active" : ""}
              aria-current={workspaceView === value ? "page" : undefined}
              onClick={() => setWorkspaceView(value as WorkspaceView)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="app-header__actions">
          <span className="mode-pill">
            {mode === "explore" ? "Modo exploración" : "Google conectado"}
          </span>
          <button className="icon-text-button" onClick={disconnect}>
            <SignOut aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      <div className="app-layout">
        {workspaceView === "transfer" ? (
          <nav className="stepper" aria-label="Progreso de la transferencia">
            {[
              ["select", "Elige"],
              ["review", "Revisa"],
              ["running", "Transfiere"],
            ].map(([step, label], index) => {
              const order: TransferPhase[] = [
                "select",
                "review",
                "confirm",
                "running",
                "paused",
                "complete",
              ];
              const currentIndex = order.indexOf(phase);
              const stepIndex =
                step === "select" ? 0 : step === "review" ? 1 : 3;
              return (
                <div
                  className={
                    currentIndex >= stepIndex
                      ? "stepper__item stepper__item--active"
                      : "stepper__item"
                  }
                  key={step}
                >
                  <span>
                    {currentIndex > stepIndex ? (
                      <Check weight="bold" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <strong>{label}</strong>
                </div>
              );
            })}
          </nav>
        ) : null}

        {error ? (
          <div className="app-alert" role="alert">
            <Warning size={21} weight="fill" aria-hidden="true" />
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar aviso">
              <X />
            </button>
          </div>
        ) : null}

        {workspaceView === "jobs" ? (
          <JobsCenter
            jobs={workspaceJobs}
            onAction={controlJob}
            onDownload={downloadWorkspaceReport}
          />
        ) : null}

        {workspaceView === "schedules" ? (
          <SchedulesView
            schedules={schedules}
            onSave={saveSchedule}
            onToggle={toggleSchedule}
            onRun={runSchedule}
            onDelete={deleteSchedule}
            sourceFolderId={sourceFolder?.id}
            destinationFolderId={destinationFolder?.id}
          />
        ) : null}

        {workspaceView === "history" ? (
          <HistoryView history={history} onDownload={downloadWorkspaceReport} />
        ) : null}

        {workspaceView === "privacy" ? (
          <PrivacyDataView
            connected={mode === "google" && gateway !== null}
            onExport={exportAccountData}
            onDelete={deleteAccountData}
          />
        ) : null}

        {workspaceView === "transfer" && phase === "select" ? (
          <section
            className="flow-view flow-view--select"
            aria-labelledby="select-title"
          >
            {resumeSnapshot ? (
              <ResumeTransferBanner
                snapshot={resumeSnapshot}
                onResume={() => void restoreResumableJob()}
                onDiscard={discardResumableJob}
              />
            ) : null}
            <div className="flow-heading">
              <p>Paso 1</p>
              <h1 id="select-title">Elige qué quieres transferir</h1>
              <span>
                Selecciona el origen, el destino y los archivos que quieres
                incluir.
              </span>
            </div>

            <FavoriteRoutes
              favorites={favorites}
              onApply={(favorite) => void applyFavorite(favorite)}
              onDelete={(favorite) => void deleteFavorite(favorite)}
            />

            <div className="folder-route">
              <FolderCard
                label="Origen"
                folder={sourceFolder}
                disabled={mode === "explore" || preparing}
                onChoose={() => void chooseFolder("source")}
              />
              <ArrowRight size={28} aria-hidden="true" />
              <FolderCard
                label="Destino"
                folder={destinationFolder}
                disabled={mode === "explore" || preparing}
                onChoose={() => void chooseFolder("destination")}
              />
            </div>

            {mode === "google" &&
            sourceFolder &&
            destinationFolder &&
            tree.rootId !== sourceFolder.id ? (
              <button
                className="primary-button prepare-button"
                onClick={() => void prepareGoogleFolders()}
                disabled={preparing}
              >
                {preparing
                  ? `Preparando tus archivos · ${preparedCount}`
                  : "Mostrar archivos"}
              </button>
            ) : null}

            {filesReady ? (
              <div className="selection-grid">
                <section
                  className="surface file-selection"
                  aria-labelledby="files-title"
                >
                  <div className="surface__header">
                    <div>
                      <p>Contenido</p>
                      <h2 id="files-title">Archivos y carpetas</h2>
                    </div>
                    <span className="selection-pill">
                      {selectedCount} elegidos
                    </span>
                  </div>
                  <div className="selection-toolbar">
                    <label className="search-field">
                      <MagnifyingGlass aria-hidden="true" />
                      <span className="sr-only">Buscar archivos</span>
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar en esta carpeta"
                      />
                    </label>
                    <button className="text-button" onClick={selectAll}>
                      Elegir todo
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Quitar selección
                    </button>
                  </div>
                  <DriveTreeView
                    tree={tree}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    query={query}
                  />
                </section>

                <aside
                  className="surface transfer-settings"
                  aria-labelledby="settings-title"
                >
                  <div>
                    <p>Acción</p>
                    <h2 id="settings-title">¿Qué quieres hacer?</h2>
                  </div>
                  <div
                    className="command-switch"
                    role="radiogroup"
                    aria-label="Tipo de transferencia"
                  >
                    <button
                      className={
                        command === "copy"
                          ? "command-option command-option--active"
                          : "command-option"
                      }
                      role="radio"
                      aria-checked={command === "copy"}
                      onClick={() => {
                        setCommand("copy");
                        setMoveConfirmed(false);
                      }}
                    >
                      <Copy size={24} aria-hidden="true" />
                      <span>
                        <strong>Copiar</strong>
                        <small>Conserva los originales</small>
                      </span>
                    </button>
                    <button
                      className={
                        command === "move"
                          ? "command-option command-option--active"
                          : "command-option"
                      }
                      role="radio"
                      aria-checked={command === "move"}
                      onClick={() => {
                        setCommand("move");
                        setMoveConfirmed(false);
                      }}
                    >
                      <ArrowsLeftRight size={24} aria-hidden="true" />
                      <span>
                        <strong>Mover</strong>
                        <small>Cambia su ubicación</small>
                      </span>
                    </button>
                  </div>
                  <label className="dry-run-option">
                    <input
                      type="checkbox"
                      checked={jobKind === "dry_run"}
                      onChange={(event) => {
                        setJobKind(
                          event.target.checked ? "dry_run" : "transfer",
                        );
                        setPlan(null);
                      }}
                    />
                    <span>
                      <strong>Solo comprobar</strong>
                      <small>
                        Analiza permisos, espacio y conflictos sin cambiar
                        Drive.
                      </small>
                    </span>
                  </label>
                  <DuplicatePolicySelector
                    value={duplicatePolicy}
                    onChange={(policy) => {
                      setDuplicatePolicy(policy);
                      setPlan(null);
                    }}
                  />
                  <TransferFilters
                    value={filters}
                    onChange={(nextFilters) => {
                      setFilters(nextFilters);
                      setPlan(null);
                    }}
                  />
                  {sourceFolder && destinationFolder ? (
                    <SaveFavoriteForm
                      defaultName={`${sourceFolder.name} → ${destinationFolder.name}`}
                      onSave={(name) => void saveFavorite(name)}
                    />
                  ) : null}
                  <div className="safety-note">
                    <ShieldCheck
                      size={23}
                      weight="duotone"
                      aria-hidden="true"
                    />
                    <p>
                      Antes de hacer cambios podrás revisar cada archivo y
                      detectar duplicados.
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    disabled={selectedCount === 0 || !destinationFolder}
                    onClick={() => void reviewTransfer()}
                  >
                    Revisar transferencia <ArrowRight weight="bold" />
                  </button>
                </aside>
              </div>
            ) : (
              <section className="surface connect-empty-state">
                <FolderOpen size={42} weight="duotone" aria-hidden="true" />
                <h2>Elige dos carpetas para empezar</h2>
                <p>
                  Después te mostraremos los archivos y podrás decidir cuáles
                  incluir.
                </p>
              </section>
            )}
          </section>
        ) : null}

        {workspaceView === "transfer" && phase === "review" && plan ? (
          <section className="flow-view" aria-labelledby="review-title">
            <div className="flow-heading flow-heading--with-back">
              <button
                className="back-button"
                onClick={() => setPhase("select")}
              >
                <ArrowLeft /> Volver
              </button>
              <p>Paso 2</p>
              <h1 id="review-title">Revisa antes de continuar</h1>
              <span>Nada cambiará hasta que confirmes la transferencia.</span>
            </div>
            <div className="review-grid">
              <div className="review-content">
                <PlanSummary plan={plan} />
                <ConflictCenter
                  plan={plan}
                  resolutions={resolutions}
                  onChange={(nextResolutions) => {
                    setResolutions(nextResolutions);
                    if (!destinationFolder) return;
                    setPlan(
                      buildTransferPlan({
                        tree,
                        selectedIds,
                        destination,
                        destinationSpace: destinationFolder.space,
                        command,
                        duplicatePolicy,
                        kind: jobKind,
                        filters,
                        resolutions: nextResolutions,
                      }),
                    );
                  }}
                />
                {preflight ? <PreflightPanel summary={preflight} /> : null}
              </div>
              <aside className="surface review-action">
                <div className="route-summary">
                  <FolderSimple weight="duotone" />
                  <div>
                    <small>Desde</small>
                    <strong>{sourceFolder?.name}</strong>
                  </div>
                  <ArrowRight />
                  <div>
                    <small>Hasta</small>
                    <strong>{destinationFolder?.name}</strong>
                  </div>
                </div>
                <div className="safety-note">
                  <ShieldCheck size={23} weight="duotone" />
                  <p>Los archivos existentes no se sobrescribirán.</p>
                </div>
                <button
                  className="primary-button"
                  disabled={!preflight?.canProceed}
                  onClick={() =>
                    jobKind === "dry_run"
                      ? startExecution()
                      : setPhase("confirm")
                  }
                >
                  {jobKind === "dry_run" ? "Ver resultado" : "Continuar"}{" "}
                  <ArrowRight weight="bold" />
                </button>
              </aside>
            </div>
          </section>
        ) : null}

        {workspaceView === "transfer" && phase === "confirm" && plan ? (
          <section
            className="flow-view confirmation-view"
            aria-labelledby="confirm-title"
          >
            <button className="back-button" onClick={() => setPhase("review")}>
              <ArrowLeft /> Volver
            </button>
            <div className="confirmation-card">
              <span className="confirmation-card__icon">
                <ShieldCheck weight="duotone" />
              </span>
              <p>Último paso</p>
              <h1 id="confirm-title">
                {command === "copy"
                  ? "Todo listo para copiar"
                  : "Confirma que quieres mover"}
              </h1>
              <span>
                {command === "copy"
                  ? "Tus archivos originales permanecerán donde están."
                  : "Los archivos cambiarán de ubicación cuando comprobemos que llegaron correctamente."}
              </span>
              {command === "move" ? (
                <label className="move-confirmation">
                  <input
                    type="checkbox"
                    checked={moveConfirmed}
                    onChange={(event) => setMoveConfirmed(event.target.checked)}
                  />
                  <span>
                    Entiendo que los originales se retirarán después de
                    verificar el destino.
                  </span>
                </label>
              ) : null}
              <CompletionPreferences
                notify={notifyOnComplete}
                onNotifyChange={(value) =>
                  void updateNotificationPreference(value)
                }
              />
              <button
                className="primary-button"
                disabled={!canExecute}
                onClick={startExecution}
              >
                {command === "copy" ? "Empezar copia" : "Empezar traslado"}{" "}
                <ArrowRight weight="bold" />
              </button>
            </div>
          </section>
        ) : null}

        {workspaceView === "transfer" &&
        (phase === "running" || phase === "paused") &&
        job ? (
          <section
            className="flow-view progress-view"
            aria-labelledby="progress-page-title"
          >
            <div className="flow-heading">
              <p>Paso 3</p>
              <h1 id="progress-page-title">
                {phase === "paused"
                  ? "La transferencia está en pausa"
                  : "Transfiriendo tus archivos"}
              </h1>
              <span>
                Puedes dejar esta ventana abierta mientras terminamos.
              </span>
            </div>
            <JobProgress job={job} />
            <div className="progress-actions">
              {phase === "running" ? (
                <button className="secondary-button" onClick={pauseExecution}>
                  <Pause weight="fill" /> Pausar
                </button>
              ) : (
                <button className="primary-button" onClick={resumeExecution}>
                  <Play weight="fill" /> Continuar
                </button>
              )}
              <button
                className="text-button danger-button"
                onClick={cancelExecution}
              >
                <X weight="bold" /> Cancelar
              </button>
            </div>
          </section>
        ) : null}

        {workspaceView === "transfer" && phase === "complete" && job ? (
          <section
            className="flow-view result-view"
            aria-labelledby="result-title"
          >
            <div className="result-card">
              <span className="result-card__icon">
                <CheckCircle weight="fill" />
              </span>
              <p>Transferencia terminada</p>
              <h1 id="result-title">Tus archivos están listos</h1>
              <span>
                {jobKind === "dry_run"
                  ? "La comprobación ha terminado sin modificar ningún archivo."
                  : job.status === "cancelled"
                    ? "Has detenido la transferencia. Los cambios ya terminados se conservan y no se iniciarán más archivos."
                    : job.status === "completed_with_errors"
                      ? "Algunos archivos no pudieron transferirse. Los originales se han conservado."
                      : "Hemos completado la transferencia sin sobrescribir archivos existentes."}
              </span>
              <JobProgress job={job} compact />
              <div className="result-actions">
                <button className="secondary-button" onClick={downloadReport}>
                  <DownloadSimple /> Descargar informe
                </button>
                <button className="primary-button" onClick={resetTransfer}>
                  Nueva transferencia <ArrowRight />
                </button>
                {hasFailedJob ? (
                  <button
                    className="secondary-button result-actions__retry"
                    onClick={retryFailed}
                  >
                    <ClockCounterClockwise /> Reintentar solo los fallidos
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function FolderCard({
  label,
  folder,
  disabled,
  onChoose,
}: {
  readonly label: string;
  readonly folder: DriveFolderSummary | null;
  readonly disabled: boolean;
  readonly onChoose: () => void;
}) {
  return (
    <article className="folder-card">
      <span className="folder-card__icon">
        <FolderOpen weight="duotone" />
      </span>
      <div>
        <small>
          {label} · {folderLabel(folder)}
        </small>
        <strong>{folder?.name ?? "Elige una carpeta"}</strong>
      </div>
      {!disabled ? (
        <button className="text-button" onClick={onChoose}>
          Cambiar
        </button>
      ) : null}
    </article>
  );
}
