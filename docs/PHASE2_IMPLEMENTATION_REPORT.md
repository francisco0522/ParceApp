# Segunda entrega — seguridad, reservas y planes de aliados

Fecha: 9 de octubre de 2026. Plan aprobado: docs/NEXT_DELIVERY_PLAN.md. Trabajo coordinado por el orquestador; Dev A implementó seguridad/datos/cenas/eventos/agenda, Dev B dependencias/firma/publicidad/navegación, Unit Tester escribió pruebas y Security Reviewer hizo una revisión exclusivamente de lectura.

## Resultado y alcance

Implementación verificada localmente para el piloto **Formosa, Argentina, y Cali, Colombia**. Solo administradores crean eventos, programan cenas y administran anuncios. La publicidad es una vitrina cronológica de museos, cafés, teatros, restaurantes, bares y otros aliados; no utiliza gustos del perfil y la inscripción/compra ocurre en el sitio del aliado.

**La entrega no está activada en el proyecto Firebase actual.** No se desplegaron reglas/índices, asignaron roles reales, migraron reservas ni publicaron contenidos. El cliente nuevo consulta colecciones v2: usar datos/reglas antiguos no acredita funcionamiento del nuevo contrato. Primero revisar y coordinar migración, permisos, índices y cliente en un entorno de pruebas separado; no desplegar las reglas directamente sobre datos legacy sin ese proceso.

La validación en dispositivos Android/iOS fue aplazada explícitamente por el usuario. Compilar y probar con emulador Firebase no sustituye esa aceptación.

## Cinco puntos solicitados

| Punto | Estado | Evidencia / pendiente |
| --- | --- | --- |
| 1. Reglas y permisos | Implementados y probados localmente — Dev A | Privacidad, permisos, atomicidad y concurrencia pasan en emulador. Activación/permisos efectivos de Firebase real pendientes. |
| 2. Dependencias y firma | Parcial — Dev B | Actualizaciones compatibles y firma fail-closed implementadas. Avisos restantes, clave/certificado real y validación de distribución pendientes. |
| 3. Aceptación en dispositivos | Aplazada por el usuario | Android/iOS compilan; no se abrieron pantallas ni ejecutaron recorridos físicos. |
| 4. MVP-05/06/07 | done local — Dev A | Cenas, eventos, próximas/pasadas, detalle y cancelación probados. |
| 5. MVP-08/09 | done local — Dev B | Vitrina, filtros por ciudad, patrocinado, detalle/enlace y administración probados. |

## Tickets

| Ticket | Estado | Responsable | Resultado |
| --- | --- | --- | --- |
| MVP-01 | partial | Dev A, entrega anterior | Aceptación física de sesión sigue aplazada. |
| MVP-02 | partial | Dev B, entrega anterior | Builds y lint pasan; apertura física de pantallas aplazada. |
| MVP-05 | done local | Dev A | Cenas del catálogo admin, ciudad explícita, fechas completas, grupos, cupos, restaurante pendiente y confirmación. |
| MVP-06 | done local | Dev A | Eventos solo admin, validación, creador inscrito una vez, exclusión de cerrados/pasados y resultados por reserva con reintento solo pendiente. |
| MVP-07 | done local | Dev A | Agenda próxima/pasada, detalle en vivo, cancelación futura propia y cupo liberado. Historia pasada conservada. |
| MVP-08 | done local | Dev B | Modelo y editor administrativo de borrador/publicación/retiro con fechas, aliado, imagen, categoría y URL. |
| MVP-09 | done local | Dev B | Home con dos planes, catálogo cronológico Todas/Cali/Formosa, patrocinado, detalle, vigencia, imágenes fallidas, errores y enlaces externos. |
| MVP-10 | done local; activación pendiente | Dev A | Reglas/índices versionados y 61 pruebas reales de emulador. No verificadas ni desplegadas en Firebase actual. |

MVP-11/MVP-12/MVP-13 siguen pendientes. Las decisiones operativas de restaurantes, grupos, responsables y condiciones comerciales siguen por definir.

## Decisiones y cambios

