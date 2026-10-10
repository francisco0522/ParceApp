# Auditoría de seguridad — ParceApp, MVP-01 a MVP-04

**Fecha:** 9 de octubre de 2026, America/Bogota.  
**Modalidad:** revisión exclusivamente de lectura. No se modificaron archivos ni se aplicaron recomendaciones.

## Resultado

Se identificaron **8 hallazgos**. No se confirmó explotación remota en la aplicación ni acceso no autorizado a Firebase.

| Severidad del hallazgo | Cantidad |
| --- | ---: |
| Critical | 0 |
| High | 3 |
| Medium | 3 |
| Low | 2 |
| Info | 0 |

Antes de distribuir el MVP deben verificarse los permisos efectivos de Firebase, resolver la firma Android de producción y evaluar las dependencias vulnerables. La privacidad de los participantes requiere revisar el modelo de lectura de actividades.

La clasificación usa **OWASP Top 10:2025**, última edición general publicada que se verificó en el sitio oficial. Las ediciones 2026 de proyectos especializados, como aplicaciones de IA o contratos inteligentes, no sustituyen la clasificación general aplicable a esta revisión. [OWASP Top 10:2025](https://top10.owasp.org/2025/)

## Alcance y método

Se revisaron el código de autenticación, persistencia, perfiles, actividades, reservas y navegación; Redux; utilidades heredadas de cámara y documento; configuración Firebase; configuración Android/iOS y cambios de herramientas. Se contrastaron `README.md`, `docs/MVP_BACKLOG.md`, `docs/DATA_MODEL.md`, `docs/MIGRATION_PLAN.md`, `package.json`, `package-lock.json` e `ios/Podfile.lock`.

La revisión combinó lectura estática del código y sus cambios, comprobación de versiones y relaciones transitivas en el lockfile y consulta de fuentes oficiales. Para dependencias se utilizaron los informes preparados por el orquestador:

- `docs/orchestration/npm-audit.json`
- `docs/orchestration/npm-audit-production.json`

No se ejecutaron `npm audit`, instalaciones, builds, pruebas, migraciones ni solicitudes contra Firebase. No se leyeron valores de `.env`, no se reprodujeron claves y no se intentó explotar ningún hallazgo.

## Hallazgos

### SEC-01 — Autorización y restricciones de Firestore sin evidencia verificable en el repositorio

**OWASP:** A01:2025 — Broken Access Control.  
**Severidad:** High.  
**Estado:** brecha de verificación constatada; explotación dependiente de la configuración desplegada.  
**Ubicación:**

- `src/services/activities.js`, líneas 20–24, 98–109 y 125–163.
- `src/services/profile.js`, líneas 117–120 y 157–165.
- `src/services/session.js`, líneas 77–86.
- `docs/DATA_MODEL.md`, líneas 33 y 39–41.

**Descripción:** los servicios validan el UID, las respuestas, la capacidad y las fechas dentro del cliente. No hay reglas Firestore versionadas ni pruebas de reglas que permitan comprobar esas restricciones frente a un cliente modificado. El propio modelo reconoce que esta protección queda pendiente en MVP-10.

Esto **no demuestra que Firebase desplegado carezca de reglas** ni que sus reglas sean permisivas: no se tuvo acceso a ellas. Demuestra que la revisión del repositorio no puede acreditar la autorización del sistema. Firebase aplica la autorización mediante reglas con condiciones como `request.auth`; la comprobación local no reemplaza ese control. [Condiciones de reglas Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions)

**Escenario de explotación:** si las reglas desplegadas permiten escrituras amplias a usuarios autenticados, alguien podría omitir los servicios y enviar documentos directamente: agregar UID ajenos, modificar capacidad o creador, reservar actividades cerradas, alterar perfiles ajenos o marcar un perfil como completo con datos inválidos. El escenario requiere permisos efectivos suficientes en Firebase.

**Recomendación:** recuperar y revisar las reglas reales del entorno, versionarlas y probarlas con Emulator Suite. Restringir perfiles al propietario, proteger campos sensibles, limitar modificaciones de membresía al UID autenticado y comprobar esquema, cupos, estados y fechas con autoridad del servidor. Documentar roles y permisos de creación.

### SEC-02 — El listado de eventos entrega la lista completa de participantes

**OWASP:** A01:2025 — Broken Access Control.  
**Severidad:** Medium.  
**Estado:** comportamiento arquitectónico constatado; exposición efectiva condicionada a permitir el listado.  
**Ubicación:**

- `src/services/activities.js`, líneas 47–53.
- `src/models/activity.js`, líneas 22–24 y 32–37.
- `src/thunks/eventosThunks.js`, líneas 2–5.
- `docs/DATA_MODEL.md`, líneas 5 y 15.

**Descripción:** el catálogo consulta documentos completos de `activities`; estos contienen `participantIds`. El adaptador conserva todos los campos mediante `...data` y el thunk los almacena en Redux. Por tanto, un usuario que pueda listar un evento recibe los UID de sus participantes aunque la pantalla solo muestre un conteo.

Los UID no revelan por sí solos nombres o correos, pero permiten vincular personas mediante un identificador estable y reconstruir su asistencia entre eventos. Firestore no permite ocultar campos particulares de un documento mediante reglas de lectura: debe autorizarse o rechazarse el documento completo. [Lectura y privacidad de campos en Firestore](https://firebase.google.com/docs/firestore/security/rules-fields)

**Escenario de explotación:** un usuario autorizado para consultar el catálogo inspecciona las respuestas del SDK o el estado de la app y correlaciona los mismos UID entre distintas actividades. No necesita vulnerar la interfaz. El escenario requiere que Firebase permita el listado previsto por el producto.

**Recomendación:** definir explícitamente quién puede conocer la membresía. Separar la información pública del catálogo de la información privada de reservas o entregar una proyección autorizada desde servidor. Conservar una fuente canónica de membresías y derivar el conteo público sin exponer el array completo.

### SEC-03 — Android release utiliza la clave de firma de debug

**OWASP:** A02:2025 — Security Misconfiguration.  
**Severidad:** High.  
**Estado:** configuración constatada; riesgo condicionado a distribuir ese artefacto.  
**Ubicación:** `android/app/build.gradle`, líneas 88–103.

**Descripción:** el tipo `release` utiliza `signingConfigs.debug`. El archivo `android/app/debug.keystore` está presente y la configuración declara sus credenciales de desarrollo.

La firma identifica al editor y permite verificar actualizaciones; una clave de desarrollo disponible junto al proyecto no constituye una identidad de distribución controlada. [Firma de aplicaciones Android](https://developer.android.com/studio/publish/app-signing)

**Escenario de explotación:** si se distribuye un APK firmado con esa clave y un tercero obtiene el keystore, puede firmar una versión modificada con la misma identidad. La instalación requeriría un canal que acepte ese APK y la participación del usuario o del sistema de distribución; no implica una actualización automática a través de Google Play.

**Recomendación:** configurar una clave propia de distribución o el mecanismo correspondiente de Play App Signing; mantener la clave de carga y sus credenciales fuera del repositorio. Hacer que release falle si no existe configuración de firma de producción. Reservar la firma debug para desarrollo.

### SEC-04 — Dependencias bloqueadas con avisos de seguridad pendientes de evaluación y actualización

**OWASP:** A03:2025 — Software Supply Chain Failures.  
**Severidad:** High.  
**Estado:** versiones afectadas constatadas; alcanzabilidad de explotación no confirmada.  
**Ubicación:**

- `package.json`, líneas 14–22 y 28.
- `package-lock.json`, líneas 2416–2430, 2784–2794, 7243–7248, 11585–11590, 12871–12875 y 13918–13925.
- Informes `docs/orchestration/npm-audit*.json`.

**Descripción:** el árbol instalado conserva versiones afectadas por avisos públicos. Entre los casos relevantes:

| Dependencia bloqueada | Procedencia comprobada | Condición relevante |
| --- | --- | --- |
| `protobufjs` 7.4.0 | Firebase → Firestore → `@grpc/proto-loader` | El aviso de ejecución de código requiere definiciones o descriptores protobuf controlados por un atacante. No se encontró ese flujo en el código de ParceApp. |
| `shell-quote` 1.8.2 | CLI React Native y `react-devtools-core` | La inyección requiere objetos de operador manipulables y que el resultado se ejecute en una shell. No se confirmó esa cadena en la app. |
| `websocket-driver` 0.7.4 | Firebase → Realtime Database → `faye-websocket` | El aviso afecta procesamiento de cabeceras de longitud del protocolo WebSocket antiguo. ParceApp no importa Realtime Database en sus servicios revisados. |
| `fast-xml-parser` 4.5.3 | Herramientas CLI Android/Apple; marcado como desarrollo | La vulnerabilidad requiere XML no confiable y uso posterior sensible a inyección. No se identificó ese flujo en las pantallas. |

Las condiciones proceden de los avisos de los mantenedores: [protobufjs](https://github.com/protobufjs/protobuf.js/security/advisories/GHSA-xq3m-2v4x-88gg), [shell-quote](https://github.com/ljharb/shell-quote/security/advisories/GHSA-w7jw-789q-3m8p), [websocket-driver](https://github.com/faye/websocket-driver-node/security/advisories/GHSA-xv26-6w52-cph6) y [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-m7jm-9gc2-mpf2).

**Escenario de explotación:** un proceso que use esos componentes podría quedar comprometido si alcanza sus condiciones específicas: cargar un descriptor protobuf adversario, ejecutar tokens shell manipulados o procesar entradas de protocolo/XML maliciosas. No se ha demostrado que esos escenarios sean alcanzables desde el binario móvil actual. La instalación transitiva tampoco demuestra inclusión en el bundle React Native.

**Recomendación:** priorizar actualizaciones compatibles y revisar cada aviso según plataforma y flujo real. Evaluar por separado runtime móvil, herramientas de desarrollo y CI. No aplicar automáticamente `npm audit fix --force`: algunas propuestas cambian versiones mayores del ecosistema React Native. Validar lockfile, bundles, builds y pruebas tras cada conjunto de actualizaciones.

### SEC-05 — El escaneo se presenta como verificación de identidad sin comprobar autenticidad

**OWASP:** A06:2025 — Insecure Design.  
**Severidad:** Medium.  
**Estado:** comportamiento constatado; impacto limitado al flujo y las expectativas actuales.  
**Ubicación:**

- `src/screens/RegistrationScreen/RegistrationScreen.js`, líneas 68–79 y 245–260.
- `src/utils/parseCedula.js`, líneas 30–69.

**Descripción:** cualquier lectura que el parser acepte establece `verificado = true` y muestra “Identidad verificada”. El proceso extrae texto; no comprueba autenticidad del documento, vínculo con su titular ni posesión legítima. Además, el nombre y la fecha pueden editarse después sin invalidar el indicador.

El estado no se persiste en `register` ni se encontró un beneficio o permiso servidor concedido por él. Por ello, no se afirma una elevación de privilegios actual.

**Escenario de explotación:** una persona presenta un PDF417 generado o copiado con estructura compatible, obtiene el indicador y puede modificar los datos autocompletados. Usuarios u operadores podrían interpretar esa etiqueta como una garantía de identidad que el flujo no proporciona.

**Recomendación:** describir la función como autocompletado por escaneo. Si el producto necesita verificación real, definir un proceso verificable y un estado controlado desde servidor, independiente del formulario editable. Revisar las promesas de beneficios y privacidad antes del piloto.

### SEC-06 — Entradas de escaneo inválidas pueden producir excepciones sin tratamiento

**OWASP:** A10:2025 — Mishandling of Exceptional Conditions.  
**Severidad:** Low.  
**Estado:** fallo deducible directamente del código; no reproducido en dispositivo.  
**Ubicación:**

- `src/utils/parseCedula.js`, líneas 8, 31–38 y 42–65.
- `src/utils/CameraScanner.js`, líneas 29–34.

**Descripción:** el parser asume una cadena con coincidencias y segmentos específicos. Un valor vacío, ausente o incompatible puede hacer fallar `replaceAll`, `.index` o `.slice`. El callback de cámara no captura ese error ni ofrece un resultado de validación.

**Escenario de explotación:** una persona muestra ante la cámara un código PDF417 incompatible o fabricado. La lectura puede interrumpir el flujo de registro mediante una excepción JavaScript. Requiere interacción local; no se identificó una vía remota ni exposición de datos causada por este fallo.

**Recomendación:** validar tipo, longitud, estructura y fechas antes de extraer datos. Devolver un resultado de error controlado, capturar fallos del callback y evitar lecturas repetidas. Mantener una salida accesible cuando no haya cámara o permiso. Corresponde a MVP-12.

### SEC-07 — La política de contraseña depende de validación cliente y no está acreditada en Firebase

**OWASP:** A07:2025 — Authentication Failures.  
**Severidad:** Medium.  
**Estado:** validación local constatada; configuración servidor no verificada.  
**Ubicación:**

- `src/screens/RegistrationScreen/RegistrationScreen.js`, líneas 26–37 y 108–113.
- `src/services/session.js`, líneas 65–75.

**Descripción:** la interfaz exige ocho caracteres, una letra y un número. El servicio llama directamente a Firebase Authentication, y no hay evidencia revisable de una política equivalente o superior aplicada al proyecto.

No se afirma que Firebase acepte contraseñas débiles en el entorno real. Firebase permite configurar una política de contraseña exigida desde su consola; sin inspeccionarla no puede acreditarse que la validación local se cumpla para otros clientes. [Políticas de contraseña Firebase](https://firebase.google.com/docs/auth/web/password-auth)

**Escenario de explotación:** si la política desplegada es menos exigente, alguien omite la app y crea cuentas directamente con contraseñas que la interfaz rechazaría. Esto facilita cuentas débiles; no demuestra acceso a una cuenta ajena ni ausencia de límites del proveedor.

**Recomendación:** definir y comprobar la política efectiva de Firebase, exigirla en el proveedor y alinear los mensajes cliente con ella. Revisar también protección contra enumeración y abuso en el entorno real. Evitar presentar la regla local de composición como garantía suficiente.

### SEC-08 — La persistencia de credenciales depende de un módulo archivado

**OWASP:** A03:2025 — Software Supply Chain Failures.  
**Severidad:** Low.  
**Estado:** riesgo de mantenimiento constatado; vulnerabilidad criptográfica no demostrada.  
**Ubicación:**

- `package.json`, línea 28.
- `src/services/sessionStorage.js`, líneas 1–16.
- `src/firebase/config.js`, líneas 24–25.

**Descripción:** la persistencia de Firebase utiliza `react-native-encrypted-storage` 4.0.3. El repositorio del mantenedor está archivado desde noviembre de 2023. El módulo envuelve EncryptedSharedPreferences en Android y Keychain en iOS; su archivo no demuestra cifrado inseguro, pero limita la respuesta mantenida frente a cambios de plataforma y problemas futuros. [Repositorio del mantenedor](https://github.com/emeraldsanto/react-native-encrypted-storage)

**Escenario de explotación:** si aparece una vulnerabilidad en el módulo o una incompatibilidad que comprometa el tratamiento de credenciales, el proyecto podría necesitar mantener su propia corrección. No se identificó un exploit actual ni se comprobó extracción de tokens.

**Recomendación:** evaluar una alternativa mantenida compatible con Firebase o asumir formalmente el mantenimiento del módulo. Validar almacenamiento y salida en dispositivos reales, incluyendo errores de Keychain/Keystore, reapertura y comportamiento tras reinstalación.

## Conteos de dependencias: separados de los hallazgos

| Informe npm | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Árbol completo | 4 | 68 | 15 | 2 | 89 |
| `omit=dev` | 3 | 30 | 12 | 2 | 47 |

Estos números cuentan **entradas de paquetes clasificadas por npm**, incluidas cadenas transitivas y metapaquetes. No representan 89 vulnerabilidades independientes, 47 fallos del binario ni exploits confirmados.

Excluir dependencias de desarrollo tampoco elimina todas las herramientas del árbol: React Native y Firebase incluyen ramas utilizadas en distintos entornos. Las severidades del registro pueden diferir de las del aviso original del mantenedor. Para decidir prioridad deben conservarse tanto el dato del registro como las condiciones reales de explotación.

## Controles observados y áreas sin hallazgos confirmados

- Authentication determina la sesión; los perfiles usan `users/{uid}` y los servicios comprueban correspondencia de UID.
- Las rutas privadas comprueban sesión; la salida invoca `signOut` y limpia estado y claves heredadas.
- La persistencia nueva utiliza almacenamiento nativo cifrado. No se encontró almacenamiento explícito de contraseñas en texto plano.
- Las reservas usan transacciones y validan duplicados, capacidad, estado y fecha en el cliente.
- El cuestionario rechaza claves peligrosas como `__proto__`, valida opciones y controla callbacks tras cambios de sesión.
- No se encontraron `console.*` con información personal en `src`, uso de `eval`, WebView ni concatenación de consultas SQL en el código revisado.
- Android tiene `allowBackup=false`; iOS no permite cargas arbitrarias globales en App Transport Security.

La configuración Firebase consumida por `react-native-config` sigue siendo configuración distribuida con el cliente. Moverla a `.env` evita su inclusión accidental en código fuente, pero no la convierte en un secreto del servidor. Firebase distingue sus claves de identificación del proyecto de credenciales privadas de servicios. No se reprodujeron valores y no se detectaron credenciales privadas de servidor en el código revisado. [Claves API de Firebase](https://firebase.google.com/docs/projects/api-keys)

## Limitaciones y validación pendiente

Esta auditoría no certifica seguridad de producción. No se inspeccionaron reglas desplegadas, IAM, App Check, política de contraseña, cuotas, registros ni alertas de Firebase. Tampoco se evaluó el historial Git completo ni archivos privados de entorno.

No hubo pruebas de penetración, análisis dinámico de red, comprobación de cifrado en dispositivos ni confirmación de alcanzabilidad de todos los avisos de dependencias. Los builds y bundles del orquestador no sustituyen esas comprobaciones.

No se confirmó una inyección en funcionalidades de la app ni una filtración de información personal en logs actuales. La ausencia de evidencia en esta revisión estática no acredita ausencia de vulnerabilidades. Las recomendaciones quedan documentadas para su evaluación; **no se aplicó ninguna corrección de seguridad**.
