# Instrucciones para agentes

## Idioma

- Responder al usuario en español.
- Usar inglés para código, identificadores, ramas y commits.
- Mantener la documentación pública en español natural.

## Límites del producto

- DriveTransfer es un proyecto personal e independiente de portafolio.
- Usar únicamente árboles, archivos y metadatos ficticios en pruebas y capturas.
- No incluir IDs, documentos, credenciales, procedimientos ni datos reales.
- No atribuir patrocinio, propiedad o aprobación a Google ni a terceros.

## Ingeniería

- Inspeccionar rama, estado y arquitectura antes de modificar.
- Mantener ámbitos OAuth mínimos y tokens fuera de almacenamiento y registros.
- Separar descubrimiento, selección, conflictos, ejecución y resultados.
- Copiar es predeterminado; mover exige confirmación adicional.
- Ejecutar una comprobación previa antes de cualquier mutación.
- Diseñar operaciones idempotentes, paginadas y seguras ante fallos parciales.
- Respetar cuotas de Apps Script y Drive API.

## Control de cambios

- Preservar los cambios del usuario y evitar operaciones destructivas.
- No hacer commit, push, PR, release o despliegue sin autorización expresa.
- No reescribir historial ni forzar push.

## Validación

- Ejecutar formato, análisis estático, tipos, pruebas y compilación.
- Probar duplicados, permisos, fallos parciales, reintentos y confirmación.
- Revisar accesibilidad, diseño adaptable, privacidad y seguridad en cada flujo público.
