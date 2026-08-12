# DriveTransfer 1.0.0

Primera versión pública estable de DriveTransfer.

## Incluye

- Transferencias seguras entre Mi unidad y unidades compartidas.
- Vista previa obligatoria, detección de conflictos y modo solo comprobar.
- Copia predeterminada y confirmación reforzada para movimientos.
- Pausa, reanudación, reintentos e informes JSON/CSV seguros.
- Centro de trabajos, favoritos, programaciones e historial privado.
- Recorrido completo sin iniciar sesión con datos ficticios.
- Consentimiento de Analytics, eliminación de datos y políticas públicas.
- Interfaz responsive y accesible para móvil, tablet y escritorio.

## Seguridad y privacidad

- Tokens de Google solo en memoria.
- Validación y rate limiting por usuario y global en Apps Script.
- Operaciones por lotes, locks e idempotencia para reintentos seguros.
- Sin lectura ni ejecución de los bytes de los archivos transferidos.
- Desarrollo asistido por OpenAI Codex bajo revisión humana; Codex no recibe
  datos de usuarios durante el funcionamiento de DriveTransfer.

## Limitaciones

- El acceso público con Google permanece limitado a testers hasta que Google
  apruebe los permisos restringidos.
- Las cuotas y disponibilidad de Google Drive, Apps Script y Vercel siguen
  siendo dependencias externas.
