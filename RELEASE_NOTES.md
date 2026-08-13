# DriveTransfer 1.0.2

Actualización de estabilidad, autorización con Google y presentación responsive.

## Cambios

- Añadido el permiso privado de `appDataFolder` al flujo de autorización.
- Corregidos los desbordamientos de nombres largos en revisión y confirmación.
- Ajustados los títulos legales para pantallas móviles estrechas.
- Restablecida la posición de desplazamiento al cambiar de fase o sección.
- Revalidada la interfaz en 390, 768, 1024 y 1488 píxeles.

## Seguridad

- El contenido de los archivos permanece en Google Drive y nunca se ejecuta en
  aplicación.
- Los tokens OAuth se mantienen únicamente en memoria.
- Los datos privados de DriveTransfer se aíslan en `appDataFolder`.

## Limitaciones conocidas

- DriveTransfer no es un antivirus y no certifica la seguridad de un archivo al
  abrirlo con otra aplicación.
- La apertura general de OAuth depende de la verificación de Google para los
  permisos restringidos.
