import {
  ArrowClockwise,
  CalendarBlank,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FileCsv,
  FileJs,
  Pause,
  Play,
  Plus,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { defaultTransferFilters } from "../domain/filters";
import { nextScheduleRun } from "../domain/scheduling";
import type {
  HistoryEntry,
  ConflictResolution,
  ScheduleFrequency,
  StoredJobManifest,
  TransferFilterSet,
  TransferSchedule,
  TransferPlan,
  WorkspaceJobStatus,
} from "../domain/types";
import { VirtualList } from "./VirtualList";

const statusLabels: Record<WorkspaceJobStatus, string> = {
  queued: "En cola",
  running: "En curso",
  paused: "En pausa",
  needs_attention: "Necesita atención",
  cancelled: "Cancelado",
  completed: "Terminado",
};

function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 600px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 600px)");
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

export type WorkspaceJobAction =
  | "pause"
  | "resume"
  | "cancel"
  | "repeat"
  | "retry_retryable"
  | "retry_permissions";

function JobProgressLine({ job }: { readonly job: StoredJobManifest }) {
  const value =
    job.total === 0 ? 0 : Math.round((job.completed / job.total) * 100);
  return (
    <div className="job-progress-line">
      <span style={{ width: String(value) + "%" }} />
      <small>{value}%</small>
    </div>
  );
}

export function JobsCenter({
  jobs,
  onAction,
  onDownload,
}: {
  readonly jobs: readonly StoredJobManifest[];
  readonly onAction: (
    job: StoredJobManifest,
    action: WorkspaceJobAction,
  ) => void;
  readonly onDownload: (job: StoredJobManifest, format: "json" | "csv") => void;
}) {
  const [status, setStatus] = useState<WorkspaceJobStatus | "all">("all");
  const compact = useCompactViewport();
  const filtered = useMemo(
    () => jobs.filter((job) => status === "all" || job.status === status),
    [jobs, status],
  );
  return (
    <section className="workspace-view" aria-labelledby="jobs-title">
      <div className="workspace-heading">
        <div>
          <p>Actividad</p>
          <h1 id="jobs-title">Centro de transferencias</h1>
          <span>
            Controla tus trabajos sin perder lo que ya está terminado.
          </span>
        </div>
        <label className="compact-field">
          Estado
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as WorkspaceJobStatus | "all")
            }
          >
            <option value="all">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length === 0 ? (
        <div className="surface empty-workspace">
          <Clock size={34} />
          <h2>No hay trabajos en este estado</h2>
          <p>Las nuevas transferencias aparecerán aquí.</p>
        </div>
      ) : (
        <VirtualList
          items={filtered}
          itemHeight={compact ? 232 : 178}
          height={Math.min(620, filtered.length * (compact ? 232 : 178))}
          getKey={(item) => item.id}
          ariaLabel="Trabajos de transferencia"
          renderItem={(item) => (
            <article className="surface job-card">
              <div className="job-card__main">
                <div className={"status-dot status-dot--" + item.status} />
                <div>
                  <span className="status-label">
                    {statusLabels[item.status]}
                  </span>
                  <h2>{item.name}</h2>
                  <p>
                    {item.sourceLabel} <span aria-hidden="true">→</span>{" "}
                    {item.destinationLabel}
                  </p>
                </div>
              </div>
              <div className="job-card__numbers">
                <strong>
                  {item.completed.toLocaleString("es-ES")} /{" "}
                  {item.total.toLocaleString("es-ES")}
                </strong>
                {item.failed > 0 ? (
                  <span>
                    <WarningCircle /> {item.failed} con error
                  </span>
                ) : null}
              </div>
              <JobProgressLine job={item} />
              <div className="job-card__actions">
                {item.status === "running" ? (
                  <button onClick={() => onAction(item, "pause")}>
                    <Pause /> Pausar
                  </button>
                ) : null}
                {item.status === "paused" ||
                item.status === "needs_attention" ? (
                  <button onClick={() => onAction(item, "resume")}>
                    <Play /> Continuar
                  </button>
                ) : null}
                {item.failed > 0 ? (
                  <>
                    <button onClick={() => onAction(item, "retry_retryable")}>
                      <ArrowClockwise /> Reintentar temporales
                    </button>
                    <button onClick={() => onAction(item, "retry_permissions")}>
                      Reintentar permisos
                    </button>
                  </>
                ) : null}
                {["queued", "running", "paused"].includes(item.status) ? (
                  <button
                    className="danger-button"
                    onClick={() => onAction(item, "cancel")}
                  >
                    <X /> Cancelar
                  </button>
                ) : (
                  <button onClick={() => onAction(item, "repeat")}>
                    <ArrowClockwise /> Repetir
                  </button>
                )}
                <button
                  aria-label="Descargar informe JSON"
                  onClick={() => onDownload(item, "json")}
                >
                  <FileJs />
                </button>
                <button
                  aria-label="Descargar informe CSV"
                  onClick={() => onDownload(item, "csv")}
                >
                  <FileCsv />
                </button>
              </div>
            </article>
          )}
        />
      )}
    </section>
  );
}

