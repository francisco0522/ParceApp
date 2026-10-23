# ParceApp — Backlog del MVP

Fecha: 9 de octubre de 2026.

## Objetivo

Una persona puede crear su cuenta, completar preferencias, reservar una cena o un evento, consultar y cancelar sus reservas y descubrir próximas actividades de marcas aliadas.

Explorar planes es una vitrina de actividades de museos, cafés, teatros, restaurantes, bares y otros aliados. Se ordena por proximidad de fecha y no requiere afinidad con las preferencias del perfil. Las publicaciones patrocinadas se identifican claramente. Para el MVP, el equipo administra el contenido; la inscripción o compra de una actividad publicitaria ocurre en el enlace externo del aliado. Los eventos reservables dentro de ParceApp mantienen su propio flujo.

Piloto confirmado: Formosa (Argentina) y Cali (Colombia). Solo administradores crean eventos y programan cenas. Asignación de restaurantes/grupos y condiciones comerciales siguen por definir antes del piloto.

## Orden de entrega

| Ticket | Prioridad | Trabajo | Depende de | Estado |
| --- | --- | --- | --- | --- |
| MVP-01 | P0 | Cuenta y sesión coherentes | — | Parcial — Dev A |
| MVP-02 | P0 | Base reproducible: herramientas, navegación y recursos | 01 | Parcial — Dev B |
| MVP-03 | P0 | Completar y editar perfil sin perder respuestas | 01, 02 | Hecho — Dev A |
| MVP-04 | P0 | Modelo consistente de actividades y reservas | 01 | Hecho — Dev B |
| MVP-05 | P0 | Reservas de cenas fiables | 03, 04 | Hecho local — Dev A |
| MVP-06 | P0 | Crear y reservar eventos fiables | 02, 04 | Hecho local — Dev A |
| MVP-07 | P0 | Mis reservas, detalles y cancelación | 05, 06 | Hecho local — Dev A |
| MVP-08 | P0 | Contenido y operación de publicaciones de aliados | 04 | Hecho local — Dev B |
| MVP-09 | P0 | Explorar planes próximos y patrocinados | 02, 08 | Hecho local — Dev B |
| MVP-10 | P0 | Permisos y reglas de Firebase verificables | 04, 08 | Hecho local — Dev A; activación pendiente |
| MVP-11 | P1 | Recuperación de contraseña y gestión de cuenta | 01 | Pendiente |
| MVP-12 | P1 | Escaneo de documento robusto y opcional | 03 | Pendiente |
| MVP-13 | P0 | Piloto y preparación de distribución | 01–12 | Pendiente |

P0: necesario para lanzar el MVP. P1: completar antes de abrir el piloto al público; el escáner puede ocultarse si no está listo.

## Tickets y criterios de aceptación

### MVP-01 — Cuenta y sesión coherentes
- Firebase Authentication determina la sesión; credenciales persistidas con almacenamiento nativo cifrado.
- Registro y login usan el documento `users/{uid}`.
- Redux usa `id` para el UID y recibe fechas serializables, sin registrar información personal en consola.
- Al reabrir: login si no hay sesión; cuestionario si el perfil está incompleto; home si está completo.
- Salir cierra Firebase, limpia Redux y las copias locales antiguas, y reinicia la navegación.
- Errores de red o perfil permiten reintentar; botones impiden envíos repetidos.
- Validar en dispositivos Android/iOS: registro, login, reapertura, perfil incompleto, salida y botón atrás.
- Compatibilidad inicial: cuentas anteriores cuyo documento no sea `users/{uid}` requieren revisión/migración de datos; no se migran automáticamente.

### MVP-02 — Base reproducible
- Reparar ESLint y configuración Jest de módulos nativos.
- Eliminar rutas absolutas de assets; resolver símbolos no importados y errores de render.
- Footer y botones llevan a su destino real; retirar accesos a chat/notificaciones aún no implementados.
- README explica entorno, Firebase y ejecución en Android/iOS.
- Criterio: lint y pruebas relevantes pasan; ambas plataformas abren las pantallas del MVP.

### MVP-03 — Perfil
- Guardar la última respuesta y cargar preferencias al editar.
- Validar preguntas obligatorias, manejar formulario vacío, errores y reintentos.
- Mantener los datos del perfil y fechas en un formato consistente; reemplazar avatares ficticios.
- Criterio: completar, reabrir y editar preserva todas las respuestas.

### MVP-04 — Datos de actividades y reservas
- Documentar esquema canónico con UID, fechas completas, zona horaria, participantes, capacidad y estado.
- Definir relación entre cenas, eventos y reservas por usuario; evitar copias divergentes.
- Preparar migración explícita y revisable para datos existentes, si aplica.
- Criterio: una misma reserva se reconoce en actividad y agenda, con restricciones de duplicados/capacidad claras.

### MVP-05 — Cenas
- No reservar sin fecha; usar una identidad determinista por cena, fecha completa y ubicación/grupo cuando corresponda.
- Resolver concurrencia, cupos, duplicados y reservas pasadas.
- Mostrar confirmación y datos operativos: ciudad, hora, estado y restaurante o indicación de asignación pendiente.
- Definir cómo el equipo asigna restaurante y grupos; para el MVP puede ser manual. Afinidad automática queda fuera.
- Criterio: dos reservas simultáneas no exceden cupos ni crean cenas duplicadas.

