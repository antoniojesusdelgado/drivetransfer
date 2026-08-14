# Seguridad

## Comunicar una vulnerabilidad

Envía los detalles de forma privada a `contacto@antoniodelgado.tech`. No publiques
tokens, IDs de Drive, nombres de archivos, documentos ni datos personales en una
incidencia de GitHub.

Incluye una descripción reproducible, impacto estimado y versión afectada. Se
acusará recibo lo antes posible y se priorizarán los hallazgos críticos y altos.
No realices pruebas destructivas, de denegación de servicio ni contra cuentas o
datos de terceros.

## Modelo de seguridad

- El token OAuth existe solo en memoria y se envía únicamente a Google.
- Apps Script revalida todas las referencias y permisos antes de mutar Drive.
- Las lecturas se limitan a 100 elementos y las mutaciones a 10 por lote.
- Hay límites por usuario y globales, además de bloqueos para evitar concurrencia.
- Los reintentos son idempotentes mediante claves opacas.
- React escapa el contenido externo y no se admite HTML ni código ejecutable.
- Los informes CSV neutralizan fórmulas y no incluyen identificadores internos.
- Los documentos privados están versionados, limitados y aislados por usuario.
- CSP, HSTS, anti-framing y otras cabeceras reducen la superficie del navegador.

## Archivos potencialmente dañinos

DriveTransfer no descarga, interpreta ni ejecuta los bytes de un archivo. Google
Drive copia o mueve el objeto dentro de su plataforma. Se validan referencia,
nombre, MIME, tamaño conocido, ubicación, permisos y capacidades, pero la
herramienta no es un antivirus y no puede certificar que el documento sea seguro
cuando otra aplicación lo abra posteriormente.

## Límites de uso

| Ámbito     | Lecturas/min | Escrituras/min | Lotes/min |
| ---------- | -----------: | -------------: | --------: |
| Usuario    |          240 |             90 |        60 |
| Aplicación |        1.000 |            300 |       180 |

Las cuotas de Google constituyen un límite adicional. Una aplicación conectada a
servicios externos nunca puede declararse imposible de atacar; la publicación
requiere cerrar hallazgos críticos y altos y documentar los riesgos residuales.
