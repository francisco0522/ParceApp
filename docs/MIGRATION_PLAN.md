# Migración revisable al modelo v2 — sin ejecutar

Este documento define únicamente una propuesta offline. No se ha exportado, modificado ni migrado Firebase real; tampoco se han desplegado reglas. Cualquier aplicación futura requiere entorno autorizado, respaldo, revisión del mapping y autorización específica. Los destinos finales son `activityCatalog/{activityId}` (catálogo sin identidades, schemaVersion2), `users/{uid}` (perfil privado) y `users/{uid}/reservations/{activityId}` (membresía privada). `activities` v1 y las demás colecciones legacy permanecen privadas y denegadas por las nuevas reglas; nunca constituyen un catálogo público de transición.

El contrato final está en [DATA_MODEL.md](DATA_MODEL.md) y [AUTHORIZATION.md](AUTHORIZATION.md). Ciudades del piloto: `cali` / America/Bogota y `formosa` / America/Argentina/Cordoba. Estas ciudades confirmadas no permiten inferir automáticamente la ciudad ni la zona de registros históricos.

## Inventario protegido y decisiones de mapping

1. Preparar respaldo/export de Firestore y un inventario autorizado de Authentication antes de congelar escrituras de clientes antiguos. Conservar la evidencia original en almacenamiento administrativo restringido; no compartir nombres, correos, fechas de nacimiento o UID en logs de la app ni reportes públicos. Este paso todavía no se ha ejecutado.
2. Inventariar `activities` v1, `eventos`, `reservas`, `events` si existe, documentos `users` y copias `users.reservas`. Registrar referencias antiguas, esquema, tipos de fechas y posibles duplicados. No asumir que dos documentos con igual nombre o correo pertenecen a la misma persona.
3. Producir un mapping revisable old→new: actividad y perfil de origen, activityId y UID destino, ciudad, grupo, fecha completa y zona original, capacidad, estado, miembros, createdAt y evidencia de cada decisión. Separar resueltos, excluidos y bloqueados; ningún dato ambiguo se publica.
4. Verificar cada UID contra Authentication. Si `id` y `uid` discrepan o un perfil tiene un ID distinto al UID autenticado, exigir correspondencia explícita revisada. Un correo es evidencia auxiliar, no autorización suficiente para fusionar cuentas. No crear cuentas ni reasignar datos automáticamente. Conservar conflictos y cuentas sin propietario comprobado en revisión privada.

## Perfiles y compatibilidad de reglas

El destino de cada perfil es exactamente `users/{uid}`. Campos permitidos: `fullName`, `emailText`, `birthDate`, `createdAt`, `profileCompleted`; opcionales `phone`, `profileAnswers`, `updatedAt`. No roles, contraseñas, arrays de reservas ni claves desconocidas. Roles administrativos son custom claims firmados, asignados por un procedimiento separado en entorno confiable; no migrarlos desde campos de perfil.

- `fullName`: texto1–200; `emailText`: texto1–320 correspondiente a la cuenta Authentication comprobada. Resolver discrepancias sin cambiar el correo de Authentication durante esta migración.
- `birthDate`: ISO string válido o null; `createdAt` y `updatedAt`: ISO strings válidos de hasta40caracteres. Convertir Timestamp/Date legacy conservando el instante documentado. Si nacimiento era una fecha civil sin zona, conservar esa semántica mediante una decisión explícita y formato acordado; no mover el cumpleaños por inferir una zona. Fechas inválidas o ausentes que no puedan justificarse quedan bloqueadas.
- `phone`: texto1–40 o null; `profileAnswers`: map máximo100claves, sin perder respuestas válidas. Revisar compatibilidad con el formulario vigente y claves retiradas antes de decidir completitud. `profileCompleted` booleano describe progreso del cuestionario, no identidad verificada ni privilegio.
- Datos no permitidos se conservan únicamente en respaldo/auditoría administrativa privada según necesidad de conservación; no se copian al documento de aplicación. `users.reservas` se utiliza sólo como evidencia para reconciliar membresías.

Las reglas nuevas validan la lista exacta de campos en alta/actualización. Un documento antiguo con campos desconocidos o `birthDate`/`createdAt` Timestamp **no queda automáticamente compatible**: puede ser legible por su dueño, pero su actualización puede rechazarse hasta transformar el perfil a este esquema. Un perfil ubicado fuera de `users/{uid}` no lo encuentra el flujo de sesión actual. Completar esta revisión y transformación controlada antes de activar el cliente/reglas para esas cuentas; no añadir permisos amplios ni migración automática desde login para disimular la incompatibilidad.

## Actividades y fechas históricas

