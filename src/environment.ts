export function normalizePublicEnvironmentValue(
  value: string | undefined,
): string {
  return (value ?? "").replace(/^\uFEFF+/, "").trim();
}