export function SchedulesView({
  schedules,
  onSave,
  onToggle,
  onRun,
  onDelete,
  sourceFolderId,
  destinationFolderId,
}: {
  readonly schedules: readonly TransferSchedule[];
  readonly onSave: (schedule: TransferSchedule) => void;
  readonly onToggle: (schedule: TransferSchedule) => void;
  readonly onRun: (schedule: TransferSchedule) => void;
  readonly onDelete: (schedule: TransferSchedule) => void;
  readonly sourceFolderId?: string;
  readonly destinationFolderId?: string;
}) {
  const [creating, setCreating] = useState(false);
  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const now = new Date();
    const frequency = String(data.get("frequency")) as ScheduleFrequency;
    const timeOfDay = String(data.get("timeOfDay"));
    const timeZone = String(data.get("timeZone"));
    const dayOfWeek = Number(data.get("dayOfWeek"));
    const dayOfMonth = Number(data.get("dayOfMonth"));
    const date = String(data.get("date"));
    onSave({
      id: "plan_schedule_" + now.getTime().toString(36),
      name: String(data.get("name")),
      sourceFolderId: sourceFolderId ?? "source-example",
      destinationFolderId: destinationFolderId ?? "destination-example",
      kind: String(data.get("kind")) as "transfer" | "sync",
      frequency,
      timeOfDay,
      dayOfWeek,
      dayOfMonth,
      timeZone,
      nextRunAt: nextScheduleRun({
        frequency,
        timeOfDay,
        timeZone,
        dayOfWeek,
        dayOfMonth,
        date,
        after: now,
      }),
      enabled: true,
      filters: defaultTransferFilters,
      duplicatePolicy: "skip",
      notifications: {
        browser: true,
        email: data.get("email") === "on",
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    setCreating(false);
  };
  return (
    <section className="workspace-view" aria-labelledby="schedules-title">
      <div className="workspace-heading">
        <div>
          <p>Automatizaciones</p>
          <h1 id="schedules-title">Programaciones</h1>
          <span>Copia o sincroniza sin eliminar ni sustituir archivos.</span>
        </div>
        <button
          className="primary-button compact-button"
          disabled={!sourceFolderId || !destinationFolderId}
          onClick={() => setCreating((value) => !value)}
        >
          <Plus /> Nueva programación
        </button>
      </div>
      {creating ? (
        <ScheduleForm onCancel={() => setCreating(false)} onSubmit={submit} />
      ) : null}
      {!sourceFolderId || !destinationFolderId ? (
        <p className="workspace-hint">
          Elige primero el origen y el destino en Transferir para crear una
          programación.
        </p>
      ) : null}
      <div className="schedule-grid">
        {schedules.map((schedule) => (
          <article className="surface schedule-card" key={schedule.id}>
            <div>
              <span className="schedule-card__icon">
                <CalendarBlank />
              </span>
              <small>
                {schedule.kind === "sync" ? "Sincronización" : "Copia"}
              </small>
              <h2>{schedule.name}</h2>
              <p>
                Próxima:{" "}
                {new Date(schedule.nextRunAt).toLocaleString("es-ES", {
                  timeZone: schedule.timeZone,
                })}
              </p>
            </div>
            <span
              className={
                schedule.enabled
                  ? "status-label"
                  : "status-label status-label--muted"
              }
            >
              {schedule.enabled ? "Activa" : "En pausa"}
            </span>
            <div className="schedule-card__actions">
              <button onClick={() => onRun(schedule)}>
                <Play /> Ejecutar ahora
              </button>
              <button onClick={() => onToggle(schedule)}>
                {schedule.enabled ? <Pause /> : <Play />}{" "}
                {schedule.enabled ? "Pausar" : "Activar"}
              </button>
              <button
                className="danger-button"
                onClick={() => onDelete(schedule)}
                aria-label={"Eliminar " + schedule.name}
              >
                <Trash />
              </button>
            </div>
            <details className="schedule-reschedule">
              <summary>Cambiar próxima ejecución</summary>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const value = String(data.get("nextRunAt"));
                  if (!value) return;
                  onSave({
                    ...schedule,
                    nextRunAt: new Date(value).toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                }}
              >
                <input
                  name="nextRunAt"
                  type="datetime-local"
                  defaultValue={schedule.nextRunAt.slice(0, 16)}
                  required
                />
                <button>Guardar fecha</button>
              </form>
            </details>
          </article>
        ))}
        {schedules.length === 0 ? (
          <div className="surface empty-workspace">
            <CalendarBlank size={34} />
            <h2>Aún no hay programaciones</h2>
            <p>Crea una copia o sincronización guiada.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScheduleForm({
  onCancel,
  onSubmit,
}: {
  readonly onCancel: () => void;
  readonly onSubmit: (form: HTMLFormElement) => void;
}) {
  const [defaultDate] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );
  return (
    <form
      className="surface schedule-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event.currentTarget);
      }}
    >
      <label>
        Nombre
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Archivo semanal"
        />
      </label>
      <label>
        Acción
        <select name="kind">
          <option value="transfer">Copiar</option>
          <option value="sync">Sincronizar</option>
        </select>
      </label>
      <label>
        Frecuencia
        <select name="frequency">
          <option value="once">Una vez</option>
          <option value="daily">Cada día</option>
          <option value="weekly">Cada semana</option>
          <option value="monthly">Cada mes</option>
        </select>
      </label>
      <label>
        Hora
        <input name="timeOfDay" type="time" defaultValue="09:00" required />
      </label>
      <label>
        Fecha (si es una vez)
        <input name="date" type="date" defaultValue={defaultDate} />
      </label>
      <label>
        Día semanal
        <select name="dayOfWeek" defaultValue="1">
          <option value="1">Lunes</option>
          <option value="2">Martes</option>
          <option value="3">Miércoles</option>
          <option value="4">Jueves</option>
          <option value="5">Viernes</option>
          <option value="6">Sábado</option>
          <option value="0">Domingo</option>
        </select>
      </label>
      <label>
        Día del mes
        <input
          name="dayOfMonth"
          type="number"
          min="1"
          max="28"
          defaultValue="1"
        />
      </label>
      <label>
        Zona horaria
        <input
          name="timeZone"
          defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
          required
        />
      </label>
      <label className="check-field">
        <input name="email" type="checkbox" />
        <EnvelopeSimple /> Avisarme por correo
      </label>
      <div className="schedule-form__actions">
        <button type="button" className="text-button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button">Guardar</button>
      </div>
    </form>
  );
}

export function HistoryView({
  history,
  onDownload,
}: {
  readonly history: readonly HistoryEntry[];
  readonly onDownload: (job: HistoryEntry, format: "json" | "csv") => void;
}) {
  const [query, setQuery] = useState("");
  const compact = useCompactViewport();
  const filtered = history.filter((entry) =>
    entry.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  return (
    <section className="workspace-view" aria-labelledby="history-title">
      <div className="workspace-heading">
        <div>
          <p>Últimos 90 días</p>
          <h1 id="history-title">Historial</h1>
          <span>Consulta resultados sin mostrar identificadores internos.</span>
        </div>
        <label className="compact-field">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre del trabajo"
          />
        </label>
      </div>
      <div className="surface history-table" role="table">
        <div className="history-row history-row--header" role="row">
          <span>Trabajo</span>
          <span>Resultado</span>
          <span>Fecha</span>
          <span>Informe</span>
        </div>
        {filtered.length > 100 ? (
          <VirtualList
            items={filtered}
            itemHeight={compact ? 126 : 76}
            height={600}
            getKey={(entry) => entry.id}
            ariaLabel="Resultados anteriores"
            renderItem={(entry) => (
              <div className="history-row" role="row">
                <div>
                  <strong>{entry.name}</strong>
                  <small>
                    {entry.kind === "dry_run"
                      ? "Solo comprobación"
                      : entry.kind === "sync"
                        ? "Sincronización"
                        : entry.command === "copy"
                          ? "Copia"
                          : "Traslado"}
                  </small>
                </div>
                <span>
                  {entry.failed > 0
                    ? String(entry.failed) + " con error"
                    : String(entry.completed) + " completados"}
                </span>
                <span>
                  {new Date(entry.finishedAt).toLocaleDateString("es-ES")}
                </span>
                <div>
                  <button
                    aria-label="Descargar JSON"
                    onClick={() => onDownload(entry, "json")}
                  >
                    <FileJs />
                  </button>
                  <button
                    aria-label="Descargar CSV"
                    onClick={() => onDownload(entry, "csv")}
                  >
                    <FileCsv />
                  </button>
                </div>
              </div>
            )}
          />
        ) : null}
        {(filtered.length > 100 ? [] : filtered).map((entry) => (
          <div className="history-row" role="row" key={entry.id}>
            <div>
              <strong>{entry.name}</strong>
              <small>
                {entry.kind === "dry_run"
                  ? "Solo comprobación"
                  : entry.kind === "sync"
                    ? "Sincronización"
                    : entry.command === "copy"
                      ? "Copia"
                      : "Traslado"}
              </small>
            </div>
            <span>
              {entry.failed > 0
                ? String(entry.failed) + " con error"
                : String(entry.completed) + " completados"}
            </span>
            <span>
              {new Date(entry.finishedAt).toLocaleDateString("es-ES")}
            </span>
            <div>
              <button
                aria-label="Descargar JSON"
                onClick={() => onDownload(entry, "json")}
              >
                <FileJs />
              </button>
              <button
                aria-label="Descargar CSV"
                onClick={() => onDownload(entry, "csv")}
              >
                <FileCsv />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <div className="empty-workspace">
            <CheckCircle size={32} />
            <p>No hay resultados que mostrar.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function TransferFilters({
  value,
  onChange,
}: {
  readonly value: TransferFilterSet;
  readonly onChange: (filters: TransferFilterSet) => void;
}) {
  const update = (patch: Partial<TransferFilterSet>) =>
    onChange({ ...value, ...patch });
  return (
    <details className="transfer-filters">
      <summary>Filtros y exclusiones</summary>
      <div className="transfer-filters__grid">
        <label>
          Nombre contiene
          <input
            value={value.nameIncludes}
            onChange={(event) => update({ nameIncludes: event.target.value })}
          />
        </label>
        <label>
          Extensiones
          <input
            value={value.extensions.join(", ")}
            placeholder="pdf, docx"
            onChange={(event) =>
              update({
                extensions: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label>
          Cambios
          <select
            value={value.changeMode}
            onChange={(event) =>
              update({
                changeMode: event.target
                  .value as TransferFilterSet["changeMode"],
              })
            }
          >
            <option value="all">Todos</option>
            <option value="new">Solo archivos nuevos</option>
            <option value="new_or_modified">Nuevos o modificados</option>
          </select>
        </label>
        <label>
          Tamaño mínimo (MB)
          <input
            type="number"
            min="0"
            onChange={(event) =>
              update({
                minSize: event.target.value
                  ? Number(event.target.value) * 1024 * 1024
                  : undefined,
              })
            }
          />
        </label>
        <label>
          Tamaño máximo (MB)
          <input
            type="number"
            min="0"
            onChange={(event) =>
              update({
                maxSize: event.target.value
                  ? Number(event.target.value) * 1024 * 1024
                  : undefined,
              })
            }
          />
        </label>
        <label>
          Excluir rutas
          <input
            value={value.excludedPaths.join(", ")}
            placeholder="Temporales, Borradores"
            onChange={(event) =>
              update({
                excludedPaths: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </div>
    </details>
  );
}

export function ConflictCenter({
  plan,
  resolutions,
  onChange,
}: {
  readonly plan: TransferPlan;
  readonly resolutions: readonly ConflictResolution[];
  readonly onChange: (resolutions: readonly ConflictResolution[]) => void;
}) {
  const compact = useCompactViewport();
  const conflicts = plan.operations.filter(
    (operation) => operation.reason === "duplicate_review",
  );
  const resolutionMap = new Map(
    resolutions.map((resolution) => [resolution.operationKey, resolution]),
  );
  const resolve = (
    operationKey: string,
    action: ConflictResolution["action"],
    targetName?: string,
  ) => {
    onChange([
      ...resolutions.filter((item) => item.operationKey !== operationKey),
      { operationKey, action, targetName },
    ]);
  };
  const applyAll = (action: ConflictResolution["action"]) =>
    onChange(
      conflicts.map((operation) => ({
        operationKey: operation.operationKey,
        action,
      })),
    );
  if (conflicts.length === 0) return null;
  return (
    <section
      className="surface conflict-center"
      aria-labelledby="conflict-title"
    >
      <div className="surface__header">
        <div>
          <p>Archivos con el mismo nombre</p>
          <h2 id="conflict-title">Decide qué hacer</h2>
        </div>
        <label className="compact-field">
          Aplicar a todos
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                applyAll(event.target.value as ConflictResolution["action"]);
            }}
          >
            <option value="">Elegir</option>
            <option value="skip">Omitir</option>
            <option value="keep_both">Conservar ambos</option>
            <option value="pending">Dejar pendiente</option>
          </select>
        </label>
      </div>
      <VirtualList
        items={conflicts}
        itemHeight={compact ? 190 : 104}
        height={Math.min(420, conflicts.length * (compact ? 190 : 104))}
        getKey={(operation) => operation.operationKey}
        ariaLabel="Conflictos de archivos"
        renderItem={(operation) => {
          const resolution = resolutionMap.get(operation.operationKey);
          return (
            <div className="conflict-row">
              <div>
                <strong>{operation.item.name}</strong>
                <small>
                  {operation.item.relativePath || "Carpeta principal"}
                </small>
              </div>
              <select
                aria-label={"Decisión para " + operation.item.name}
                value={resolution?.action ?? "pending"}
                onChange={(event) =>
                  resolve(
                    operation.operationKey,
                    event.target.value as ConflictResolution["action"],
                  )
                }
              >
                <option value="pending">Decidir después</option>
                <option value="skip">Omitir</option>
                <option value="keep_both">Conservar ambos</option>
                <option value="rename">Cambiar nombre</option>
              </select>
              {resolution?.action === "rename" ? (
                <input
                  aria-label={"Nuevo nombre para " + operation.item.name}
                  value={resolution.targetName ?? ""}
                  onChange={(event) =>
                    resolve(
                      operation.operationKey,
                      "rename",
                      event.target.value,
                    )
                  }
                  placeholder="Nuevo nombre"
                />
              ) : null}
            </div>
          );
        }}
      />
    </section>
  );
}
