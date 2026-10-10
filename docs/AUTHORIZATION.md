# Autorización MVP-10 y contrato de seguridad

Configuración local versionada; **sin despliegue ni acceso a producción**. Reglas deniegan por defecto. Ejecutar emuladores con `--project demo-parceapp` (proyecto ficticio, sin credenciales). Las reglas desplegadas actuales y Auth efectivo siguen sin verificar.

## Ciudades confirmadas

IDs `cali` y `formosa`. `PILOT_CITIES` exporta nombre, zona IANA y offset de pared vigente: Cali / America/Bogota / UTC-05; Formosa / America/Argentina/Cordoba / UTC-03. IANA agrupa Formosa (FM) en Cordoba. Seleccionar ciudad explícitamente al crear contenido; jamás interpretar una hora de Formosa como colombiana. Instantes Firestore Timestamp UTC, presentación en zona de la ciudad. Si cambian leyes horarias, actualizar cálculo de offsets antes de programar nuevas actividades.

## Roles y colecciones

- Claim firmado `admin: true`, asignado por operador mediante Admin SDK en entorno confiable. Escribir un campo admin/role en un perfil nunca concede permisos. No hay escalamiento desde la app; renovar token tras asignar/revocar claim. La administración Firebase Console/IAM es independiente y sus escrituras privilegiadas omiten reglas: validar también cargas de operador.
- `activityCatalog/{id}`: proyección pública autenticada v2, sin `participantIds`, `createdBy`, propietarios ni datos de participantes. **`activities` legacy queda totalmente denegada** para impedir exponer antiguos arrays durante la migración.
- `users/{uid}`: lectura y edición del propio perfil; ni administradores desde cliente leen perfiles ajenos. Alta emailText coincide con email del token. Campos creados/email/fecha nacimiento no editables después desde cliente. Campos de edición: fullName, phone, profileAnswers, profileCompleted, updatedAt. No roles ni claves desconocidas. profileCompleted es progreso de UI, nunca privilegio/verificación de identidad. profileAnswers máximo100 claves; validación semántica del formulario en app, no utilizada para autorización.
- `users/{uid}/reservations/{activityId}`: solo propio usuario lee/lista; campos exactos activityId (igual ID), createdAt (timestamp servidor). Sin actualización; alta/baja únicamente junto contador de catálogo en transacción.
- `formularioPerfil`: lectura autenticada, escritura admin.
- `partnerPlans`: escritura admin; lectura autenticada de publicados, borradores/retirados solo admin. Contenido publicado vencido sigue siendo legible por ID, pero desaparece del feed. La caducidad es visibilidad de producto, no secreto.
- Todas las demás colecciones/subcolecciones, incluyendo cenas/eventos/reservas antiguas y `activities`, denegadas.

## Actividades (schemaVersion 2)

Campos exactos y obligatorios: kind dinner/event; title texto1–160; startsAt Timestamp; timeZone coherente ciudad; city cali/formosa; capacity int1–10000 o null ilimitado (cena requiere finito); participantCount entero>=0 y <=capacity; status open/cancelled/completed; createdAt Timestamp servidor; direction texto1–500 o null (evento requiere dirección); description texto0–4000; groupId texto1–100 o null (cena requiere grupo); venueName texto1–200 o null; assignmentStatus pending/assigned (assigned requiere venueName y direction). Sin UID personal.

Solo admin crea/programa y edita catálogo. Alta futura/open/count0 (o count1 junto reserva propia del creador). No eliminar actividades, para conservar referencias/historia. Edición no altera contador y nunca baja capacidad debajo ocupación. Tras existir reservas, startsAt/city/timeZone/groupId quedan inmutables; admin puede asignar restaurante/dirección, descripción, ampliar cupo o cancelar actividad. Cancelar actividad conserva reservas para mostrar su estado; no las borra silenciosamente.

Reserva: usuario autenticado propio, actividad futura y open, cupo disponible; transacción lectura catálogo+membresía, contador+1 y membresía nueva. Reglas verifican ambas direcciones `getAfter`, nunca solo cliente. Duplicada rechazada. Cancelar reserva futura: contador-1 y eliminar membresía propia, incluso si actividad fue cancelada por admin; pasada no puede borrarse, mantiene historia. No alteración de cupos, reservas ajenas o estados por usuarios.

Interfaces `listEvents()`, `listDinners()`, `getActivity(id)`, `watchUserActivities(uid,onData,onError)`, `createEvent(uid,input)` admin, `reserveActivity(uid,id)`, `cancelReservation(uid,id)`, `isActivityAdministrator()`. Agenda escucha membresías propias; hidrata datos públicos actuales; generaciones/unmount/sesión protegen callbacks obsoletos. No permite autogenerar cenas inexistentes; legacy tercer parámetro dinnerInput ignorado.

