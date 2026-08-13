import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { legalRoutes } from "../src/legalRoutes";
import { LegalPage } from "../src/ui/LegalPages";

describe("legal pages", () => {
  it("exposes all public legal routes", () => {
    expect([...legalRoutes]).toEqual([
      "/privacidad",
      "/procedencia-datos",
      "/aviso-legal",
      "/cookies",
      "/eliminar-datos",
      "/transparencia-ia",
    ]);
  });

  it("identifies the responsible person and explains retention", () => {
    const html = renderToStaticMarkup(<LegalPage route="/privacidad" />);

    expect(html).toContain("Antonio Jesús Delgado Briones");
    expect(html).toContain("contacto@antoniodelgado.tech");
    expect(html).toContain("hasta 7 días");
    expect(html).toContain("hasta 90 días");
    expect(html).toContain("2 meses");
    expect(html).not.toContain("ChatGPT Codex");
    expect(html).toContain("Versión 1.0.1");
  });

  it("keeps legal navigation in the footer without duplicating it", () => {
    const html = renderToStaticMarkup(<LegalPage route="/privacidad" />);

    expect(html.match(/<nav/g)).toHaveLength(1);
    expect(html).toContain("Volver a DriveTransfer");
  });

  it("identifies exploration content and independent origin", () => {
    const html = renderToStaticMarkup(<LegalPage route="/procedencia-datos" />);

    expect(html).toContain("únicamente");
    expect(html).toContain("recreación técnica personal");
    expect(html).toContain("secretos empresariales");
    expect(html).not.toContain("ChatGPT Codex");
  });

  it("concentra la información sobre IA en una página independiente", () => {
    const html = renderToStaticMarkup(<LegalPage route="/transparencia-ia" />);

    expect(html).toContain("ChatGPT Codex");
    expect(html).toContain("no forma parte de DriveTransfer");
    expect(html).toContain("No representa una certificación");
    expect(html).toContain("Distintivo europeo de contenido elaborado");
  });

  it("explains analytics consent and safe deletion", () => {
    const cookies = renderToStaticMarkup(<LegalPage route="/cookies" />);
    const deletion = renderToStaticMarkup(
      <LegalPage route="/eliminar-datos" />,
    );

    expect(cookies).toContain("Solo después");
    expect(cookies).toContain("_ga");
    expect(deletion).toContain("no elimina archivos originales");
  });
});
