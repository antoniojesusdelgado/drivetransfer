# DriveTransfer

**Versión 1.0.2** · [drivetransfer.app](https://drivetransfer.app)

[![Versión publicada](https://img.shields.io/github/v/release/antoniojesusdelgado/drivetransfer?label=versi%C3%B3n)](https://github.com/antoniojesusdelgado/drivetransfer/releases/latest)
[![Calidad](https://github.com/antoniojesusdelgado/drivetransfer/actions/workflows/quality.yml/badge.svg)](https://github.com/antoniojesusdelgado/drivetransfer/actions/workflows/quality.yml)
[![CodeQL](https://github.com/antoniojesusdelgado/drivetransfer/actions/workflows/codeql.yml/badge.svg)](https://github.com/antoniojesusdelgado/drivetransfer/actions/workflows/codeql.yml)
![Derechos reservados](https://img.shields.io/badge/licencia-derechos%20reservados-0b5b4f)

DriveTransfer permite elegir, revisar y transferir archivos entre carpetas de
Google Drive con una vista previa obligatoria. Funciona con Mi unidad y unidades
compartidas, mantiene la copia como opción predeterminada y exige una
confirmación adicional para mover.

Es un proyecto personal, gratuito y no comercial de portafolio. Todos los
ejemplos, pruebas y capturas públicas emplean datos ficticios. No está afiliado,
patrocinado ni aprobado por Google ni por empleadores o clientes.

[Probar DriveTransfer](https://drivetransfer.app) ·
[Ver la última versión](https://github.com/antoniojesusdelgado/drivetransfer/releases/latest) ·
[Consultar seguridad](SECURITY.md) · [Configurar el proyecto](DEPLOYMENT.md)

![Portada de DriveTransfer](artifacts/design-qa/landing-desktop-after.png)

## Contenido

- [Funciones principales](#funciones-principales)
- [Cómo funciona](#cómo-funciona)
- [Arquitectura resumida](#arquitectura-resumida)
- [Desarrollo local](#desarrollo-local)
- [Validación](#validación)
- [Privacidad y transparencia](#privacidad-y-transparencia)
- [Derechos](#derechos)

## Funciones principales

- OAuth mediante Google Identity Services y selección con Google Picker.
- Exploración completa sin iniciar sesión.
- Árbol accesible, búsqueda, filtros y selección masiva.
- Detección y resolución explícita de conflictos, sin sustituciones silenciosas.
- Modo «Solo comprobar», copia, movimiento confirmado y sincronización
  conservadora.
- Trabajos reanudables, cola, pausa, cancelación, reintentos e informes seguros.
- Favoritos, programaciones e historial privado durante 90 días.
- Eliminación de los datos de DriveTransfer sin borrar los archivos transferidos.

## Cómo funciona

```mermaid
flowchart LR
  A[Elegir origen y destino] --> B[Seleccionar contenido]
  B --> C[Comprobar permisos y conflictos]
  C --> D[Confirmar la operación]
  D --> E[Transferir por lotes]
  E --> F[Verificar y descargar el informe]
```

La copia es la opción predeterminada. Mover exige una confirmación adicional y
las sincronizaciones nunca eliminan contenido del destino.

## Arquitectura resumida

```mermaid
flowchart LR
  UI[React y Vite] --> GIS[Google Identity Services]
  UI --> Picker[Google Picker]
  UI --> API[Apps Script Execution API]
  API --> Validacion[Validación, límites y bloqueos]
  Validacion --> Drive[Google Drive API v3]
  Validacion --> Datos[appDataFolder privado]
```

El token OAuth permanece únicamente en memoria. El navegador llama directamente
a `scripts.run`; Apps Script vuelve a consultar Drive y revalida permisos,
capacidades, metadatos, rutas y límites antes de cada mutación. DriveTransfer no
descarga ni ejecuta los bytes de los documentos.

Consulta [Arquitectura](ARCHITECTURE.md), [Seguridad](SECURITY.md) y
[Despliegue](DEPLOYMENT.md) para el detalle técnico.

## Desarrollo local

Requisitos: Node.js 24 y npm 11, o versiones compatibles.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Las variables `VITE_*` se integran en el cliente y no deben contener secretos.
La clave de API debe estar restringida por origen y exclusivamente a Google
Picker API. Sin configuración de Google, el modo exploración continúa
disponible.

## Validación

```powershell
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

La estrategia completa está en [Pruebas funcionales](functional-qa.md),
[Seguridad y sistema](security-qa.md) y [Diseño adaptable](design-qa.md).

## Privacidad y transparencia

La información pública está disponible en
[Privacidad](https://drivetransfer.app/privacidad),
[Procedencia de los datos](https://drivetransfer.app/procedencia-datos),
[Aviso legal](https://drivetransfer.app/aviso-legal),
[Cookies](https://drivetransfer.app/cookies),
[Eliminar datos](https://drivetransfer.app/eliminar-datos) y
[Transparencia sobre IA](https://drivetransfer.app/transparencia-ia).

No incluyas tokens, credenciales, nombres reales, IDs de Drive ni documentos
privados en incidencias, pruebas o capturas.

## Derechos

Copyright © 2026 Antonio Jesús Delgado Briones. Todos los derechos reservados.

Este repositorio no incluye una licencia de software y no concede permiso para
usar, copiar, modificar, distribuir o crear obras derivadas del código. Al ser
público, GitHub permite visualizarlo y bifurcarlo conforme a sus propias
condiciones, sin que ello otorgue una licencia adicional. Consulta
[COPYRIGHT.md](COPYRIGHT.md).