### MVP-06 — Eventos
- Validar título, dirección, capacidad y fecha/hora futura; unificar identificador de participantes.
- Evitar inscripción duplicada del creador y manejar fallos parciales al reservar varios eventos.
- Actualizar lista, mostrar errores y excluir/identificar eventos vencidos o cancelados.
- Criterio: crear, consultar e inscribirse funciona; capacidad y duplicados se respetan.

### MVP-07 — Agenda y cancelación
- Consultar reservas reales del usuario; separar próximas/pasadas.
- Implementar detalle con lugar, fecha, estado y cupos pertinentes.
- Cancelar reserva de forma consistente y liberar cupo; definir quién cancela una actividad completa.
- Criterio: reservar/cancelar se refleja al instante y después de reabrir la app.

### MVP-08 — Publicaciones de aliados
- Modelo propuesto: aliado, título, descripción, imagen, categoría, ciudad, dirección, inicio/fin de actividad, vigencia de publicación, enlace externo, patrocinado y estado borrador/publicado.
- Publicación y retiro administrados por el equipo mediante proceso documentado en Firebase para el MVP.
- Definir validaciones, permisos y ejemplos de carga sin exponer edición a usuarios comunes.
- Criterio: crear, publicar, vencer y retirar un anuncio tiene un resultado verificable.

### MVP-09 — Explorar planes
- Entrada visible desde home con próximas actividades; pantalla completa y detalle.
- Orden cronológico; excluir publicaciones vencidas/no publicadas; mostrar ciudad, categoría, fecha, imagen y aliado.
- Identificar publicidad con etiqueta “Patrocinado”; no filtrar por gustos del usuario.
- Abrir enlace válido de contacto/compra del aliado; gestionar carga, lista vacía, imágenes fallidas y errores.
- Filtro por ciudad propuesto si el piloto cubre varias ciudades; confirmar ciudades del piloto.
- Criterio: un plan publicado vigente aparece, su detalle funciona y desaparece al vencer o retirarse.

### MVP-10 — Reglas y permisos
- Versionar reglas e índices Firestore y verificarlos con emulador.
- Solo cada usuario modifica su perfil; restringir reservas, capacidad, creación y edición de actividades según rol.
- Solo administradores publican anuncios de aliados; proteger borradores y datos privados.
- Criterio: pruebas comprueban acceso permitido y rechazan modificación de perfiles ajenos, cupos y publicidad sin rol.

### MVP-11 — Cuenta
- Recuperación de contraseña, mensajes útiles y validación de formularios.
- Definir y proporcionar procedimiento de eliminación de cuenta/datos para el piloto público.
- Criterio: recuperación funciona y la gestión de cuenta es accesible desde perfil.

### MVP-12 — Escáner
- Permisos Android/iOS, salida disponible cuando no hay permiso/cámara, lecturas inválidas y múltiples callbacks.
- Validar edad también tras escaneo; no equiparar lectura de código con verificación de identidad.
- Conservar entrada manual; revisar qué datos se necesitan y cómo se informa al usuario.
- Criterio: lectura válida autocompleta; lectura inválida o permiso denegado no bloquea registro.

### MVP-13 — Piloto
- Probar recorrido completo en dispositivos Android/iOS, conexión deficiente y concurrencia de reservas.
- Preparar configuración por entorno, firma de distribución, iconos y contenido de prueba controlado.
- Revisar declaraciones de privacidad, textos de cuenta y operación de soporte con los datos realmente usados.
- Criterio: equipo puede operar cenas, eventos y publicidad; no hay fallos bloqueantes y existe checklist de lanzamiento ejecutado.

## Fuera del MVP

Chat, afinidad automática, pagos dentro de la app, autoservicio/facturación para anunciantes, analítica comercial avanzada, notificaciones push y recomendaciones personalizadas. Pueden convertirse en tickets posteriores sin bloquear los tres recorridos principales.

## Validación prevista de MVP-01

Pruebas automatizadas focalizadas de sesión: lectura por UID, restauración del perfil, ruta según completitud, serialización de fechas, documento ausente y cierre/limpieza. Las pruebas nativas de persistencia cifrada quedan pendientes; una prueba Jest no demuestra comportamiento del Keychain/Keystore.

## Entrega de MVP-01 a MVP-04

Implementación y pruebas automatizadas entregadas. MVP-01 y MVP-02 quedan parciales hasta ejecutar los criterios de sesión y apertura de pantallas en dispositivos Android/iOS. Las compilaciones de ambas plataformas pasan. MVP-03 y MVP-04 están completos en el alcance implementado; migración preparada, sin ejecutar. Ver [informe de implementación](IMPLEMENTATION_REPORT.md) y [revisión de seguridad](SECURITY_REVIEW.md). Al cierre de esa primera entrega, los demás tickets estaban pendientes; consultar la segunda entrega más abajo para el estado actual.

## Segunda entrega: seguridad, reservas y aliados

MVP-05 a MVP-10 implementados y verificados localmente con emulador, pruebas automatizadas y compilaciones Android/iOS. Ver [informe de segunda entrega](PHASE2_IMPLEMENTATION_REPORT.md). No se desplegaron reglas ni migraron datos reales; la activación requiere revisar [migración](MIGRATION_PLAN.md), permisos efectivos y operación de administradores. Aceptación en dispositivos de MVP-01/MVP-02 aplazada por el usuario. MVP-11/MVP-12/MVP-13 siguen pendientes, incluida firma efectiva de distribución.
