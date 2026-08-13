# Contexto inicial del proyecto

DriveTransfer nació como una solución técnica personal que presenta una forma
segura de organizar grandes volúmenes de archivos en Google Drive. El repositorio
público se desarrolló desde cero y no reproduce código, documentos, datos,
estructuras, métricas ni procedimientos de ninguna organización.

## Objetivos originales

- Seleccionar origen y destino en Mi unidad o unidades compartidas.
- Indexar de forma paginada y respetar cuotas de Google.
- Elegir archivos mediante un árbol accesible con búsqueda y selección parcial.
- Separar copia y movimiento, con copia predeterminada.
- Comprobar conflictos y permisos antes de modificar Drive.
- Ejecutar lotes reanudables e idempotentes.
- Mostrar progreso y resultados sin identificadores internos.
- Ofrecer un recorrido público con datos exclusivamente ficticios.

## Límites permanentes

- No incluir datos, credenciales, documentos ni identificadores reales.
- No inferir ni publicar estructuras o procedimientos internos de terceros.
- No permitir sobrescrituras silenciosas.
- No registrar tokens, nombres o IDs de Drive.
- Mantener una comprobación previa y confirmación adicional para mover.

La arquitectura y las decisiones actuales se documentan en
[ARCHITECTURE.md](ARCHITECTURE.md) y [SECURITY.md](SECURITY.md).
