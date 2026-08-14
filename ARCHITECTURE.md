# Arquitectura de DriveTransfer

## Componentes

```mermaid
flowchart LR
  subgraph Navegador
    UI[React y Vite]
    Memoria[Token temporal en memoria]
    Preferencias[Preferencias locales no sensibles]
  end
  subgraph Google
    GIS[Google Identity Services]
    Picker[Google Picker]
    Script[API de ejecución de Apps Script]
    Drive[Google Drive API v3]
    AppData[appDataFolder privado]
  end
  UI --> GIS --> Memoria
  UI --> Picker
  Memoria --> Script
  Script --> Drive
  Script --> AppData
  UI --> Preferencias
```

La interfaz web pública no depende de `google.script.run`. Con autorización, llama a
`scripts.run` con el token en la cabecera `Authorization`. Apps Script ejecuta la
Drive API con la identidad y permisos de esa persona.

## Flujo de transferencia

```mermaid
sequenceDiagram
  actor U as Usuario
  participant W as Web
  participant P as Google Picker
  participant A as Apps Script
  participant D as Drive API
  U->>W: Conectar y elegir carpetas
  W->>P: Abrir selector
  P-->>W: Referencias autorizadas
  W->>A: Inspeccionar y paginar
  A->>D: Consultar permisos y metadatos
  D-->>A: Estado actual
  A-->>W: Árbol y comprobación previa
  U->>W: Confirmar operación
  loop lotes de hasta 10
    W->>A: Ejecutar lote
    A->>D: Revalidar y mutar
    A-->>W: Puntos de control opacos
  end
  W->>A: Verificar resultados
  A-->>W: Conteos seguros
```

## Validación y límites de confianza

El navegador prepara la experiencia, pero no es una autoridad. Apps Script
valida de nuevo IDs, nombres, MIME, tamaño conocido, padre, pertenencia al árbol,
espacio, permisos, capacidades, destino y ciclos. Se rechazan esquemas, estados,
identificadores y cargas fuera de los límites permitidos.

React representa nombres externos como texto. No hay HTML dinámico, `eval`,
carga de módulos proporcionados por usuarios ni ejecución de macros o bytes de
archivos. Drive realiza las copias y movimientos internamente.

## Idempotencia y recuperación

Cada operación usa una clave opaca en `appProperties`. Un reintento solo reutiliza
un resultado cuando la clave, el destino, el nombre, el tipo y el tamaño conocido
coinciden. Los trabajos guardan manifiesto, selección y puntos de control por
separado.

```mermaid
stateDiagram-v2
  [*] --> en_cola
  en_cola --> en_ejecucion
  en_ejecucion --> en_pausa
  en_pausa --> en_ejecucion
  en_ejecucion --> requiere_atencion
  requiere_atencion --> en_ejecucion
  en_ejecucion --> completado
  en_cola --> cancelado
  en_ejecucion --> cancelado
  completado --> [*]
  cancelado --> [*]
```

Solo existe un trabajo activo por usuario. Los demás permanecen en cola y las
mutaciones usan `LockService.getUserLock()` para evitar ejecuciones simultáneas.

## Persistencia privada

No existe una base de datos pública. `appDataFolder` conserva documentos JSON
versionados y limitados a 450 KB. `UserProperties` mantiene únicamente índices
pequeños, versión de esquema y referencia al activador. Todo queda aislado por la
cuenta de Google conectada.

```mermaid
flowchart TD
  S[Trabajo o programación] --> V[Validar esquema y tamaño]
  V --> W[Escribir documento privado]
  W --> R[Leer y verificar la copia]
  R --> I[Actualizar índice pequeño]
  I --> C[Punto de control reanudable]
```

El historial se conserva durante 90 días. Los trabajos reanudables caducan a los
7 días. La eliminación borra exclusivamente documentos, índices y activadores de
DriveTransfer; no toca originales, copias ni destinos.

## Programaciones

Un único planificador periódico por usuario reclama trabajos con bloqueo. Las
programaciones admiten copia o sincronización conservadora, nunca movimiento.
Los archivos modificados generan una versión fechada y una desaparición en el
origen no provoca borrado en el destino.

## OAuth y permisos

El acceso a subárboles arbitrarios requiere el permiso restringido
`https://www.googleapis.com/auth/drive`. La apertura general permanece
condicionada a la verificación de Google y a cualquier evaluación adicional que
solicite. El token no se guarda en URLs, almacenamiento persistente, errores ni
telemetría.
