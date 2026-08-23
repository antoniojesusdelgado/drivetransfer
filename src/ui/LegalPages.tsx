import { ArrowLeft } from "@phosphor-icons/react";
import type { LegalRoute } from "../legalRoutes";
import { AiTransparencyMark } from "./AiTransparencyMark";
import { Brand } from "./Brand";
import { PrivacyPreferencesButton } from "./PrivacyControls";

interface LegalSection {
  readonly id?: string;
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
}

interface LegalDocument {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

const contact = "contacto@antoniodelgado.tech";
const responsible =
  "Responsable: Antonio Jesús Delgado Briones, residente en España. DriveTransfer es un proyecto personal, gratuito y no comercial de portfolio. Contacto: " +
  contact +
  ".";

const documents: Record<LegalRoute, LegalDocument> = {
  "/privacidad": {
    eyebrow: "Transparencia",
    title: "Política de privacidad",
    intro:
      "Qué datos utiliza DriveTransfer, para qué los necesita y cómo puedes controlarlos.",
    sections: [
      {
        title: "1. Responsable y finalidad",
        paragraphs: [
          responsible,
          "Los datos se usan para prestar las funciones que solicitas, conservar tus trabajos privados, proteger la aplicación y, solo si lo aceptas, obtener estadísticas básicas. Las bases jurídicas son la ejecución de lo solicitado, el consentimiento para analítica y avisos, y el interés legítimo en prevenir abusos. No se venden datos, no hay publicidad, perfiles comerciales, decisiones automatizadas ni entrenamiento de modelos.",
        ],
      },
      {
        title: "2. Datos, proveedores y conservación",
        items: [
          "Cuenta conectada, identificadores técnicos y contenido o metadatos de Drive que selecciones expresamente.",
          "Trabajos, favoritos, conflictos, programaciones, preferencias y comunicaciones que configures.",
          "Google presta OAuth, Drive, Picker, Apps Script y, con consentimiento, Analytics; Vercel aloja la interfaz y, también con consentimiento, proporciona Web Analytics.",
          "Google y Vercel pueden tratar datos fuera del Espacio Económico Europeo conforme a sus acuerdos y mecanismos internacionales aplicables.",
          "El token permanece solo en memoria. Los trabajos reanudables duran hasta 7 días, el historial hasta 90 días, Google Analytics conserva datos durante 2 meses y Vercel aplica la retención disponible en el plan activo.",
        ],
      },
      {
        title: "3. Derechos y seguridad",
        paragraphs: [
          "Puedes solicitar gratuitamente acceso, rectificación, supresión, limitación, oposición o portabilidad, y retirar cualquier consentimiento. Responderemos normalmente en un mes. También puedes reclamar ante la Agencia Española de Protección de Datos.",
          "Aplicamos validación de entradas, permisos, límites de uso, operaciones por lotes y errores seguros. DriveTransfer no descarga ni ejecuta el contenido de los archivos: Google Drive realiza las copias y movimientos dentro de su propia plataforma.",
        ],
      },
    ],
  },
  "/procedencia-datos": {
    eyebrow: "Datos y transparencia",
    title: "Procedencia de los datos",
    intro:
      "De dónde procede la información mostrada y qué control mantienes sobre ella.",
    sections: [
      {
        title: "1. Archivos y ejemplos",
        paragraphs: [
          "El modo exploración usa únicamente carpetas, documentos y resultados ficticios incluidos en la aplicación. Al conectar Google, la información procede de los elementos que eliges voluntariamente en Mi unidad o unidades compartidas mediante Google Picker.",
          "DriveTransfer no amplía los permisos de tu cuenta ni obtiene información de fuentes ajenas. Los informes descargables excluyen identificadores internos.",
        ],
      },
      {
        title: "2. Origen y control",
        paragraphs: [
          "Es una recreación técnica personal desarrollada desde cero. No contiene código, documentos, datos, diseños internos, secretos empresariales ni activos de empleadores o clientes, ni implica su patrocinio o aprobación.",
          "Antes de modificar Drive se muestran origen, destino, contenido y bloqueos. Nunca se sustituyen archivos silenciosamente y mover requiere una confirmación adicional.",
        ],
      },
    ],
  },
  "/aviso-legal": {
    eyebrow: "Información del proyecto",
    title: "Aviso legal",
    intro:
      "Condiciones esenciales de DriveTransfer como proyecto personal de portfolio.",
    sections: [
      {
        title: "1. Titularidad y uso",
        paragraphs: [
          responsible,
          "Debes usar únicamente cuentas, unidades y archivos para los que tengas autorización. No está permitido infringir derechos, eludir controles de acceso, introducir código dañino ni interferir con la aplicación o terceros.",
        ],
      },
      {
        title: "2. Disponibilidad y responsabilidad",
        paragraphs: [
          "El proyecto se ofrece gratuitamente y según disponibilidad. Puede verse afectado por permisos, cuotas, cambios o interrupciones de Google, Apps Script, Vercel, el navegador o la conexión. No sustituye una política profesional de copias de seguridad.",
          "El uso se realiza bajo responsabilidad del usuario, sin perjuicio de las responsabilidades que legalmente no puedan excluirse.",
        ],
      },
      {
        title: "3. Propiedad y marcas",
        paragraphs: [
          "El código, diseño y textos propios están protegidos por la normativa aplicable. Google y sus productos pertenecen a sus titulares; la interoperabilidad no implica afiliación o aprobación.",
          "Se aplica la legislación española, sin limitar los derechos imperativos que correspondan al usuario.",
        ],
      },
    ],
  },
  "/cookies": {
    eyebrow: "Tus preferencias",
    title: "Cookies y almacenamiento",
    intro:
      "La medición permanece apagada hasta que aceptas expresamente la analítica.",
    sections: [
      {
        title: "1. Uso necesario",
        paragraphs: [
          "El navegador guarda tu decisión de privacidad y referencias opacas necesarias para recordar o reanudar el recorrido. No se usan para publicidad.",
        ],
      },
      {
        title: "2. Analítica opcional",
        paragraphs: [
          "Solo después de aceptar se cargan Google Analytics 4 y Vercel Web Analytics. Google Analytics puede crear cookies _ga; Google Signals, publicidad, remarketing, User-ID y personalización permanecen desactivados y su retención está fijada en 2 meses.",
          "Vercel Web Analytics mide visitas y páginas de forma agregada sin crear cookies propias. No se envían nombres, correos, identificadores de Drive ni contenido de archivos.",
          "Puedes rechazar o retirar la analítica desde Preferencias de privacidad. Al retirarla se detienen nuevos envíos y se eliminan las cookies accesibles desde este dominio.",
        ],
      },
    ],
  },
  "/eliminar-datos": {
    eyebrow: "Control de tus datos",
    title: "Eliminar tus datos",
    intro:
      "Borra la configuración privada de DriveTransfer sin eliminar los archivos ya transferidos.",
    sections: [
      {
        title: "1. Desde la aplicación",
        paragraphs: [
          "Conecta la misma cuenta, entra en Privacidad y datos y selecciona “Eliminar todos mis datos”. Se borrarán favoritos, trabajos, conflictos, historial, programaciones, índices y el trigger de DriveTransfer; después se verificará el resultado y se revocará la sesión.",
          "La acción no elimina archivos originales, copias ni carpetas de Drive. Es idempotente y puede repetirse si una ejecución queda incompleta.",
        ],
      },
      {
        title: "2. Ayuda y revocación",
        paragraphs: [
          "También puedes escribir a " +
            contact +
            ". Para proteger la cuenta, puede ser necesario reconectarla porque el titular no puede entrar unilateralmente en su espacio privado.",
          "Después de eliminar los datos puedes revocar DriveTransfer desde las conexiones de seguridad de tu Cuenta de Google.",
        ],
      },
    ],
  },
  "/transparencia-ia": {
    eyebrow: "Transparencia",
    title: "Transparencia sobre IA",
    intro:
      "Cómo se utilizó inteligencia artificial durante el desarrollo de DriveTransfer.",
    sections: [
      {
        title: "1. Desarrollo asistido",
        paragraphs: [
          "El código, las pruebas, la documentación y partes del diseño se elaboraron con asistencia de ChatGPT Codex. Antonio Jesús Delgado Briones dirigió, revisó y editó el resultado y asume la responsabilidad editorial y técnica de esta publicación.",
          "Codex se utilizó durante el desarrollo y no forma parte de DriveTransfer cuando la aplicación está en funcionamiento. Ningún archivo, nombre, metadato, identificador o token de las cuentas de Google de los usuarios se envía a OpenAI.",
        ],
      },
      {
        title: "2. Distintivo europeo",
        paragraphs: [
          "El distintivo procede del conjunto oficial publicado por la Comisión Europea y se utiliza voluntariamente como medida adicional de transparencia. No representa una certificación, aprobación ni garantía de cumplimiento por parte de la Unión Europea.",
        ],
      },
    ],
  },
};

export function LegalLinks({
  compact = false,
}: {
  readonly compact?: boolean;
}) {
  return (
    <nav
      className={compact ? "legal-links legal-links--compact" : "legal-links"}
      aria-label="Información legal"
    >
      <a href="/privacidad">Privacidad</a>
      <a href="/procedencia-datos">Procedencia de los datos</a>
      <a href="/aviso-legal">Aviso legal</a>
      <a href="/cookies">Cookies</a>
      <a href="/eliminar-datos">Eliminar datos</a>
      <a href="/transparencia-ia">Transparencia sobre IA</a>
      <PrivacyPreferencesButton />
    </nav>
  );
}

export function LegalPage({ route }: { readonly route: LegalRoute }) {
  const document = documents[route];
  return (
    <main className="legal-page">
      <header className="legal-header">
        <a
          className="legal-home"
          href="/"
          aria-label="Volver al inicio de DriveTransfer"
        >
          <Brand compact />
        </a>
        <a className="legal-back" href="/">
          <ArrowLeft aria-hidden="true" /> Volver a DriveTransfer
        </a>
      </header>
      <article className="legal-document">
        <div className="legal-hero">
          <p>{document.eyebrow}</p>
          <h1>{document.title}</h1>
          <span>{document.intro}</span>
          <small>Versión 1.0.1 · vigente desde el 13 de agosto de 2026</small>
        </div>
        <div className="legal-content">
          {document.sections.map((section) => (
            <section key={section.title} id={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {route === "/transparencia-ia" &&
              section.title === "2. Distintivo europeo" ? (
                <AiTransparencyMark />
              ) : null}
            </section>
          ))}
          <aside className="legal-contact">
            <strong>Contacto sobre privacidad y derechos</strong>
            <a href={`mailto:${contact}`}>{contact}</a>
            <a href="https://www.aepd.es/" target="_blank" rel="noreferrer">
              Agencia Española de Protección de Datos
            </a>
          </aside>
        </div>
      </article>
      <footer className="legal-footer">
        <p>
          © 2026 Antonio Jesús Delgado Briones. Todos los derechos reservados.
        </p>
        <LegalLinks compact />
      </footer>
    </main>
  );
}
