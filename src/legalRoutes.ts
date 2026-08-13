export type LegalRoute =
  | "/privacidad"
  | "/procedencia-datos"
  | "/aviso-legal"
  | "/cookies"
  | "/eliminar-datos"
  | "/transparencia-ia";

export const legalRoutes = new Set<LegalRoute>([
  "/privacidad",
  "/procedencia-datos",
  "/aviso-legal",
  "/cookies",
  "/eliminar-datos",
  "/transparencia-ia",
]);
