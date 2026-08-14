# Validación de diseño adaptable

Fecha: 13 de agosto de 2026

Versión: 1.0.2

## Evidencias conservadas

- Portada de escritorio final: `artifacts/design-qa/landing-desktop-after.png`.
- Portada móvil final: `artifacts/design-qa/landing-mobile-legal-clean.png`.
- Cabecera legal: `legal-desktop-header-after.png` y
  `legal-mobile-header-after.png`.
- Navegación móvil: `workspace-mobile-selector.png`.
- Flujo adaptable final: `artifacts/responsive-audit/after/`.
- Cookies en móvil tras corregir el ajuste del título:
  `artifacts/responsive-audit/after/cookies-mobile-final.png`.

Se retiraron comparaciones intermedias y capturas anteriores para no publicar
artefactos redundantes. Todas las evidencias restantes utilizan contenido
ficticio y no muestran cuentas, documentos ni identificadores reales.

## Resultado

- Portada: composición, jerarquía, botones e ilustración validados.
- Transparencia sobre IA: una única navegación legal, distintivo accesible dentro
  de su página y ausencia del distintivo en portada.
- Flujo completo: selección, revisión, confirmación, progreso y resultado.
- Revisión: nombres largos de origen y destino quedan contenidos, truncados y
  accesibles mediante título, sin ampliar la tarjeta lateral.
- Contenido dinámico: trabajos, programaciones, historial, progreso y títulos
  admiten nombres extensos sin forzar el ancho de sus tarjetas.
- Navegación: cada cambio de fase o sección vuelve al inicio del contenido y no
  conserva una posición de desplazamiento perteneciente a la vista anterior.
- Páginas legales: el título «Cookies y almacenamiento» reajusta correctamente
  en móvil sin generar anchura horizontal adicional.
- Área de trabajo: centro, programaciones, historial y privacidad.
- Sin desbordamiento horizontal en 390, 768, 1024 y 1488 px.
- Sin paneles de error ni mensajes de consola en el recorrido comprobado.
- Navegación por teclado, foco visible y movimiento reducido conservados.
- P0, P1 y P2: ninguno.
- P3: diferencias menores propias de rasterizado y tipografía entre navegadores.

`resultado final: superado`
