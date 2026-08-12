import { ArrowLeft } from "@phosphor-icons/react";
import type { LegalRoute } from "../legalRoutes";
import { Brand } from "./Brand";
import { PrivacyPreferencesButton } from "./PrivacyControls";

interface LegalSection {
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
const commonResponsible =
  "Responsable: Antonio Jesús Delgado Briones, persona física residente en España. DriveTransfer es un proyecto personal, gratuito y no comercial de portfolio. Contacto: " +
  contact +
  ".";

const documents: Record<LegalRoute, LegalDocument> = {
  "/privacidad": {
    eyebrow: "Transparencia",
    title: "Política de privacidad",
    intro:
      "Esta información explica de forma clara qué datos utiliza DriveTransfer, por qué los necesita y cómo puedes controlarlos.",
    sections: [
      {
        title: "1. Información esencial",
        paragraphs: [
          commonResponsible,
          "Finalidades: prestar las funciones que solicitas, conservar tus trabajos privados, proteger la aplicación y, solo si lo aceptas, obtener estadísticas básicas de uso. Las bases jurídicas son la ejecución de las funciones solicitadas, tu consentimiento para las opciones voluntarias y el interés legítimo en mantener la seguridad.",
          "Puedes ejercer gratuitamente tus derechos escribiendo al correo indicado y reclamar ante la Agencia Española de Protección de Datos.",
        ],
      },
      {
        title: "2. Datos tratados y procedencia",
        items: [
          "Correo principal de la cuenta conectada, cuando sea necesario para identificar la sesión o enviar un aviso solicitado.",
          "Identificadores técnicos, metadatos y contenido de los archivos y carpetas de Google Drive que selecciones expresamente.",
          "Favoritos, filtros, conflictos, trabajos, resultados, programaciones y preferencias que configures.",
          "Datos técnicos de navegación y uso únicamente después de aceptar Google Analytics.",
          "Mensajes y datos de contacto que facilites voluntariamente al escribir por correo.",
        ],
      },
      {
        title: "3. Para qué y con qué base",
        paragraphs: [
          "DriveTransfer utiliza los datos de Google únicamente para mostrar el contenido elegido, preparar la comprobación previa, ejecutar la transferencia o sincronización, guardar avances y comunicar el resultado. Este tratamiento es necesario para atender la acción solicitada por el usuario.",
          "El envío opcional de avisos y Google Analytics se basan en el consentimiento, que puede retirarse en cualquier momento. La seguridad y prevención de abusos se apoyan en el interés legítimo, sin analizar el contenido de tus documentos con fines propios.",
          "No vendemos datos, no mostramos publicidad, no elaboramos perfiles comerciales, no tomamos decisiones automatizadas y no utilizamos los datos para entrenar modelos de inteligencia artificial.",
        ],
      },
      {
        title: "4. Google OAuth y permisos",
        paragraphs: [
          "La autenticación se realiza mediante Google OAuth. El token permanece únicamente en memoria durante la sesión: no se guarda en almacenamiento local, URLs, archivos ni registros. El permiso de Drive permite trabajar con los árboles y unidades compartidas que elijas y nunca amplía los permisos que ya tenga tu cuenta.",
          "Hasta completar la verificación de Google y disponer de un dominio propio, el acceso con Google está limitado a usuarios de prueba autorizados. Puedes revocar el acceso desde la sección de conexiones de seguridad de tu Cuenta de Google.",
        ],
      },
      {
        title: "5. Proveedores y transferencias internacionales",
        paragraphs: [
          "Google presta Identity Services, Drive API, Picker, Apps Script y, si lo aceptas, Google Analytics. Vercel aloja la interfaz pública. Estos proveedores pueden tratar datos fuera del Espacio Económico Europeo conforme a sus condiciones, acuerdos de tratamiento y mecanismos internacionales aplicables.",
          "No comunicamos datos a otros destinatarios salvo obligación legal. DriveTransfer no incorpora servidores ni bases de datos de terceros distintos de los proveedores identificados.",
        ],
      },
      {
        title: "6. Conservación",
        items: [
          "Token de acceso: solo mientras permanece abierta y válida la sesión.",
          "Trabajos reanudables: hasta 7 días desde su última actualización.",
          "Historial privado: hasta 90 días.",
          "Favoritos y programaciones: hasta que los elimines o suprimas todos los datos.",
          "Google Analytics: retención configurada al mínimo disponible de 2 meses.",
          "Consultas por correo: durante su resolución y, después, únicamente para atender posibles responsabilidades.",
        ],
      },
      {
        title: "7. Tus derechos y eliminación",
        paragraphs: [
          "Puedes solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad cuando procedan, así como retirar un consentimiento sin afectar al tratamiento anterior. El ejercicio es gratuito y se responderá normalmente en un mes, ampliable en los casos legalmente previstos.",
          "Puedes eliminar directamente la información privada creada por DriveTransfer desde la sección Privacidad y datos. También puedes escribir a " +
            contact +
            ". Es posible que debas volver a conectar tu cuenta, porque el titular no puede entrar unilateralmente en su espacio privado.",
          "Si consideras que tus derechos no han sido atendidos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).",
        ],
      },
      {
        title: "8. Seguridad y cambios",
        paragraphs: [
          "Aplicamos minimización, validación de entradas, operaciones por lotes, controles de permisos y errores seguros. Ninguna medida elimina por completo el riesgo; comunica cualquier incidencia al correo de contacto.",
          "Versión 1, vigente desde el 12 de agosto de 2026. Si cambia sustancialmente el tratamiento, actualizaremos esta página y volveremos a solicitar las preferencias que correspondan.",
        ],
      },
    ],
  },
  "/procedencia-datos": {
    eyebrow: "Datos y permisos",
    title: "Procedencia de los datos",
    intro:
      "DriveTransfer separa los ejemplos ficticios de la información que eliges voluntariamente desde tu cuenta de Google.",
    sections: [
      {
        title: "1. Modo exploración",
        paragraphs: [
          "El recorrido sin iniciar sesión utiliza exclusivamente carpetas, documentos, fechas, tamaños, permisos, conflictos y resultados ficticios incluidos en la aplicación. No representan personas, organizaciones ni archivos reales.",
        ],
      },
      {
        title: "2. Cuenta de Google",
        paragraphs: [
          "Al conectar Google, los datos proceden directamente de Google Drive y de tu selección en Google Picker. Pueden incluir Mi unidad y unidades compartidas a las que tu cuenta ya tenga acceso. La aplicación no obtiene información de fuentes ajenas ni amplía tus permisos.",
          "A partir de esos elementos se calculan rutas, conteos, tamaños, estimaciones, conflictos, duplicados y resultados. Los informes descargables excluyen identificadores internos.",
        ],
      },
      {
        title: "3. Origen del proyecto",
        paragraphs: [
          "DriveTransfer es una recreación técnica personal e independiente desarrollada desde cero para mostrar capacidades de producto e ingeniería aplicadas a una necesidad documental general.",
          "No contiene ni reproduce código, documentos, nombres, datos, diseños internos, procedimientos confidenciales, secretos empresariales o activos de empleadores, clientes u otras organizaciones. Tampoco atribuye a esas entidades la propiedad, patrocinio, aprobación o soporte del proyecto.",
        ],
      },
      {
        title: "4. Control del usuario",
        paragraphs: [
          "Antes de modificar Drive se muestran origen, destino, contenido y bloqueos. Nunca se sustituyen o eliminan archivos existentes de forma silenciosa. Los movimientos requieren una confirmación adicional y la copia es la opción predeterminada.",
        ],
      },
    ],
  },
  "/aviso-legal": {
    eyebrow: "Información del proyecto",
    title: "Aviso legal",
    intro:
      "Estas condiciones regulan DriveTransfer como proyecto personal de portfolio, gratuito y sin finalidad comercial.",
    sections: [
      {
        title: "1. Titular y contacto",
        paragraphs: [commonResponsible],
      },
      {
        title: "2. Finalidad y condiciones de uso",
        paragraphs: [
          "La aplicación permite comprobar y transferir contenido entre ubicaciones de Google Drive. Debes utilizar únicamente cuentas, unidades y archivos para los que tengas autorización suficiente, revisar la vista previa y conservar copias adecuadas de la información importante.",
          "No puedes utilizar el servicio para infringir derechos, eludir controles de acceso, distribuir contenido ilícito, introducir código dañino o interferir con Google, la aplicación o terceros.",
        ],
      },
      {
        title: "3. Disponibilidad y responsabilidad",
        paragraphs: [
          "El proyecto se ofrece gratuitamente y según disponibilidad. Puede verse afectado por cuotas, permisos, cambios o interrupciones de Google, Apps Script, Vercel, el navegador o la conexión. No sustituye una política profesional de copias de seguridad.",
          "El titular no responde de daños causados por instrucciones erróneas, falta de permisos, cambios externos o usos contrarios a estas condiciones, salvo las responsabilidades que la ley no permita excluir.",
        ],
      },
      {
        title: "4. Propiedad intelectual y marcas",
        paragraphs: [
          "El diseño, los textos, las ilustraciones y el código propio están protegidos por la normativa aplicable. Su publicación no concede derechos distintos de los expresamente indicados en el repositorio.",
          "Google Drive, Google Picker y las marcas y recursos oficiales de Google pertenecen a sus respectivos titulares. La interoperabilidad no implica afiliación, patrocinio o aprobación por Google ni por antiguos o actuales empleadores.",
        ],
      },
      {
        title: "5. Enlaces, cambios y legislación",
        paragraphs: [
          "Los enlaces externos conducen a servicios de terceros bajo sus propias condiciones. Este aviso puede actualizarse por cambios funcionales, jurídicos o de proveedores.",
          "Versión 1, vigente desde el 12 de agosto de 2026. Se aplica la legislación española, sin limitar los derechos imperativos que puedan corresponder al usuario.",
        ],
      },
    ],
  },
  "/cookies": {
    eyebrow: "Tus preferencias",
    title: "Cookies y almacenamiento local",
    intro:
      "La herramienta funciona con almacenamiento necesario. La medición con Google Analytics permanece apagada hasta que la aceptes.",
    sections: [
      {
        title: "1. Almacenamiento necesario",
        paragraphs: [
          "El navegador guarda la decisión de privacidad y, durante el uso, referencias opacas para reanudar un trabajo o el recorrido de exploración. Estas funciones son necesarias para recordar tu elección y ofrecer continuidad; no se utilizan con fines publicitarios.",
        ],
      },
      {
        title: "2. Google Analytics 4",
        paragraphs: [
          "Solo después de pulsar “Aceptar analítica” se carga Google Analytics para obtener estadísticas agregadas sobre visitas y uso de páginas. La configuración desactiva señales de Google, personalización publicitaria, remarketing y User-ID, y fija la retención mínima de 2 meses.",
          "Google puede crear cookies con nombres como _ga y _ga_<identificador>. Su duración técnica puede alcanzar 2 años, aunque puedes retirarlas en cualquier momento cambiando tus preferencias o desde el navegador.",
        ],
      },
      {
        title: "3. Cambiar o retirar el consentimiento",
        paragraphs: [
          "Puedes aceptar, rechazar o cambiar la analítica desde “Preferencias de privacidad”. Al retirarla se detienen nuevos envíos y se intentan eliminar las cookies de Analytics accesibles desde este dominio. También puedes borrar el almacenamiento desde la configuración del navegador.",
          "Versión 1, vigente desde el 12 de agosto de 2026.",
        ],
      },
    ],
  },
  "/eliminar-datos": {
    eyebrow: "Control de tus datos",
    title: "Eliminar tus datos",
    intro:
      "Puedes borrar los datos privados creados por DriveTransfer sin eliminar ni deshacer los archivos ya transferidos.",
    sections: [
      {
        title: "1. Eliminación desde la aplicación",
        paragraphs: [
          "Conecta la misma cuenta de Google, entra en Privacidad y datos y selecciona “Eliminar todos mis datos”. La herramienta borrará favoritos, filtros, trabajos, selecciones, conflictos, resultados, historial, programaciones, índices y el trigger de DriveTransfer. Después verificará el resultado y revocará la sesión.",
          "La acción no elimina archivos originales, copias, carpetas de destino ni otras operaciones terminadas en Google Drive. No puede deshacerse respecto a la configuración privada de la herramienta.",
        ],
      },
      {
        title: "2. Solicitud por correo",
        paragraphs: [
          "También puedes escribir a " +
            contact +
            " indicando que deseas ejercer el derecho de supresión. Para proteger tu cuenta podremos pedirte que vuelvas a conectar y ejecutes la eliminación, porque el titular no dispone de acceso unilateral a appDataFolder.",
        ],
      },
      {
        title: "3. Revocar Google",
        paragraphs: [
          "Además de borrar los datos de DriveTransfer, puedes revocar su autorización desde la configuración de seguridad de tu Cuenta de Google. Revocar el acceso por sí solo no borra los archivos privados de configuración; por eso recomendamos ejecutar primero la eliminación desde la aplicación.",
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
      <PrivacyPreferencesButton />
    </nav>
  );
}

export function LegalPage({ route }: { readonly route: LegalRoute }) {
  const document = documents[route];
  return (
    <main className="legal-page">
      <header className="legal-header">
        <a href="/" aria-label="Volver al inicio de DriveTransfer">
          <Brand compact />
        </a>
        <LegalLinks compact />
      </header>
      <article className="legal-document">
        <a className="legal-back" href="/">
          <ArrowLeft aria-hidden="true" /> Volver a DriveTransfer
        </a>
        <div className="legal-hero">
          <p>{document.eyebrow}</p>
          <h1>{document.title}</h1>
          <span>{document.intro}</span>
          <small>Versión 1 · vigente desde el 12 de agosto de 2026</small>
        </div>
        <div className="legal-content">
          {document.sections.map((section) => (
            <section key={section.title}>
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
