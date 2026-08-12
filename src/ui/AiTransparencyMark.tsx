import euAiLabel from "../assets/eu-ai-label.svg";

export function AiTransparencyMark() {
  return (
    <a
      className="ai-transparency-mark"
      href="/procedencia-datos#desarrollo-asistido-por-ia"
      aria-label="Información sobre el desarrollo asistido por inteligencia artificial"
    >
      <img src={euAiLabel} alt="" aria-hidden="true" />
      <span>Desarrollo asistido por IA</span>
    </a>
  );
}
