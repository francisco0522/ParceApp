# Informe de entrega: MVP-01 a MVP-04

Fecha: 9 de octubre de 2026. Orquestación con Dev A, Dev B, Security Reviewer (solo lectura) y Unit Tester (solo pruebas). Se preservaron los cambios locales anteriores. No se hizo commit, despliegue, migración ni escritura de datos de prueba en Firebase.

## Estado y responsables

| Ticket | Estado | Responsable | Resultado y criterio pendiente |
| --- | --- | --- | --- |
| MVP-01 | partial | Dev A | Firebase Auth como fuente de sesión, persistencia cifrada, perfil por UID, restauración y salida coherentes. Falta validar registro/login/reapertura/salida/botón atrás en dispositivos Android/iOS. |
| MVP-02 | partial | Dev B | Herramientas, assets relativos, navegación y documentación corregidos. Lint, bundles y compilaciones nativas pasan. Falta abrir todas las pantallas del MVP en dispositivos. |
| MVP-03 | done | Dev A | Cuestionario valida, conserva respuestas y guarda la última; editar y reabrir cubiertos con servicios reales y Firestore simulado. Perfil con fechas consistentes y avatar neutral. Validación física pendiente como parte del piloto. |
| MVP-04 | done | Dev B | Esquema único de actividades y reservas, transacciones, fechas completas y agenda por UID. Modelo y plan de migración documentados; migración deliberadamente sin ejecutar. |

MVP-05 a MVP-13 siguen pendientes. La vitrina de publicidad de museos, cafés, teatros y otros aliados está contemplada en MVP-08/MVP-09; no se implementó en esta entrega.

## Decisiones de implementación

- Auth y Redux deben tener el mismo UID para mostrar pantallas protegidas. Salir limpia usuario y eventos; las fechas que llegan a Redux son serializables.
- Registro puede reintentar la escritura del perfil sin recrear la cuenta recién creada. Los errores permiten reintentar y se bloquean envíos duplicados.
- Preferencias opcionales, respuestas booleanas falsas y claves antiguas desconocidas se conservan. La carga y el guardado tienen timeout; un timeout no cancela la escritura de Firestore.
- `activities/{id}` es la única fuente de reservas, mediante `participantIds`. No se duplica en `users.reservas`. Capacidad nula representa ilimitado.
- Fechas completas y zona `America/Bogota`. Cena inicial a las 19:00, capacidad 6, identidad por fecha/grupo default; ciudad, restaurantes y grupos operativos corresponden a MVP-05.
- Los eventos usan una identidad determinista y el creador participa una sola vez. Capacidad, estado, fecha y duplicados se comprueban en la transacción; falta la protección verificable del servidor en MVP-10.
- La migración de cenas antiguas sin año requiere una asignación explícita; no se inventa el año actual. Ver [modelo](DATA_MODEL.md) y [plan de migración](MIGRATION_PLAN.md).
- ESLint 8 y plugins compatibles con React Native; Jest simula módulos externos. Android carga dotenv después del plugin de aplicación. En iOS solo el target fmt usa C++17 para compilar con Xcode 26.6; React Native/Folly mantienen su configuración.

## Verificación del orquestador

- Android Debug arm64-v8a: BUILD SUCCESSFUL; APK en `android/app/build/outputs/apk/debug/app-debug.apk`. Log: [Android](orchestration/build-android-final.log).
- iOS Debug Simulator arm64/x86_64: BUILD SUCCEEDED; app en `.cache/xcode-derived/Build/Products/Debug-iphonesimulator/ParceApp.app`. Log: [iOS](orchestration/build-ios-fmt17-retry.log).
- Bundles Metro release Android/iOS generados correctamente. Estas verificaciones no equivalen a abrir la app ni comprobar persistencia real.
- Lint final: 0 errores y 96 advertencias. [Log](orchestration/final-lint.log).
- `git diff --check`: correcto.
- Ejecución final: 21 suites pasan; 214 casos totales, 210 pasan, 0 fallan, 4 omitidos. [Log](orchestration/final-tests.log), [resultados JSON](../tests/final-results.json), [reporte del tester](../tests/FINAL_TEST_REPORT.md).
- Cobertura de todo `src/**/*.js` más `App.js`: instrucciones 90,37%; ramas 86%; funciones 85,52%; líneas 90,18%. [HTML](../coverage/lcov-report/index.html).

Las pruebas usan mocks de Firebase, navegación, cámara y almacenamiento. No prueban reglas desplegadas, contención real, Keychain/Keystore ni persistencia tras finalizar el proceso.

## Seguridad

[Revisión íntegra](SECURITY_REVIEW.md), guardada literalmente como la entregó el revisor. OWASP Top 10:2025, última edición general verificada. No se aplicaron recomendaciones.

| Severidad | Hallazgos |
| --- | ---: |
| Critical | 0 |
| High | 3 |
| Medium | 3 |
| Low | 2 |
| Info | 0 |

Total: 8. Los altos corresponden a autorización del servidor no verificable en el repositorio, firma Android release con debug y dependencias con avisos de vulnerabilidad. Los restantes cubren exposición de participantes, etiqueta de identidad verificada, política de contraseña por verificar, escáner y mantenimiento del almacenamiento cifrado. El informe distingue riesgos de vulnerabilidades explotables confirmadas y no afirma que las reglas desplegadas sean permisivas.

