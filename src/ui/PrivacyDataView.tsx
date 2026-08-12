import { DownloadSimple, ShieldCheck, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import type { DataDeletionSummary } from "../privacy";
import { PrivacyPreferencesButton } from "./PrivacyControls";

export function PrivacyDataView({
  connected,
  onExport,
  onDelete,
}: {
  readonly connected: boolean;
  readonly onExport: () => Promise<void>;
  readonly onDelete: () => Promise<DataDeletionSummary>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="workspace-view privacy-data"
      aria-labelledby="privacy-data-title"
    >
      <div className="workspace-heading">
        <div>
          <p>Tu información</p>
          <h1 id="privacy-data-title">Privacidad y datos</h1>
          <span>
            Consulta, descarga o elimina los datos privados creados por
            DriveTransfer.
          </span>
        </div>
      </div>
      <div className="privacy-data__grid">
        <article className="surface privacy-data__card">
          <ShieldCheck />
          <h2>Preferencias de privacidad</h2>
          <p>
            La analítica es voluntaria y puedes cambiar tu decisión cuando
            quieras.
          </p>
          <PrivacyPreferencesButton />
        </article>
        <article className="surface privacy-data__card">
          <DownloadSimple />
          <h2>Descargar mi información</h2>
          <p>
            Obtén una copia JSON de la configuración y los trabajos guardados en
            tu espacio privado.
          </p>
          <button disabled={!connected || busy} onClick={() => void onExport()}>
            Descargar datos
          </button>
        </article>
        <article className="surface privacy-data__card privacy-data__card--danger">
          <Trash />
          <h2>Eliminar todos mis datos</h2>
          <p>
            Borra configuración, trabajos, historial y programaciones. No
            elimina archivos transferidos.
          </p>
          {!confirming ? (
            <button disabled={!connected} onClick={() => setConfirming(true)}>
              Preparar eliminación
            </button>
          ) : (
            <div className="privacy-data__confirmation">
              <label>
                Escribe <strong>ELIMINAR</strong> para confirmar
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <div>
                <button onClick={() => setConfirming(false)}>Cancelar</button>
                <button
                  disabled={confirmation !== "ELIMINAR" || busy}
                  onClick={() => void remove()}
                >
                  {busy ? "Eliminando…" : "Eliminar definitivamente"}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
      <p className="privacy-data__help">
        También puedes solicitar ayuda en{" "}
        <a href="mailto:contacto@antoniodelgado.tech">
          contacto@antoniodelgado.tech
        </a>{" "}
        o consultar el <a href="/eliminar-datos">procedimiento completo</a>.
      </p>
    </section>
  );
}
