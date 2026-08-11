# Prompt inicial para el proyecto DriveTransfer

Copia y pega el siguiente texto como primer mensaje en un nuevo proyecto de Codex cuya carpeta sea `C:\Users\anton\Projects\drive-transfer-demo`.

---

Quiero desarrollar **DriveTransfer**, una replica publica e independiente de una herramienta que cree para resolver una necesidad operativa real en Fundacion Cibervoluntarios.

## Problema que resuelve

Las justificaciones economicas de proyectos financiados por administraciones publicas requieren reunir miles de documentos justificativos: facturas entrantes, hojas de gasto, recibos, contratos de trabajo, nominas y justificantes de pago. La documentacion se gestiona principalmente en Google Workspace y antes se trasladaba manualmente, archivo por archivo, desde las carpetas de origen hasta la carpeta de cada proyecto.

La herramienta original se desarrollo con Google Apps Script. Permitía indicar una carpeta de Google Drive de origen y otra de destino, indexar recursivamente los directorios, seleccionar archivos, evitar duplicados, copiar la seleccion, mostrar el progreso y presentar un resumen final.

## Objetivo de la replica

Construir una version mantenible, segura y demostrable que permita **copiar y mover** archivos y carpetas. Debe mejorar la experiencia original sin revelar informacion de la Fundacion.

Flujo esperado:

1. Autenticacion con Google y permisos minimos.
2. Seleccion y validacion de carpeta origen y destino.
3. Indexacion recursiva, paginada y consciente de las cuotas de Google.
4. Arbol navegable con busqueda, filtros y seleccion parcial o masiva.
5. Eleccion explicita entre copiar y mover; copiar sera la opcion predeterminada.
6. Simulacion previa obligatoria con conteos, duplicados, permisos y advertencias.
7. Confirmacion adicional antes de mover.
8. Ejecucion por lotes, progreso, cancelacion segura y reanudacion tras errores o limites de tiempo.
9. Dashboard final con elementos copiados, movidos, omitidos, duplicados y fallidos.
10. Modo demo completamente sintetico, sin necesidad de acceder a una cuenta real.

## Limites obligatorios

- No uses ni solicites IDs reales de carpetas, documentos, nombres de expedientes, credenciales, tokens o procedimientos internos.
- No incluyas datos empresariales ni documentacion real en codigo, fixtures, capturas, logs o pruebas.
- No presentes el repositorio como producto oficial, patrocinado o mantenido por Fundacion Cibervoluntarios.
- No inventes metricas, ahorros, usuarios, tecnologias o resultados.
- No registres nombres de archivos, IDs de Drive ni tokens en analitica o logs.
- No permitas sobrescrituras silenciosas.
- No hagas commit, push, PR, despliegue o release sin mi autorizacion expresa.

## Direccion tecnica inicial

Evalua primero una aplicacion Google Apps Script escrita en TypeScript y gestionada con `clasp`, porque es la base funcional del proyecto original. Antes de implementarla, compara de forma concreta sus limites de ejecucion, OAuth, pruebas, interfaz y operaciones masivas con una alternativa de frontend web y backend. Solo cambia de arquitectura si existe una razon tecnica verificable.

Separa como minimo estos dominios:

- Autenticacion y permisos.
- Indexacion y paginacion de Drive.
- Arbol y seleccion.
- Plan de transferencia y deteccion de duplicados.
- Ejecucion copiable/reanudable.
- Progreso y resultados.
- Demo sintetica.

Modela copiar y mover como comandos distintos. Diseña idempotencia, reintentos y recuperacion frente a cuotas, permisos insuficientes, archivos eliminados durante el proceso y ejecuciones parciales.

## Forma de trabajo

1. Lee completamente `AGENTS.md`, `README.md` y `PROJECT_BRIEF.md`.
2. Comprueba ruta, rama, estado Git, remoto y archivos existentes.
3. Audita el alcance y plantea una arquitectura y un roadmap por fases.
4. Señala las decisiones que cambien materialmente el producto. Hazme solo las preguntas realmente necesarias.
5. Propón el primer vertical slice verificable antes de crear una base extensa.
6. Implementa con TypeScript, tipos de dominio explícitos, módulos pequeños, pruebas y documentación natural.
7. Verifica formato, lint, tipos, tests, build, accesibilidad, seguridad y responsive según avance el proyecto.
8. Conserva cualquier cambio previo y termina cada fase con un resumen exacto de modificaciones y validaciones.

Empieza ahora revisando el repositorio y entregándome:

- La arquitectura recomendada y sus alternativas descartadas.
- El modelo de seguridad y permisos de Google Drive.
- El modelo de datos y estados de una transferencia.
- El roadmap del MVP.
- Las preguntas mínimas que necesites resolver antes de implementar.

---