- Catálogo público autenticado `activityCatalog` schemaVersion2 sin UID, listas de participantes ni creador. La colección legacy `activities` queda denegada en las reglas propuestas para no revelar datos durante migración.
- Reserva privada `users/{uid}/reservations/{activityId}`. Crear/eliminar membresía y sumar/restar contador deben ser una misma operación; reglas verifican ambas direcciones con getAfter. No modificar reservas ajenas ni cupos/metadata desde un usuario común.
- Solo claims firmados `admin:true` conceden administración; los campos del perfil no otorgan permisos. Perfiles ajenos privados incluso frente al cliente administrador.
- Cenas se programan explícitamente por admin, con identidad fecha-ciudad-grupo. No se autogeneran al reservar. Restaurante/grupo se asignan manualmente; metadata y estado se actualizan en agenda/detalle.
- Reserva futura puede cancelarse aunque la actividad haya sido cancelada por el equipo. Reserva pasada se conserva para historia. Cancelar actividad no borra silenciosamente reservas.
- Hora local Cali UTC-05 y Formosa UTC-03, con zonas IANA y timestamps completos. Offsets actuales documentados; revisar ante cambios de ley horaria.
- Publicaciones `partnerPlans` con esquema explícito, enlaces HTTPS sin credenciales y fechas de inicio/fin y vigencia. Borradores/retiradas privados; un published histórico no es secreto, aunque el feed lo oculte al vencer.
- Editor admin permite guardar borrador, publicar y retirar. Feed/detalle escuchan cambios, comprueban expiración y ofrecen timeout/reintento. No filtran por preferencias. Volumen del piloto acotado: renovar consultas puede releer historia; retirar contenido terminado y revisar costos antes de escalar.
- Firebase demo solo en build de desarrollo y proyecto `demo-parceapp`; configuración incorrecta falla en lugar de conectar silenciosamente a otro entorno. Ejemplo `.env.emulator.example` sin secretos.
- Android release exige clave externa y variables de entorno; no hay fallback debug. No se creó clave ni se generó un binario de distribución. iOS certificado/equipo real tampoco configurado.
- Firebase 11.10, Moment 2.31, Babel y varias ramas transitivas actualizadas de forma compatible; no audit fix --force ni actualización mayor del stack.

## Verificación final del orquestador

| Comprobación | Resultado |
| --- | --- |
| Android Debug arm64-v8a | BUILD SUCCESSFUL, 52 segundos; 391 tareas, 16 ejecutadas |
| iOS Debug Simulator | BUILD SUCCEEDED, CODE_SIGNING_ALLOWED=NO |
| Bundles Metro release Android e iOS | Generados correctamente |
| Lint integrado | 0 errores, 39 advertencias |
| git diff --check | Pasa |
| Jest final después de auditoría | 25 suites pasan; 329 casos: 325 pasan, 0 fallan, 4 omitidos |
| Firestore Emulator final | 61 casos pasan; 0 fallos, 0 omitidos; concurrencia real local |

Cobertura de todo src/**/*.js y App.js: instrucciones **89,98%**, ramas **85,13%**, funciones **82,45%**, líneas **90,64%**. La cobertura no demuestra todos los recorridos ni almacenamiento nativo real.

Logs: [Android](orchestration/phase2/build-android-approved.log), [iOS](orchestration/phase2/build-ios-approved.log), [lint](orchestration/phase2/lint-integrated.log), [suite final](orchestration/phase2/final-tests.log), [reglas finales](orchestration/phase2/final-rules-approved.log). [Reporte del tester](../tests/PHASE2_TEST_REPORT.md), [JSON final](../tests/phase2-orchestrator-results.json), [HTML cobertura](../coverage/lcov-report/index.html).

Productos: android/app/build/outputs/apk/debug/app-debug.apk; .cache/xcode-derived/Build/Products/Debug-iphonesimulator/ParceApp.app; bundles en .cache/validation/phase2. Son productos de validación, no versiones publicadas.

Runtime del emulador: Node20.20.1, JDK17.0.10, firebase-tools14.27.0, FirestoreJAR1.19.8. El puerto8080 quedó liberado y los procesos de verificación terminaron. Las fallas iniciales de sandbox/puertos/Metro se resolvieron con escalación autorizada; no se trataron como bugs del producto.

## Seguridad

[Nueva auditoría](SECURITY_REVIEW_PHASE2.md) guardada literalmente; el revisor confirmó el contenido. [Auditoría anterior](SECURITY_REVIEW.md) intacta. No se encontraron hallazgos nuevos confirmados.

De los ocho asuntos históricos, dos resueltos en código (privacidad de participantes y fallback de firma debug) y seis mantienen acciones: **0 Critical, 2 High, 2 Medium, 2 Low, 0 Info**, usando su clasificación histórica. Los altos pendientes son activar/verificar permisos efectivos y resolver/evaluar dependencias restantes. Los medios son la afirmación de identidad del escáner y política Auth por comprobar; los bajos son excepciones del escáner y mantenimiento de almacenamiento cifrado.