Los recuentos de npm audit son entradas de paquetes, no ocho hallazgos adicionales ni exploits móviles demostrados: completo 89 (4 critical, 68 high, 15 moderate, 2 low); producción 47 (3 critical, 30 high, 12 moderate, 2 low). JSON guardados en `docs/orchestration/npm-audit*.json`.

## Bugs detectados por pruebas

Cuatro defectos existentes quedan explícitamente omitidos y asignados a MVP-12:

1. PDF417 vacío/null provoca excepción.
2. El parser acepta fechas imposibles, como mes 13 y día 99.
3. Cámara sin permiso o dispositivo no ofrece control de salida.
4. Una lectura inválida propaga la excepción del parser.

Tres defectos anteriores ya tienen regresiones que pasan: reservar cena sin selección, agenda leyendo `uid` en lugar de `id` y `Platform` sin importar. No se identificaron nuevos defectos reproducibles en el alcance entregado.

## Preguntas, riesgos y siguientes pasos

1. Ejecutar aceptación en Android/iOS para cerrar MVP-01/MVP-02, usando un entorno Firebase controlado.
2. Revisar los hallazgos altos antes del piloto público. Versionar y probar reglas/índices (MVP-10), preparar firma de distribución (MVP-13) y evaluar actualizaciones de dependencias. No se hicieron correcciones de seguridad en esta fase.
3. Confirmar ciudad del piloto, asignación de restaurantes/grupos y autorización para crear eventos. Completar cenas, eventos y cancelación (MVP-05 a MVP-07); las reservas múltiples aún pueden tener éxito parcial.
4. Revisar el inventario de datos antiguos y aprobar una migración concreta antes de usar las colecciones canónicas con cuentas/reservas existentes.
5. Definir operación de anuncios y contenido de aliados para MVP-08/MVP-09, incluida vigencia, ciudades y enlaces externos.
6. Resolver/ocultar el escáner antes del piloto y completar gestión de cuenta. La cobertura automatizada no sustituye estas decisiones operativas ni el recorrido físico.

## Archivos

El siguiente inventario muestra archivos del árbol de trabajo final; algunos ya contenían cambios del usuario antes de esta ejecución. `.env.example` y `.codex/agents/` eran preexistentes. Los logs y auditorías de esta ejecución están en `docs/orchestration/`; los productos generados en `coverage/`, `.cache/` y directorios de build.

### Archivos modificados

- `.gitignore`
- `App.js`
- `README.md`
- `__tests__/App.test.tsx`
- `android/app/build.gradle`
- `ios/Podfile`
- `ios/Podfile.lock`
- `jest.config.js`
- `package-lock.json`
- `package.json`
- `src/components/Header.js`
- `src/firebase/config.js`
- `src/screens/Footer/Footer.js`
- `src/screens/HomeScreen/HomeScreen.js`
- `src/screens/LoginScreen/LoginScreen.js`
- `src/screens/MiercolesCenaScreen/MiercolesCenaScreen.js`
- `src/screens/MiercolesCenaScreen/styles.js`
- `src/screens/MyAgendaScreen/MyAgendaScreen.js`
- `src/screens/OtrosEventosScreen/OtrosEventosScreen.js`
- `src/screens/OtrosEventosScreen/styles.js`
- `src/screens/ProfileScreen/ProfileScreen.js`
- `src/screens/ProileCreationScreen/ProfileCreationScreen.js`
- `src/screens/RegistrationScreen/RegistrationScreen.js`
- `src/screens/RegistrationScreen/styles.js`
- `src/screens/SplashScreen/SplashScreen.js`
- `src/slices/eventosSlice.js`
- `src/slices/userSlice.js`
- `src/thunks/eventosThunks.js`

### Archivos nuevos de entrega

- `.eslintignore`
- `__tests__/AuthScreens.test.js`
- `__tests__/CameraScanner.test.js`
- `__tests__/Footer.test.js`
- `__tests__/Header.test.js`
- `__tests__/HomeScreen.test.js`
- `__tests__/MiercolesCenaScreen.test.js`
- `__tests__/MyAgendaScreen.test.js`
- `__tests__/OtrosEventosScreen.test.js`
- `__tests__/ProfileCreationScreen.test.js`
- `__tests__/ProfileScreen.test.js`
- `__tests__/WorkflowIntegration.test.js`
- `__tests__/activities.test.js`
- `__tests__/eventosSlice.test.js`
- `__tests__/fetchEventos.test.js`
- `__tests__/firebaseConfig.test.js`
- `__tests__/parseCedula.test.js`
- `__tests__/profile.test.js`
- `__tests__/rootReducer.test.js`
- `__tests__/session.test.js`
- `__tests__/sessionStorage.test.js`
- `config/jest.setup.js`
- `docs/DATA_MODEL.md`
- `docs/MIGRATION_PLAN.md`
- `docs/MVP_BACKLOG.md`
- `docs/SECURITY_REVIEW.md`
- `src/models/activity.js`
- `src/services/activities.js`
- `src/services/profile.js`
- `src/services/session.js`
- `src/services/sessionStorage.js`
- `tests/BASELINE_TEST_REPORT.md`
- `tests/FINAL_TEST_REPORT.md`
- `tests/final-results.json`
