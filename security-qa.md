# Validación de seguridad y sistema

Fecha: 13 de agosto de 2026

Versión: 1.0.1

## Alcance

DriveTransfer es una aplicación React estática alojada en Vercel. Las operaciones
autorizadas se envían directamente a Apps Script y se ejecutan con la identidad
del usuario. El navegador y Apps Script no reciben, analizan ni ejecutan los bytes
de los archivos; Google Drive realiza la copia o movimiento internamente.

## Controles implementados

- Tokens OAuth solo en memoria y fuera de URLs, logs y almacenamiento persistente.
- Validación de IDs, claves opacas, comandos, espacios, nombres, MIME, tamaños,
  padres, rutas y esquemas antes de almacenar o mutar.
- Reconsulta inmediata de origen, destino, permisos, capacidades, pertenencia al
  árbol y ciclos antes de cada operación.
- Reutilización idempotente limitada al destino previsto y con coincidencia de
  nombre, MIME y tamaño conocido.
- Máximo de 100 lecturas por página, 10 mutaciones por lote y 100 claves por
  verificación.
- Límites por usuario de 240 lecturas, 90 escrituras y 60 lotes por minuto; y
  globales de 1.000, 300 y 180.
- Locks por usuario y globales para límites y mutaciones concurrentes.
- Documentos privados versionados y limitados a 450 KB antes de leer y escribir.
- Renderizado React sin HTML crudo, código dinámico ni URLs externas controladas.
- CSV con fórmulas neutralizadas e informes sin identificadores internos.
- CSP, HSTS, anti-framing, `nosniff`, permisos restrictivos y política de referrer.
- Sin logs de aplicación que incluyan tokens, IDs o nombres de Drive.

## Pruebas de abuso

- HTML, eventos, URLs `javascript:`, fórmulas CSV y caracteres de control.
- IDs, claves, MIME, nombres, tamaños, padres y metadatos falsificados.
- Payloads, páginas, documentos privados y listas por encima de los límites.
- Repetición de lotes, claves duplicadas, concurrencia y estados ilegales.
- Sesión caducada, permisos insuficientes, cuota agotada y fallo parcial.
- Búsqueda de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`,
  secretos rastreados y archivos de entorno.

## Evidencias de cierre

- Formato, ESLint y TypeScript: superados.
- Vitest: 17 archivos y 51 pruebas superadas.
- Build web, build Apps Script y verificación del artefacto: superados.
- Auditoría npm completa y de producción: 0 vulnerabilidades conocidas.
- Búsqueda de secretos, HTML dinámico, ejecución de código y logs sensibles: sin
  hallazgos en código de producción.
- Responsive local en 390, 768, 1024 y 1488 px: sin desbordamiento horizontal.
- CodeQL: configurado como control obligatorio del PR y de `main`.

## Riesgo residual

Ninguna aplicación expuesta a Internet puede garantizar que sea imposible de
atacar. Persisten dependencias de Google, Vercel, permisos concedidos y cuotas.
DriveTransfer reduce el abuso con validación, límites e idempotencia, pero no es
un antivirus y no puede certificar la seguridad de un archivo cuando otra
aplicación lo abra.
