import { X } from "@phosphor-icons/react";
import {
  openPrivacyPreferences,
  savePrivacyPreferences,
  usePrivacyPreferences,
} from "../privacy";

export function PrivacyPreferencesButton() {
  return (
    <button className="legal-link-button" onClick={openPrivacyPreferences}>
      Preferencias de privacidad
    </button>
  );
}

export function PrivacyControls() {
  const { state, settingsOpen, setSettingsOpen } = usePrivacyPreferences();
  const visible = state === "pending" || settingsOpen;
  if (!visible) return null;

  const choose = (analytics: boolean) => {
    savePrivacyPreferences(analytics);
    setSettingsOpen(false);
  };

  return (
    <section
      className="consent-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      {settingsOpen && state !== "pending" ? (
        <button
          className="consent-panel__close"
          onClick={() => setSettingsOpen(false)}
          aria-label="Cerrar preferencias"
        >
          <X />
        </button>
      ) : null}
      <div>
        <p>Tu privacidad</p>
        <h2 id="consent-title">Tú decides sobre la analítica</h2>
        <span>
          Usamos almacenamiento necesario para recordar tu sesión. Google
          Analytics solo se activará si lo aceptas. Puedes cambiarlo después.
        </span>
        <a href="/cookies">Ver cookies y almacenamiento</a>
      </div>
      <div className="consent-panel__actions">
        <button onClick={() => choose(false)}>Rechazar</button>
        <button onClick={() => choose(true)}>Aceptar analítica</button>
      </div>
    </section>
  );
}
