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

## Movimiento entre espacios

Los archivos compatibles se mueven actualizando sus padres. Una carpeta no puede pasar de My Drive a una unidad compartida mediante un único cambio de padre, por lo que se reconstruye el destino, se procesan primero los descendientes y solo se retira la carpeta de origen si ha quedado vacía. Si permanece cualquier elemento, el origen se conserva y el resultado requiere atención.

## OAuth

El MVP solicita `https://www.googleapis.com/auth/drive` para recorrer y modificar árboles completos seleccionados por la persona. Es un scope restringido: antes de abrir OAuth a usuarios externos será necesario completar la verificación de Google y revisar los requisitos aplicables.

El token solo vive en memoria del navegador, se envía a `script.googleapis.com` mediante el encabezado `Authorization` y se revoca al salir. No se incluye en URLs, almacenamiento web, respuestas de error o telemetría.
