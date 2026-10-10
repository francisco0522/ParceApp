# Plan de entrega: seguridad, reservas y aliados

## Alcance autorizado

Cinco puntos: reglas y permisos (MVP-10), dependencias/firma, aceptación nativa MVP-01/02, MVP-05/06/07 y MVP-08/09. Conservar revisión histórica SECURITY_REVIEW.md; registrar resolución y nueva auditoría aparte. No desplegar reglas, migrar datos reales ni publicar binarios en esta fase.

## Fases y propiedad

1. Dev A: seguridad y privacidad de actividades. Propiedad exclusiva src/services/activities.js, src/models/activity.js, src/thunks/eventosThunks.js; nuevos archivos firebase/rules/índices y servicios de servidor si el diseño los requiere; documentación de autorización/modelo/migración. Definir contrato antes de UI: catálogo sin UID de participantes, reservas propias, capacidad/estado/fecha protegidos, roles para anuncios. Emulador con proyecto demo, sin credenciales reales. No inventar permisos desplegados.
2. Dev B, paralelo con fase 1: package.json/lock, configuración nativa Android/iOS, almacenamiento de sesión si se acuerda una sustitución compatible, README y documentación de dependencias/firma. Actualizaciones compatibles según avisos, nunca audit fix --force. Release falla sin firma propia; secretos fuera del repositorio. Coordinar dependencias del emulador con Dev A por orquestador.
3. Aceptación nativa: detectar simuladores/emuladores/dispositivos disponibles, iniciar app y comprobar pantallas; flujos de cuenta solo en entorno de prueba. Si faltan dispositivos/configuración, reportar evidencia pendiente sin afirmar cierre. No crear usuarios en producción.
4. Dev A: MVP-05/06/07, después del contrato de seguridad. Propiedad pantallas cenas/eventos/agenda, servicios/modelos de actividades y nueva pantalla detalle. Cancelación propia, separación próximas/pasadas, capacidad concurrente y resultados parciales. Operación manual de restaurantes/grupos documentada; ciudad pendiente de confirmación, sin inventarla.
5. Dev B: MVP-08/09, después del contrato de seguridad y dependencias. Propiedad nuevos modelos/servicios/pantallas de aliados, HomeScreen y App.js. Vitrina cronológica, sin gustos, patrocinado explícito, vigencia, detalle, enlaces válidos y estados de carga/error/vacío. Administración documentada, sin autoservicio comercial. Ediciones a reglas pasan exclusivamente por Dev A y orquestador.
6. Unit Tester: solo pruebas; actualizar cobertura y agregar pruebas de reglas/emulador, concurrencia y publicidad cuando los contratos estén estables. Security Reviewer: solo lectura al finalizar desarrollo; orquestador guarda nueva revisión literalmente. Correcciones se devuelven a devs y se revisan nuevamente antes del cierre.

Nunca dos desarrolladores editan el mismo archivo a la vez. Cambios de contrato o archivos compartidos se secuencian por el orquestador. Builds, lint y suite final tras integrar; artefactos dentro del repositorio.

## Criterios de cierre

Reglas rechazan accesos ajenos/alteración de cupos/edición publicitaria sin rol; catálogo no revela membresía. Reserva/cancelación visible al reabrir; concurrencia comprobada en emulador. Anuncio vigente aparece por fecha y se retira/v vence según contrato. Dependencias evaluadas con avisos pendientes explícitos; firma release segura y sin secretos versionados. Android/iOS compilan; aceptación nativa reportada separadamente. Informe por ticket, archivos, seguridad, pruebas, cobertura y pendientes externos.

## Decisiones externas pendientes

Ciudad y grupos del piloto; quién puede crear eventos; reglas/política Auth actualmente desplegadas; entorno Firebase de pruebas; disponibilidad de dispositivos; clave de carga de distribución. Avanzar con configuración/documentación y pruebas locales que no dependan de estas decisiones, pedir información concreta cuando sea necesaria.

## Confirmaciones del usuario durante la ejecución

- Piloto: Formosa (Argentina) y Cali (Colombia). Solo administradores crean eventos.
- No hay proyecto Firebase de pruebas disponible. Se usará únicamente el proyecto demo local con emuladores durante esta entrega; se recomienda proyecto de pruebas separado para validación posterior.
- El usuario aplazó la aceptación en dispositivos Android/iOS porque no están disponibles ahora. Se verifican builds; MVP-01/MVP-02 conservan aceptación física pendiente.
- Catálogo nuevo activityCatalog v2 separado de activities legacy para no exponer UID antiguos. Reservas privadas en users/{uid}/reservations/{activityId}; contador atómico con reglas getAfter.
- Publicaciones en partnerPlans: ally y address, ciudades cali/formosa. Solo admin administra. Publicaciones históricas con estado published pueden leerse; vigencia decide su aparición en el feed.
