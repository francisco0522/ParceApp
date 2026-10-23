# Dependencias — evaluación SEC-04 y SEC-08

Fecha: 9 de octubre de 2026. Auditoría histórica `SECURITY_REVIEW.md` conservada. No se aplicó `audit fix --force`, ningún despliegue ni cambios de versión mayor React Native/React/Navigation.

## Cambios compatibles

Firebase 11.4.0 → 11.10.0 (misma versión mayor), Moment 2.30.1 → 2.31.0, Babel 7 actualizado dentro de rangos declarados. Se actualizaron ramas transitivas compatibles con sus rangos, entre ellas protobufjs 7.6.6, shell-quote 1.12.0 y websocket-driver 0.7.5. Se conservó el stack React Native 0.77 y los módulos nativos existentes. Versiones exactas resueltas y relaciones en package-lock.json.

Fuentes de avisos originales: [protobufjs](https://github.com/protobufjs/protobuf.js/security/advisories/GHSA-xq3m-2v4x-88gg), [shell-quote](https://github.com/ljharb/shell-quote/security/advisories/GHSA-w7jw-789q-3m8p), [websocket-driver](https://github.com/faye/websocket-driver-node/security/advisories/GHSA-xv26-6w52-cph6) y [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-m7jm-9gc2-mpf2). Versiones y rangos consultados directamente en npm; actualización basada en compatibilidad, no solo conteos.

## Herramientas locales Firebase

Se añadieron exclusivamente devDependencies exactas `@firebase/rules-unit-testing` 4.0.1 (peer Firebase ^11, Node >=18) y `firebase-tools` 14.27.0 (Node >=20, compatible con JDK17). Proyecto de pruebas `demo-parceapp`; no credenciales reales ni deploy. Script `npm run test:rules` ejecuta únicamente emulador Firestore y `node --test tests/emulator/*.test.cjs`. El runner y la configuración de reglas pertenecen a sus respectivas entregas.

Fuentes: [versión Firebase CLI](https://github.com/firebase/firebase-tools/releases/tag/v14.27.0), [SDK oficial](https://github.com/firebase/firebase-js-sdk/releases), [Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure). CLI futura puede exigir otro JDK/Node: no instalar última mayor automáticamente.

## Resultado npm y avisos pendientes

| Árbol | Antes | Después | Critical después | High después | Moderate después |
| --- | ---: | ---: | ---: | ---: | ---: |
| Completo | 89 | 91 | 2 | 67 | 22 |
| omit=dev | 47 | 35 | 0 | 23 | 12 |

No hubo avisos low restantes. El árbol completo incorpora 578 paquetes de herramientas de emulador; los conteos no son comparables sin considerar ese cambio. Npm cuenta cadenas transitivas/metapaquetes, no fallos independientes ni exploits confirmados del binario.

Permanecen avisos: fast-xml-parser en CLI RN (npm propone CLI20 fuera de compatibilidad RN0.77); braces y sprintf-js (npm propone RN0.86); decode-uri-component (Navigation7); grpc-js en rama Node de Firebase11 con rango estrecho (npm propone downgrade Firebase9, rechazado); tar y ramas firebase-tools14 (npm propone tools15). Hay avisos adicionales transitivos en brace-expansion, image-size, node-forge y utilidades de herramientas. No se impusieron overrides de mayores incompatibles solo para ocultar avisos. Las rutas Firebase Node/CLI no demuestran inclusión o alcanzabilidad en runtime móvil. Revisar imports/bundles/CI y actualizar stack como proyecto separado antes de declarar resueltos esos avisos.

Informes completos antes/después y producción después en `docs/orchestration/phase2/npm-audit*.json`; registros de installs y updates allí. `npm audit` devuelve exit1 por avisos, no por fallo del comando cuando el JSON contiene metadata/vulnerabilities.

## SEC-08 almacenamiento cifrado

Se verificó [encrypted-storage](https://github.com/emeraldsanto/react-native-encrypted-storage), archivado, y [react-native-keychain](https://github.com/oblador/react-native-keychain), alternativa mantenida con API Keychain/Keystore. No se encontró exploit criptográfico actual en esta evaluación. No se sustituyó la persistencia de Firebase: hacerlo requiere adapter getItem/setItem/removeItem, aislamiento por claves/proyecto, migración de tokens antiguos sin pérdida ni exposición, salida y pruebas de reapertura/errores/reinstalación en Android/iOS. El usuario aplazó aceptación en dispositivos. SEC-08 permanece pendiente; dependencia archivada retenida temporalmente con riesgo de mantenimiento explícito, no se afirma aceptación definitiva ni seguridad certificada.

## Verificación de esta fase

Lint: 0 errores y 96 warnings. Suite en transición de modelo v1→v2: 18 suites pasan y 3 fallan (190 pasan, 20 fallan, 4 omitidas); tester actualizará contrato y mock de Firestore del modo emulador. Resultado final se verifica tras integrar funcionalidades. Release Android sin secretos falla con mensaje de firma requerida (dry-run); ningún keystore creado. Builds y bundles finales pendientes de integración; apertura y validación nativa aplazadas por solicitud del usuario.
