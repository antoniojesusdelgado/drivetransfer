# Arquitectura de DriveTransfer

## Límites del producto

- My Drive y unidades compartidas están soportados como origen y destino.
- Copiar es siempre la acción predeterminada.
- Mover exige una confirmación adicional y una comprobación posterior en destino.
- La vista previa es obligatoria; no se sobrescriben archivos de forma silenciosa.
- Los tokens, nombres e IDs no se escriben en logs.

## Flujo

```text
React UI
  -> Google Identity Services (token temporal en memoria)
  -> Google Picker (selección explícita)
  -> Apps Script Execution API (scripts.run)
  -> validación por usuario
  -> Drive API v3
```

El modo exploración usa el mismo dominio y las mismas pantallas mediante un ejecutor en memoria. No carga las bibliotecas de Google ni solicita permisos.

## Contratos

`DriveRuntimeGateway` separa la interfaz de Google. Expone inspección de carpetas, lectura paginada, ejecución de lotes y verificación. Cada lote admite como máximo diez mutaciones.

Una operación incluye un identificador opaco, el elemento de origen y su ruta relativa. Apps Script no confía en esos datos: comprueba que el elemento sigue dentro del origen autorizado, que el destino no pertenece al árbol de origen y que nombres, tipos y permisos coinciden con Drive.

## Idempotencia y recuperación

Las copias creadas por la aplicación reciben `appProperties.driveTransferOperationKey`. Antes de reintentar, DriveTransfer busca esa clave y reutiliza el resultado. Los movimientos nativos preservan las propiedades existentes y añaden la misma clave.

Los límites temporales producen un estado reintentable. Pausar impide enviar lotes nuevos; una llamada ya iniciada termina de forma segura. Cancelar o cerrar la página no intenta revertir cambios completados.

## Preferencias y continuidad

Antes de ejecutar, el plan calcula archivos, carpetas, tamaño conocido, bloqueos y una estimación orientativa. Los duplicados pueden omitirse, conservarse con un nombre nuevo o detenerse para revisión; nunca se reemplazan silenciosamente.

`DriveRuntimeGateway` también expone favoritos y recuperación de trabajos. Las rutas favoritas y el estado mínimo de reanudación se guardan en `UserProperties`, separados por usuario. Los trabajos se dividen en fragmentos, se limitan a 5.000 selecciones, caducan tras siete días y se eliminan al completar o descartar.

El navegador conserva únicamente el identificador opaco del trabajo. No guarda tokens, nombres ni IDs de Drive. Los avisos de finalización utilizan el permiso estándar del navegador y solo se solicitan cuando la persona los activa.

## Persistencia, cola y programaciones

El gateway también expone favoritos, centro de trabajos, programaciones, historial y recuperación. Los documentos privados se guardan versionados en appDataFolder; manifiesto, selección y checkpoints permanecen separados. UserProperties conserva únicamente índices pequeños, la versión del esquema y el identificador del trigger. La migración del formato anterior borra el original solo después de escribir y verificar la copia.

Solo puede existir un trabajo en curso por usuario; el resto permanece en una cola ordenada. Un único trigger periódico por usuario activa el dispatcher, que usa LockService.getUserLock() para evitar carreras. Los trabajos extensos conservan checkpoints privados y continúan en ejecuciones posteriores.

Las programaciones admiten una ejecución, frecuencia diaria, semanal o mensual. Solo crean copias o sincronizaciones: mover continúa siendo una acción interactiva con confirmación reforzada. La sincronización es unidireccional y conservadora; añade archivos nuevos y crea una copia fechada de los modificados, sin retirar ni sustituir contenido del destino.

El historial se conserva durante 90 días y se poda automáticamente. Los avisos por correo son opcionales, se envían únicamente a la cuenta activa y la dirección no se persiste.

## Movimiento entre espacios

Los archivos compatibles se mueven actualizando sus padres. Una carpeta no puede pasar de My Drive a una unidad compartida mediante un único cambio de padre, por lo que se reconstruye el destino, se procesan primero los descendientes y solo se retira la carpeta de origen si ha quedado vacía. Si permanece cualquier elemento, el origen se conserva y el resultado requiere atención.

## OAuth

El MVP solicita `https://www.googleapis.com/auth/drive` para recorrer y modificar árboles completos seleccionados por la persona. Es un scope restringido: antes de abrir OAuth a usuarios externos será necesario completar la verificación de Google y revisar los requisitos aplicables.

El token solo vive en memoria del navegador, se envía a `script.googleapis.com` mediante el encabezado `Authorization` y se revoca al salir. No se incluye en URLs, almacenamiento web, respuestas de error o telemetría.
