import euAiLabel from "../assets/eu-ai-label.svg";

export function AiTransparencyMark() {
  return (
    <div className="ai-transparency-mark">
      <img
        src={euAiLabel}
        alt="Distintivo europeo de contenido elaborado con asistencia de inteligencia artificial"
      />
      <span>Desarrollo asistido por IA</span>
    </div>
  );
}