1. `activities` v1: convertir `participantIds` a membresías privadas, validar UID, deduplicar y excluir campos personales del catálogo. `createdBy` se conserva, si está validado y es necesario, exclusivamente en auditoría administrativa fuera de colecciones públicas; no inventar creador ausente.
2. `eventos`: combinar calendario de `date` y hora de `hour` sólo cuando su significado y zona originales estén comprobados. Conservar año existente; no usar año actual ni zona del dispositivo. Mapear IDs de miembros verificados. Capacidad0/vacía puede convertirse en null para eventos ilimitados; capacidad positiva debe ser entero1–10000. Resolver negativos, fracciones, sobrecupos o estados ambiguos antes de incluir.
3. `reservas`: day/month sin año exige mapping explícito por documento con startsAt completo, ciudad, grupo y evidencia operativa. No elegir año actual, próximo miércoles, ciudad o restaurante por defecto. Unir cenas duplicadas sólo después de confirmar mismo día, ciudad y grupo y resolver sobrecupos; grupos diferentes permanecen separados.
4. `events` y `users.reservas`: comprobar si son fuentes distintas o copias. Nunca recrear una reserva únicamente por una copia local/campo desactualizado. Reconciliar discrepancias contra evidencia autorizada y registrar la decisión.
5. Generar IDs deterministas conforme al modelo actual: cenas `dinner_YYYY-MM-DD_city_group` y eventos con ciudad+título normalizado+instante completo+dirección. Detectar colisiones, producir mapa completo old→new y no sobrescribir un destino distinto.
6. `startsAt` y `createdAt` del catálogo y timestamps de membresía son Firestore Timestamp. Cada ciudad coincide con su zona IANA. Mantener fecha real de actividades pasadas y estado revisado; conservar membresías pasadas para historial. Cenas requieren grupo y capacidad finita; ubicación/restaurante pueden quedar pendientes explícitamente, sin inventarlos.

## Reservas, conteos y revisión offline

Para cada par comprobado `(activityId,uid)`, preparar exactamente un documento `users/{uid}/reservations/{activityId}` con `activityId` y `createdAt` Timestamp. Preparar `activityCatalog/{activityId}` con `participantCount` igual al número exacto de esos documentos, capacidad consistente y esquema v2 completo. Nunca copiar participantIds, createdBy, nombres, fotos ni propietarios al catálogo. No crear una segunda copia de membresías en perfiles o catálogo.

Validaciones del dry-run: referencias existentes, miembros válidos/únicos, conteos iguales, cupos, tipos/fechas, zona/ciudad, estados y asignación, límite de campos, duplicados y colisiones de IDs. Emitir conteos agregados, conflictos y cambios previstos; los detalles personales permanecen en auditoría privada. Totales de catálogo y reservas no sustituyen la comparación por actividad y UID.

Probar propuesta anonimizada en emulador `demo-parceapp`: privacidad legacy/perfiles/reservas, catálogo sin identidades, rechazo de contador o membresía aislados, perfiles transformados compatibles, últimas plazas concurrentes, cancelación y relectura de agenda/detalle. Las reglas `getAfter` mantienen la consistencia de transacciones de clientes futuros; **no validan por sí mismas un import privilegiado**. Admin SDK/Console omiten reglas, por lo que la transformación y su import deben validar el mismo contrato y auditar conteos antes/después.

## Aplicación posterior y rollback

La futura ejecución se realizará únicamente después de aprobar mappings y resolver bloqueos. Congelar las escrituras de clientes antiguos y de destinos durante la aplicación, para evitar que un export viejo sobrescriba reservas nuevas. Importar perfiles compatibles, catálogo v2 y membresías como una entrega coordinada; no abrir el nuevo cliente durante estados intermedios donde contador y documentos privados difieran. Usar lotes controlados, idempotencia comprobada y abortar ante destinos existentes distintos. Conservar checkpoints/mapping de cada lote, respaldo y auditoría administrativa privada.

Comparar datos por referencia, counts/membresías y muestras autorizadas; probar los recorridos en entorno controlado. Coordinar activación del cliente, reglas e índices sólo después de validar la consistencia completa. Las colecciones legacy se mantienen respaldadas y denegadas, sin coexistencia pública de v1/v2. Su eliminación definitiva requiere una acción aparte, aprobada y respaldada.

Rollback también congela escrituras. Conservar y reconciliar cambios posteriores a la migración antes de restaurar; no aplicar un export antiguo encima de reservas recientes. Restaurar datos y configuración como conjunto compatible, revisar permisos y comprobar nuevamente referencias/conteos. No dejar reglas permisivas de transición ni exposición de UID como mecanismo de rollback.

Pendiente: evidencia histórica para cuentas, fechas, ciudades y grupos ambiguos; responsables administrativos; entorno Firebase de prueba; aprobación de un eventual script/import y despliegue. Este documento no contiene comandos de escritura real ni ejecuta scripts contra Firebase.
