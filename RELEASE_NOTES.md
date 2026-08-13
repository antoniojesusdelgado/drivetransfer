# DriveTransfer 1.0.1

Versión pública de cierre para portfolio.

## Cambios

- Nueva página independiente `/transparencia-ia` y enlace legal discreto.
- Distintivo europeo visible únicamente dentro de esa página.
- Revalidación reforzada de padre, tipo, tamaño y resultados idempotentes.
- Índices privados filtrados y documentos versionados con validación estricta.
- Documentación técnica, diagramas y políticas consolidados en español.
- Automatizaciones de calidad, seguridad, CodeQL y dependencias para GitHub.

## Seguridad

- El contenido de archivos permanece en Google Drive y nunca se ejecuta en la
  aplicación.
- Límites por usuario y globales, lotes de diez y locks para mutaciones.
- Tokens en memoria, errores seguros, CSV neutralizado y cabeceras defensivas.

## Limitaciones conocidas

- DriveTransfer no es un antivirus y no certifica la seguridad de un archivo al
  abrirlo con otra aplicación.
- La apertura general de OAuth depende de la verificación de Google para los
  permisos restringidos.
