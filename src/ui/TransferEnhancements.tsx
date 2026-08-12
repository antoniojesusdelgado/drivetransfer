import {
  Bell,
  BookmarkSimple,
  ClockCounterClockwise,
  Copy,
  File,
  FolderSimple,
  Gauge,
  PencilSimple,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import type { DuplicatePolicy, TransferPreflight } from "../domain/types";
import type {
  PersistedTransferJob,
  TransferFavorite,
} from "../integrations/drive/types";

export function DuplicatePolicySelector({
  value,
  onChange,
}: {
  readonly value: DuplicatePolicy;
  readonly onChange: (policy: DuplicatePolicy) => void;
}) {
  const options: readonly {
    value: DuplicatePolicy;
    title: string;
    detail: string;
  }[] = [
    { value: "skip", title: "Omitir", detail: "Conserva el que ya existe" },
    {
      value: "rename",
      title: "Conservar ambos",
      detail: "Añade «(copia)» al nuevo archivo",
    },
    {
      value: "review",
      title: "Revisar antes",
      detail: "Detiene los conflictos para decidir",
    },
  ];
  return (
    <fieldset className="duplicate-options">
      <legend>Si un archivo ya existe</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name="duplicate-policy"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>
            <strong>{option.title}</strong>
            <small>{option.detail}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function readableSize(bytes: number): string {
  if (bytes === 0) return "Sin tamaño informado";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** exponent).toLocaleString("es-ES", { maximumFractionDigits: 1 })} ${units[exponent]}`;
}

export function PreflightPanel({
  summary,
}: {
  readonly summary: TransferPreflight;
}) {
  return (
    <section className="preflight" aria-labelledby="preflight-title">
      <div className="preflight__title">
        <Gauge size={22} weight="duotone" aria-hidden="true" />
        <div>
          <p>Comprobación previa</p>
          <h3 id="preflight-title">
            {summary.canProceed
              ? "La transferencia está preparada"
              : "Hay conflictos que revisar"}
          </h3>
        </div>
      </div>
      <dl className="preflight__metrics">
        <div>
          <File />
          <dt>Archivos</dt>
          <dd>{summary.files}</dd>
        </div>
        <div>
          <FolderSimple />
          <dt>Carpetas</dt>
          <dd>{summary.folders}</dd>
        </div>
        <div>
          <Copy />
          <dt>Tamaño conocido</dt>
          <dd>{readableSize(summary.knownBytes)}</dd>
        </div>
        <div>
          <ClockCounterClockwise />
          <dt>Tiempo estimado</dt>
          <dd>≈ {summary.estimatedSeconds} s</dd>
        </div>
        {summary.remainingBytes !== undefined ? (
          <div>
            <Gauge />
            <dt>Espacio disponible</dt>
            <dd>{readableSize(summary.remainingBytes)}</dd>
          </div>
        ) : null}
      </dl>
      {summary.warnings.length > 0 ? (
        <ul className="preflight__warnings">
          {summary.warnings.map((warning) => (
            <li key={warning}>
              <WarningCircle />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function FavoriteRoutes({
  favorites,
  onApply,
  onDelete,
}: {
  readonly favorites: readonly TransferFavorite[];
  readonly onApply: (favorite: TransferFavorite) => void;
  readonly onDelete: (favorite: TransferFavorite) => void;
}) {
  if (favorites.length === 0) return null;
  return (
    <section className="favorites" aria-labelledby="favorites-title">
      <div className="favorites__heading">
        <BookmarkSimple weight="fill" aria-hidden="true" />
        <h2 id="favorites-title">Transferencias favoritas</h2>
      </div>
      <div className="favorites__list">
        {favorites.map((favorite) => (
          <div className="favorite-chip" key={favorite.id}>
            <button onClick={() => onApply(favorite)}>
              <strong>{favorite.name}</strong>
              <small>{favorite.command === "copy" ? "Copiar" : "Mover"}</small>
            </button>
            <button
              className="favorite-chip__delete"
              onClick={() => onDelete(favorite)}
              aria-label={`Eliminar ${favorite.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ResumeTransferBanner({
  snapshot,
  onResume,
  onDiscard,
}: {
  readonly snapshot: PersistedTransferJob;
  readonly onResume: () => void;
  readonly onDiscard: () => void;
}) {
  return (
    <section className="resume-banner" aria-labelledby="resume-title">
      <ClockCounterClockwise size={28} weight="duotone" aria-hidden="true" />
      <div>
        <p>Transferencia pendiente</p>
        <h2 id="resume-title">Continúa donde lo dejaste</h2>
        <span>
          Guardada {new Date(snapshot.updatedAt).toLocaleString("es-ES")}
        </span>
      </div>
      <div className="resume-banner__actions">
        <button className="primary-button" onClick={onResume}>
          Continuar
        </button>
        <button className="text-button danger-button" onClick={onDiscard}>
          Descartar
        </button>
      </div>
    </section>
  );
}

export function CompletionPreferences({
  notify,
  onNotifyChange,
}: {
  readonly notify: boolean;
  readonly onNotifyChange: (value: boolean) => void;
}) {
  return (
    <div className="completion-preferences">
      <label>
        <input
          type="checkbox"
          checked={notify}
          onChange={(event) => onNotifyChange(event.target.checked)}
        />
        <Bell weight="duotone" aria-hidden="true" />
        <span>
          <strong>Avisarme al terminar</strong>
          <small>
            Mostraremos una notificación si el navegador lo permite.
          </small>
        </span>
      </label>
      <div>
        <ShieldCheck aria-hidden="true" />
        <span>El permiso se solicita solo al confirmar.</span>
      </div>
    </div>
  );
}

export function SaveFavoriteForm({
  defaultName,
  onSave,
}: {
  readonly defaultName: string;
  readonly onSave: (name: string) => void;
}) {
  return (
    <form
      className="save-favorite"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const name = String(form.get("favoriteName") ?? "").trim();
        if (name) onSave(name);
      }}
    >
      <PencilSimple aria-hidden="true" />
      <label>
        <span className="sr-only">Nombre de la transferencia favorita</span>
        <input name="favoriteName" defaultValue={defaultName} maxLength={80} />
      </label>
      <button className="secondary-button" type="submit">
        <BookmarkSimple />
        Guardar ruta
      </button>
    </form>
  );
}
