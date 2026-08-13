import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const security = readFileSync("apps-script/src/Security.ts", "utf8");
const driveService = readFileSync("apps-script/src/DriveService.ts", "utf8");
const appData = readFileSync("apps-script/src/AppDataStore.ts", "utf8");
const clientSources = [
  readFileSync("src/App.tsx", "utf8"),
  readFileSync("src/ui/DriveTreeView.tsx", "utf8"),
  readFileSync("src/ui/WorkspaceViews.tsx", "utf8"),
].join("\n");

describe("contrato de seguridad", () => {
  it("mantiene límites de uso y lotes en el runtime autorizado", () => {
    expect(security).toContain("read: 240");
    expect(security).toContain("write: 90");
    expect(security).toContain("transfer: 60");
    expect(security).toContain("const MAX_BATCH_SIZE = 10");
  });

  it("revalida metadatos y pertenencia antes de mutar", () => {
    expect(driveService).toContain("isWithinRoot(operation.sourceId");
    expect(driveService).toContain("source.name !== operation.name");
    expect(driveService).toContain(
      "String(source.size) !== String(operation.size)",
    );
    expect(driveService).toContain("includes(operation.sourceParentId)");
  });

  it("limita y versiona documentos privados", () => {
    expect(appData).toContain("const MAX_DOCUMENT_BYTES = 450_000");
    expect(appData).toContain("schemaVersion !== APP_DATA_SCHEMA");
    expect(appData).toContain("requirePrivateDocumentReference");
  });

  it("no usa primitivas de ejecución o HTML dinámico", () => {
    expect(clientSources).not.toContain("dangerouslySetInnerHTML");
    expect(clientSources).not.toMatch(/\b(?:eval|Function)\s*\(/);
    expect(clientSources).not.toContain(".innerHTML");
  });
});
