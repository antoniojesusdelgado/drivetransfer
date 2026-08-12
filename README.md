# DriveTransfer

DriveTransfer es una recreación técnica personal, gratuita y no comercial,
desarrollada desde cero para portfolio. No contiene código, documentos, datos,
procedimientos internos ni activos de empleadores o clientes, y no está
patrocinada ni respaldada por Google.

La información legal pública está disponible en `/privacidad`,
`/procedencia-datos`, `/aviso-legal`, `/cookies` y `/eliminar-datos`.

DriveTransfer ayuda a elegir, revisar y transferir archivos entre carpetas de Google Drive. Admite My Drive y unidades compartidas, detecta duplicados antes de empezar y mantiene copia y movimiento como acciones separadas.

## Experiencia

- Acceso con Google mediante Google Identity Services y Google Picker.
- Recorrido completo sin iniciar sesión usando archivos de ejemplo.
- Selección jerárquica, búsqueda y acciones masivas.
- Vista previa obligatoria antes de cualquier cambio.
- Copia predeterminada y confirmación adicional para mover.
- Progreso pausable, reintentos seguros e informe final sin identificadores internos.

- Comprobación previa de volumen, permisos, conflictos y tiempo estimado.
- Reglas de duplicados para omitir, conservar ambos o detenerse a revisar.
- Rutas favoritas privadas, reanudación durante siete días y avisos al terminar.
- Reintento exclusivo de los elementos fallidos sin repetir los completados.
- Centro privado con trabajos activos, en cola, pausados y terminados.
- Modo «Solo comprobar», filtros combinables y resolución individual o masiva de conflictos.
- Programaciones únicas, diarias, semanales y mensuales para copias y sincronizaciones conservadoras.
- Historial privado de 90 días e informes JSON/CSV sin identificadores internos.

## Arquitectura

El frontend React/Vite se carga de forma independiente. Cuando una persona conecta Google, conserva el token de acceso únicamente en memoria y llama a un ejecutable de Apps Script mediante `scripts.run`. Apps Script vuelve a validar cada solicitud y ejecuta Drive API v3 con los permisos de esa persona.

Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para las decisiones de seguridad y [DEPLOYMENT.md](DEPLOYMENT.md) para configurar un entorno de desarrollo.

## Desarrollo local

Requisitos: Node.js 24 y npm 11 o versiones compatibles.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Sin variables de Google, la experiencia de exploración continúa disponible y el botón de conexión muestra un aviso seguro.

Comprobaciones:

```powershell
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

## Privacidad

No incluyas credenciales, tokens, nombres reales, IDs de carpetas ni documentos privados en el repositorio, pruebas o capturas. Las variables `VITE_*` son identificadores públicos del cliente web; la API key debe limitarse por HTTP referrer y exclusivamente a Google Picker API.

La aplicación publica información para usuarios en `/privacidad`, `/procedencia-datos` y `/aviso-legal`. Revisa esos textos cuando cambien los permisos, los proveedores, la conservación o las funciones de DriveTransfer.