Avisos npm separados: completo91 (2critical/67high/22moderate/0low), producción35 (0critical/23high/12moderate/0low), frente a 89/47 antes. Se añadieron herramientas de emulador al árbol completo. Son entradas de paquetes/metapaquetes y no exploits confirmados del binario. Ver [dependencias](DEPENDENCY_REMEDIATION.md) y [firma](SIGNING.md). No declarar seguridad del piloto cerrada con estos resultados locales.

## Bugs detectados y pruebas omitidas

No se identificaron nuevos defectos reproducibles de producción en esta fase. Se corrigieron problemas de integración/validación durante revisión de desarrollo y de fixtures dentro de las pruebas; tester no modificó producción.

Los cuatro skips conocidos del escáner (MVP-12) permanecen: entrada PDF417 vacía/null provoca excepción; acepta mes13/día99; permiso/cámara ausente sin control de salida; excepción del parser propagada por el callback. Mantener entrada manual y corregir/ocultar el escáner antes del piloto; definir documento argentino para Formosa sin presentar lectura como identidad comprobada.

## Pendientes y siguiente entrega recomendada

1. Crear un proyecto Firebase separado de pruebas, verificar política Auth y roles operativos, revisar backup/inventario y aprobar una migración concreta. [Plan de migración](MIGRATION_PLAN.md) unificado con v2; no contiene ejecución automática ni credenciales.
2. Coordinar reglas, índices, datos y cliente en ese entorno. Reglas estrictas pueden rechazar perfiles antiguos con IDs/campos/fechas incompatibles hasta la transformación revisada. Emulador no verifica índices desplegados ni política Firebase efectiva.
3. Realizar aceptación de registro, sesión, reapertura, navegación, reservas/cancelación y publicaciones en dispositivos cuando estén disponibles, cerrando MVP-01/MVP-02.
4. Configurar identidad real de firma, revisar avisos pendientes y planificar sustitución del módulo cifrado con pruebas de tokens/reapertura/salida.
5. Completar MVP-11/MVP-12 y operación del piloto/MVP-13; restaurantes/grupos por ciudad, responsables, cuenta/datos y contenido comercial real.

## Archivos de esta entrega

Conservar todos los cambios locales previos. No se hizo commit ni PR. Los siguientes archivos forman el alcance de segunda entrega; los archivos ya modificados en primera entrega continúan en el árbol de trabajo y no se atribuyen aquí como cambios nuevos.

### Desarrollo: creados

- firebase.json, firestore.rules, firestore.indexes.json, .env.emulator.example
- src/models/partnerPlan.js y src/services/partnerPlans.js
- src/screens/ActivityDetailScreen/ActivityDetailScreen.js
- src/screens/ExplorePlansScreen/ExplorePlansScreen.js, PlanCard.js, usePartnerPlans.js, styles.js
- src/screens/PlanDetailScreen/PlanDetailScreen.js
- src/screens/PartnerPlanAdminScreen/PartnerPlanAdminScreen.js

### Desarrollo: modificados

- .eslintrc.js (CJS tests sin excluirlos), package.json, package-lock.json
- android/app/build.gradle, src/firebase/config.js, README.md
- App.js, src/models/activity.js, src/services/activities.js
- src/screens/HomeScreen/HomeScreen.js y styles.js
- src/screens/MiercolesCenaScreen/MiercolesCenaScreen.js
- src/screens/OtrosEventosScreen/OtrosEventosScreen.js
- src/screens/MyAgendaScreen/MyAgendaScreen.js

### Pruebas

Nuevos: __tests__/ActivityDetailScreen.test.js, PartnerPlansScreens.test.js, partnerPlan.test.js, partnerPlansService.test.js; tests/partnerFixtures.js y tests/emulator/firestore.test.cjs. Actualizados para contrato v2/integración: __tests__/activities.test.js, App.test.tsx, firebaseConfig.test.js, HomeScreen.test.js, MiercolesCenaScreen.test.js, MyAgendaScreen.test.js, OtrosEventosScreen.test.js y WorkflowIntegration.test.js. Resto de suites anteriores preservadas.

### Documentación y evidencia

Nuevos: docs/AUTHORIZATION.md, DEPENDENCY_REMEDIATION.md, SIGNING.md, PARTNER_PLANS.md, NEXT_DELIVERY_PLAN.md, SECURITY_REVIEW_PHASE2.md y este informe; tests/PHASE2_TEST_PLAN.md y PHASE2_TEST_REPORT.md. Actualizados: docs/DATA_MODEL.md, MIGRATION_PLAN.md y MVP_BACKLOG.md. Logs/auditorías en docs/orchestration/phase2; resultados JSON y logs del tester en tests; cobertura y caches locales ignorados.
