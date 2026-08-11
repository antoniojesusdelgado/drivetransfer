import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  Check,
  CheckCircle,
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
  setJobStatus,
} from "./domain/executor";
import { buildTransferPlan } from "./domain/planner";
import { toggleSelection } from "./domain/selection";
import type {
  DestinationEntry,
  DriveItem,
  DriveTree,
  OperationCheckpoint,
  TransferCommand,
  TransferJob,
  TransferPlan,
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
  DriveRuntimeGateway,
  RuntimeCheckpoint,
  RuntimeTransferOperation,
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

export type AppMode = "landing" | "explore" | "google";
export type AuthState =
  "idle" | "authorizing" | "connected" | "expired" | "denied" | "error";
export type TransferPhase =
  "select" | "review" | "confirm" | "running" | "paused" | "complete";

const MAX_INDEXED_ITEMS = 25_000;
const EXECUTION_BATCH_SIZE = 10;

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
  };
}

export default function App() {
  const configuration = useMemo(() => googleClientConfiguration(), []);
  const [mode, setMode] = useState<AppMode>("landing");
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [gateway, setGateway] = useState<DriveRuntimeGateway | null>(null);
  const [phase, setPhase] = useState<TransferPhase>("select");
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
  const [plan, setPlan] = useState<TransferPlan | null>(null);
  const [job, setJob] = useState<TransferJob | null>(null);
  const [moveConfirmed, setMoveConfirmed] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preparedCount, setPreparedCount] = useState(0);
  const pauseRequested = useRef(false);
  const cancelRequested = useRef(false);

  const selectedCount = selectedIds.size;
  const filesReady =
    mode === "explore" ||
    (sourceFolder !== null && tree.rootId === sourceFolder.id);
  const canExecute =
    plan !== null && isExecutionConfirmed(plan.command, moveConfirmed);

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

  const resetTransfer = () => {
    setSelectedIds(new Set());
    setCommand("copy");
    setPlan(null);
    setJob(null);
    setMoveConfirmed(false);
    setQuery("");
    setError(null);
    setPhase("select");
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
    resetTransfer();
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
      setSession(nextSession);
      setGateway(
        createExecutionApiGateway({
          accessToken: nextSession.accessToken,
          deploymentId: configuration.appsScriptDeploymentId,
        }),
      );
      setAuthState("connected");
      setMode("google");
      resetTransfer();
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

  const reviewTransfer = () => {
    if (!destinationFolder) return;
    const nextPlan = buildTransferPlan({
      tree,
      selectedIds,
      destination,
      destinationSpace: destinationFolder.space,
      command,
    });
    setPlan(nextPlan);
    setPhase("review");
  };

  const executeRealTransfer = async (resumeJob?: TransferJob) => {
    if (!plan || !gateway || !destinationFolder || !sourceFolder) return;
    pauseRequested.current = false;
    cancelRequested.current = false;
    setPhase("running");
    setError(null);
    let current = resumeJob ?? initialJob(plan);
    setJob(current);

    const completed = new Set(Object.keys(current.checkpoints));
    const pending = plan.operations
      .filter(
        (operation) =>
          operation.decision === "transfer" &&
          !completed.has(operation.operationKey),
      )
      .sort((left, right) => {
        const depthDifference =
          right.item.relativePath.split("/").length -
          left.item.relativePath.split("/").length;
        return command === "move" ? depthDifference : -depthDifference;
      });

    try {
      for (
        let offset = 0;
        offset < pending.length;
        offset += EXECUTION_BATCH_SIZE
      ) {
        if (cancelRequested.current) {
          current = setJobStatus(current, "cancelled");
          setJob(current);
          setPhase("complete");
          return;
        }
        if (pauseRequested.current) {
          current = setJobStatus(current, "paused");
          setJob(current);
          setPhase("paused");
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
            transferOperation(operation.item, operation.operationKey),
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
        if (cancelRequested.current) {
          current = setJobStatus(current, "cancelled");
          setJob(current);
          setPhase("complete");
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
    } catch (executionError) {
      current = setJobStatus(current, "paused_retryable");
      setJob(current);
      setError(userFacingError(executionError));
      setPhase("paused");
    }
  };

  const startExecution = () => {
    if (!canExecute || !plan) return;
    if (mode === "explore") {
      setJob(setJobStatus(createTransferJob(plan), "running"));
      setPhase("running");
    } else {
      void executeRealTransfer();
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
            const stepIndex = step === "select" ? 0 : step === "review" ? 1 : 3;
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

        {error ? (
          <div className="app-alert" role="alert">
            <Warning size={21} weight="fill" aria-hidden="true" />
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Cerrar aviso">
              <X />
            </button>
          </div>
        ) : null}

        {phase === "select" ? (
          <section
            className="flow-view flow-view--select"
            aria-labelledby="select-title"
          >
            <div className="flow-heading">
              <p>Paso 1</p>
              <h1 id="select-title">Elige qué quieres transferir</h1>
              <span>
                Selecciona el origen, el destino y los archivos que quieres
                incluir.
              </span>
            </div>

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
                    onClick={reviewTransfer}
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

        {phase === "review" && plan ? (
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
              <PlanSummary plan={plan} />
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
                  onClick={() => setPhase("confirm")}
                >
                  Continuar <ArrowRight weight="bold" />
                </button>
              </aside>
            </div>
          </section>
        ) : null}

        {phase === "confirm" && plan ? (
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

        {(phase === "running" || phase === "paused") && job ? (
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

        {phase === "complete" && job ? (
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
                {job.status === "cancelled"
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
