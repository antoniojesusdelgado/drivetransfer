# Configuración de Google para desarrollo

Utiliza una cuenta y carpetas dedicadas exclusivamente a pruebas.

## Proyecto de Google Cloud

1. Crea un proyecto Cloud estándar.
2. Activa Google Drive API, Google Picker API y Google Apps Script API.
3. Configura la pantalla de consentimiento OAuth como aplicación externa en modo de prueba.
4. Añade únicamente cuentas de desarrollo como usuarios de prueba.
5. Declara `https://www.googleapis.com/auth/drive`.
6. Crea un OAuth Client ID de tipo Web application.
7. Añade `http://localhost:5173` como origen JavaScript autorizado.

## Google Picker

Crea una API key limitada a Google Picker API. Restringe sus HTTP referrers a `http://localhost:5173/*` y, cuando exista, al hostname público exacto. La clave se entrega al navegador por requisito de Picker, pero no concede acceso a Drive por sí sola.

## Apps Script

1. Crea un proyecto standalone y asígnale el mismo proyecto Cloud estándar.
2. Copia `.clasp.example.json` como `.clasp.json` y añade solo el `scriptId` local.
3. Compila y carga el proyecto:

```powershell
npm run build:apps-script
npm run clasp -- push
```

4. Despliega el script como **API Executable** con acceso para cualquier usuario autorizado.
5. Conserva el Web App como herramienta de comprobación, ejecutándose como la persona que accede; nunca como el propietario.

## Variables del frontend

Copia `.env.example` como `.env.local`:

```text
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_API_KEY=...
VITE_GOOGLE_APP_ID=...
VITE_APPS_SCRIPT_DEPLOYMENT_ID=...
VITE_GA_MEASUREMENT_ID=...
```

`VITE_GOOGLE_APP_ID` es el número del proyecto Cloud. `VITE_APPS_SCRIPT_DEPLOYMENT_ID` corresponde al despliegue del ejecutable API.

`VITE_GA_MEASUREMENT_ID` es opcional. La etiqueta de Google Analytics no se
carga ni realiza solicitudes hasta que el visitante acepta expresamente la
analítica desde el panel de privacidad.

## Prueba mínima

1. Completa el recorrido de exploración sin cuenta.
2. Conecta una cuenta de desarrollo y cancela una vez el consentimiento.
3. Repite autorizando y selecciona dos carpetas distintas.
4. Prueba copia y movimiento en My Drive.
5. Repite con una unidad compartida y en ambas direcciones entre espacios.
6. Comprueba permisos limitados, duplicados, pausa, reintento y token caducado.
7. Revisa que los registros no contengan tokens, nombres ni IDs.
8. Crea una programación y comprueba que solo exista un trigger dispatcher por usuario.
9. Verifica la reanudación desde otro navegador con la misma cuenta y la limpieza del historial de más de 90 días.

La publicación, el dominio y la apertura del consentimiento OAuth a usuarios externos quedan fuera de esta fase.

## Pruebas de continuidad

Además del recorrido básico, comprueba las tres reglas de duplicados, favoritos, cierre y reanudación, descarte de un trabajo guardado, reintento selectivo y avisos del navegador. Confirma que favoritos y trabajos pertenecen únicamente a la cuenta conectada y que los registros no contienen tokens, nombres ni IDs.

## Alojamiento web

El frontend puede publicarse en Vercel como aplicación Vite. `vercel.json` aplica cabeceras defensivas compatibles con Google Identity Services y Picker. Mantén `Cross-Origin-Opener-Policy: same-origin-allow-popups`; un aislamiento más estricto impediría el flujo OAuth emergente.
