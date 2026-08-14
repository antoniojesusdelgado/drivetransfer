# Validación de seguridad y sistema

Fecha: 13 de agosto de 2026

Versión: 1.0.2

## Alcance

DriveTransfer es una aplicación React estática alojada en Vercel. Las operaciones
autorizadas se envían directamente a Apps Script y se ejecutan con la identidad
del usuario. El navegador y Apps Script no reciben, analizan ni ejecutan los bytes
de los archivos; Google Drive realiza la copia o movimiento internamente.

## Controles implementados

- Tokens OAuth solo en memoria y fuera de URLs, registros y almacenamiento persistente.
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
- Bloqueos por usuario y globales para límites y mutaciones concurrentes.
- Documentos privados versionados y limitados a 450 KB antes de leer y escribir.
- Renderizado React sin HTML crudo, código dinámico ni URLs externas controladas.
- CSV con fórmulas neutralizadas e informes sin identificadores internos.
- CSP, HSTS, anti-framing, `nosniff`, permisos restrictivos y política de referrer.
- Sin registros de aplicación que incluyan tokens, IDs o nombres de Drive.

## Pruebas de abuso

- HTML, eventos, URLs `javascript:`, fórmulas CSV y caracteres de control.
- IDs, claves, MIME, nombres, tamaños, padres y metadatos falsificados.
- Cargas, páginas, documentos privados y listas por encima de los límites.
- Repetición de lotes, claves duplicadas, concurrencia y estados ilegales.
- Sesión caducada, permisos insuficientes, cuota agotada y fallo parcial.
- Búsqueda de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`,
  secretos rastreados y archivos de entorno.

## Evidencias de cierre

- Formato, ESLint y TypeScript: superados.
- Vitest: 17 archivos y 51 pruebas superadas.
- Compilación web, compilación de Apps Script y verificación del artefacto: superadas.
- Auditoría npm completa y de producción: 0 vulnerabilidades conocidas.
- Búsqueda de secretos, HTML dinámico, ejecución de código y registros sensibles: sin
  hallazgos en código de producción.
- Diseño adaptable local en 390, 768, 1024 y 1488 px: sin desbordamiento horizontal.
- GitHub Actions: Calidad y CodeQL superados en el PR de publicación y en el
  parche final de `main`.
- CodeQL sobre `main`: 0 alertas abiertas y 0 hallazgos de severidad alta o
  crítica.
- Producción: rutas legales, `sitemap.xml`, HTTPS y cabeceras de seguridad verificados
  en `https://drivetransfer.app`.
- Apps Script: despliegue estable `DriveTransfer 1.0.2` actualizado a la versión 12.

## Riesgo residual

Ninguna aplicación expuesta a Internet puede garantizar que sea imposible de
atacar. Persisten dependencias de Google, Vercel, permisos concedidos y cuotas.
DriveTransfer reduce el abuso con validación, límites e idempotencia, pero no es
un antivirus y no puede certificar la seguridad de un archivo cuando otra
aplicación lo abra.
