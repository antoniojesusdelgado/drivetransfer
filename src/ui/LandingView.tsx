import { ArrowRight, FolderSimple } from "@phosphor-icons/react";
import googleMark from "../assets/google-g.svg";
import heroTransfer from "../assets/hero-transfer.png";
import { Brand } from "./Brand";

interface LandingViewProps {
  readonly connecting: boolean;
  readonly error: string | null;
  readonly onConnect: () => void;
  readonly onExplore: () => void;
}

const steps = [
  {
    number: "1",
    title: "Elige",
    copy: "Selecciona las carpetas y archivos que quieres mover.",
  },
  {
    number: "2",
    title: "Revisa",
    copy: "Comprueba el contenido y el destino antes de continuar.",
  },
  {
    number: "3",
    title: "Transfiere",
    copy: "Iniciamos la transferencia y te avisamos cuando termine.",
  },
] as const;

export function LandingView({
  connecting,
  error,
  onConnect,
  onExplore,
}: LandingViewProps) {
  return (
    <main className="landing">
      <header className="landing__header">
        <Brand />
      </header>

      <section className="landing__hero" aria-labelledby="landing-title">
        <div className="landing__copy">
          <h1 id="landing-title">
            Mueve tus
            <br />
            archivos de Drive
            <br />
            con tranquilidad
          </h1>
          <p className="landing__promise">Elige, revisa y transfiere</p>
          <div className="landing__actions">
            <button
              className="landing-button landing-button--google"
              onClick={onConnect}
              disabled={connecting}
            >
              <img src={googleMark} alt="" aria-hidden="true" />
              <span>
                {connecting ? "Abriendo Google…" : "Conectar con Google"}
              </span>
            </button>
            <button
              className="landing-button landing-button--explore"
              onClick={onExplore}
            >
              <FolderSimple size={33} weight="regular" aria-hidden="true" />
              <span>Explorar sin iniciar sesión</span>
            </button>
          </div>
          {error ? (
            <p className="landing__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="landing__legal">
            <p>
              Al continuar, confirmas que has leído la{" "}
              <a href="/privacidad">Privacidad</a>, la{" "}
              <a href="/procedencia-datos">procedencia de los datos</a> y el{" "}
              <a href="/aviso-legal">aviso legal</a>.
            </p>
            <small>
              © 2026 Antonio Jesús Delgado Briones. Todos los derechos
              reservados.
            </small>
          </div>
        </div>

        <div className="landing__visual" aria-hidden="true">
          <img src={heroTransfer} alt="" />
        </div>
      </section>

      <ol className="landing__steps" aria-label="Cómo funciona">
        {steps.map((step, index) => (
          <li key={step.number}>
            <span className="landing__step-number">{step.number}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.copy}</p>
            </div>
            {index < steps.length - 1 ? (
              <ArrowRight className="landing__step-arrow" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