## Publicidad (schemaVersion 1)

`partnerPlans/{id}` campos exactos obligatorios:

| Campo | Tipo y límite |
|---|---|
| ally, title | texto1–160 |
| description | texto0–4000 |
| imageUrl | URL https hasta2048 o null |
| category | museum, cafe, theatre, restaurant, bar, other |
| city | cali/formosa |
| address | texto1–500 |
| startsAt, endsAt | Timestamp; endsAt>startsAt |
| publishFrom, publishUntil | Timestamp; publishUntil>publishFrom |
| externalUrl | URL https hasta2048 |
| sponsored | booleano |
| status | draft/published/withdrawn |
| createdAt, updatedAt | Timestamp servidor; createdAt inmutable |
| schemaVersion | entero1 |

URL validación cliente también debe rechazar credenciales/espacios/control y host ausente. Reglas ofrecen regex https y límites como defensa mínima. Feed query status==published y publishFrom<=referencia; filtro publishUntil>ahora y endsAt>ahora, incluyendo planes en curso. Orden startsAt ascendente; comprobar fecha al volver foreground/abrir detalle y timer de vigencia. Sin filtro de preferencias. Índice status+publishFrom versionado. Admin puede retirar o eliminar; detalle no muestra documento dejado de estar publicado.

## Validación y límites

Tester debe verificar emulador: dueño vs ajeno/no sesión, admin auténtico vs role falso, alta inválida, inmutables, arrays/UIDs rechazados, contador solo rechazado, membresía sola rechazada, batch tramposo, límites, últimas plazas concurrentes, cancelación liberando cupo y reserva pasada, privacidad catálogo/legacy, drafts/retired privados, published accesible, URL/esquema inválidos. No declarar seguridad desplegada por pasar Jest o compilar app. Pruebas de reglas pendientes hasta ejecución independiente.

## Fuentes técnicas

[Transacciones y getAfter, límites de acceso](https://firebase.google.com/docs/firestore/manage-data/transactions), [Condiciones de reglas](https://firebase.google.com/docs/firestore/security/rules-conditions), [Custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [IANA zonas Argentina incluyendo FM](https://ftp.iana.org/tz/tzdb/zone.tab).

## Operación administrativa de cenas y eventos

1. Equipo asigna responsable admin y claim en entorno controlado; elegir `cali` o `formosa`. Calendario no lo inventa el usuario.
2. Programar cena con `createDinner(adminUid,{title,startsAt,city,groupId,capacity,direction,venueName,description})`, defaults únicamente direction/venueName null y description vacío. startsAt instante calculado desde hora de ciudad, futuro; capacidad finita explícita. ID generado fecha local+ciudad+grupo; segunda programación igual grupo/día da DUPLICATE. En app de usuario sólo se listan cenas existentes. Programación es función de servicio para herramienta operativa/equipo, no pantalla pública autoservicio.
3. Alternativa MVP: Console Firebase/Admin SDK del equipo con IAM limitado. Crear documento conforme al esquema exacto, participantCount0, timestamps reales, statusopen, assignmentStatuspending y city/group confirmados. Estas herramientas privilegiadas **omiten reglas**; checklist de esquema y recuento obligatorio y backup antes de edición. No usar Console para añadir reservas ni alterar contadores manualmente.
4. Asignar venueName/direction y assignmentStatusassigned, confirmar ciudad/grupo; suscriptores de agenda/detalle reciben cambios en tiempo real. Administración puede cambiar restaurante sin mover fecha/ciudad/grupo con reservas existentes. Para reprogramar, cancelar actividad antigua y publicar nueva; comunicar al usuario por operación humana autorizada fuera de esta implementación (la app muestra estado, no envía mensajes).
5. Cancelar actividad statuscancelled mantiene historial y membresías. Cancelación propia futura elimina únicamente su reserva; libera cupo. Si actividad ya pasó, no se borra historia. Capacidad sólo aumentar/reducir manteniendo count<=capacity. No borrado de catálogo.
6. Eventos se crean en pantalla sólo si claimadmin; ciudad obligatoria y hora de esa ciudad; creator admin inscrito una vez. Usuarios consultan/reservan múltiples con resultados individuales. No confirmar una reserva fallida; reintentos excluyen operaciones confirmadas/ya inscritas.

Decisiones futuras: política cutoff de cancelación (MVP actual hasta startsAt), nombres de grupos, restaurantes asignados, personal administrativo e IAM. Carga demo puede prepararse local; nada publicado en Firebase real.
