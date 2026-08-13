# Validación funcional

Fecha: 13 de agosto de 2026

Versión: 1.0.1

## Capacidades cubiertas

- Comprobación previa de volumen, tamaño conocido, duración, permisos y cruces
  entre espacios.
- Conflictos: omitir, conservar ambos con nombre seguro o detenerse para revisar.
- Favoritos privados, cola con un único trabajo activo y reintento selectivo.
- Documentos privados versionados en `appDataFolder` con manifiesto, selección y
  checkpoints separados.
- Programaciones guiadas, sincronización unidireccional conservadora y
  dispatcher bloqueado por usuario.
- Historial durante 90 días, informes JSON/CSV seguros y avisos opcionales.
- Árbol virtualizado probado con 25.000 elementos sintéticos.

## Escenarios de aceptación

1. Recorrer exploración desde selección hasta resultado, incluyendo conflictos.
2. Ejecutar «Solo comprobar» sin emitir mutaciones.
3. Copiar y mover con confirmación reforzada, pausa, reanudación y cancelación.
4. Reintentar solo fallos y conservar checkpoints completados.
5. Probar favoritos, cierre, recuperación y eliminación de datos.
6. Calcular programaciones única, diaria, semanal y mensual con zona horaria.
7. Confirmar que mover no puede programarse y sincronizar nunca elimina.
8. Probar token caducado, permisos insuficientes, cuota y fallo parcial.
9. Validar Mi unidad y unidades compartidas en ambas direcciones con datos
   sintéticos dedicados.

## Límites verificados

- 100 elementos por página, 10 mutaciones por lote y 5.000 selecciones guardadas.
- Sin IDs, nombres, tokens ni payloads de trabajo persistidos en el navegador en
  modo Google.
- Restaurar un trabajo de movimiento vuelve a exigir confirmación.
- Sin sustitución silenciosa de duplicados ni eliminación del destino.
