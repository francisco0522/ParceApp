# Auditoría de seguridad — ParceApp, segunda entrega

**Fecha:** 9 de octubre de 2026, America/Bogota.  
**Modalidad:** exclusivamente de lectura. El revisor no modificó, creó ni eliminó archivos, no ejecutó instalaciones, pruebas, builds, migraciones ni despliegues.

## Resultado

No se identificaron **hallazgos nuevos confirmados** en las reglas y funcionalidades revisadas. Las correcciones de autorización, privacidad del catálogo y configuración de firma mejoran la base local.

De los ocho hallazgos históricos, **dos están resueltos en el código y seis conservan acciones pendientes**. “Resuelto en código” no significa que las correcciones estén desplegadas en Firebase ni que exista un binario firmado para distribución.

| Severidad histórica de los asuntos pendientes | Cantidad |
| --- | ---: |
| Critical | 0 |
| High | 2 |
| Medium | 2 |
| Low | 2 |
| Info | 0 |
| Total | 6 |

Estos conteos conservan la clasificación histórica para seguimiento. Incluyen una verificación externa pendiente de permisos efectivos; no representan seis exploits confirmados. Los avisos de npm se contabilizan por separado.

La clasificación empleada es **OWASP Top 10:2025**, última edición general verificada en la fuente oficial. Los proyectos especializados con ediciones 2026 no sustituyen esta clasificación general. [OWASP Top 10](https://top10.owasp.org/)

## Alcance y evidencia

Se revisaron:

- `firestore.rules`, índices y configuración Firebase; autorización, límites de capacidad y atomicidad.
- Modelos y servicios de actividades, perfiles, sesión y publicaciones.
- Navegación, pantallas de cenas, eventos, agenda, detalle, Home, exploración y administración.
- Firma Android, configuración del modo emulador, dependencias y lockfile.
- Documentación de autorización, modelo, migración, dependencias, firma y publicidad.
- Pruebas de reglas y reportes locales existentes como evidencia documental, sin volver a ejecutarlos.

Las pruebas del emulador usan `demo-parceapp`, identidades sintéticas y claims simulados. Demuestran comportamiento del contrato local cuando pasan; no inspeccionan la política desplegada, IAM ni los usuarios reales.

## Resolución de la auditoría histórica

| ID | Severidad original | Estado actual | Evidencia y pendiente |
| --- | --- | --- | --- |
| SEC-01 | High | Parcial | Reglas versionadas con denegación por defecto, permisos propios y claims administrativos. Falta verificar y activar el contrato en un entorno Firebase autorizado. |
| SEC-02 | Medium | Resuelto en código | Catálogo v2 sin participantes; membresías privadas. Legacy denegado. Falta migración y activación coordinadas para que la corrección sea efectiva sobre datos reales. |
| SEC-03 | High | Resuelto en código | Release utiliza configuración propia y falla sin credenciales; eliminado el fallback a debug. Configurar y verificar identidad real de distribución permanece pendiente. |
| SEC-04 | High | Parcial | Varias dependencias vulnerables actualizadas; otros avisos siguen en el lockfile. Alcanzabilidad móvil y compatibilidad de remedios restantes pendientes. |
| SEC-05 | Medium | Pendiente | El escaneo sigue mostrando “Identidad verificada” sin comprobar autenticidad del documento. |
| SEC-06 | Low | Pendiente | Datos PDF417 inesperados pueden lanzar excepciones sin manejo en el callback. |
| SEC-07 | Medium | Pendiente de verificación | Validación de contraseña en cliente; política efectiva de Firebase Auth no inspeccionada. |
| SEC-08 | Low | Diferido | Persistencia conserva módulo archivado; sustitución y validación en dispositivos pendientes. |

### SEC-01 — Permisos efectivos de Firebase todavía sin verificar

**OWASP:** A01:2025 — Broken Access Control.  
**Severidad histórica:** High.  
**Estado:** parcial; corrección local implementada, verificación externa pendiente.  
**Archivos y líneas:** `firestore.rules:4–6`, `32–68`, `80–107`, `122–133`; `src/firebase/config.js:23–72`.

**Descripción:** las reglas nuevas vinculan reservas con el UID autenticado, restringen escritura de actividades/publicaciones a claims firmados y rechazan colecciones desconocidas. Las altas y bajas de membresía requieren cambios coherentes del contador mediante `getAfter`. No se detectó un bypass de estas comprobaciones en la revisión.

El proyecto real no fue inspeccionado ni recibió estas reglas durante la entrega. Por tanto, no puede darse por cerrada la autorización efectiva del piloto.

**Escenario:** si el proyecto actual conservara reglas incompatibles o permisivas, un cliente modificado podría efectuar las operaciones que esas reglas permitan. Este escenario no fue confirmado contra producción.

**Recomendación:** verificar reglas e IAM efectivos en un entorno autorizado; coordinar migración, reglas, índices y cliente antes del piloto. Repetir pruebas de dueño/ajeno, roles, capacidad y concurrencia sobre el entorno de aceptación. No desplegar automáticamente el archivo local sobre datos legacy. [Transacciones y validación atómica](https://firebase.google.com/docs/firestore/manage-data/transactions)

### SEC-04 — Avisos de dependencias parcialmente corregidos

**OWASP:** A03:2025 — Software Supply Chain Failures.  
**Severidad:** High.  
**Estado:** parcial.  
**Archivos y líneas:** `package.json:19–29`, `45–63`; `package-lock.json:3216–3228`, `10730–10748`, `20302–20320`.

**Descripción:** se actualizaron Firebase, protobufjs, shell-quote y websocket-driver. Permanecen, entre otras ramas, `fast-xml-parser` 4.5.3, `@grpc/grpc-js` 1.9.16 y `tar` 6.2.1 con avisos actuales. Las versiones bloqueadas son evidencia verificable de componentes afectados; no prueban explotación del binario móvil.

El parser XML pertenece a herramientas de desarrollo y admite una vulnerabilidad de procesamiento de entidades. El aviso de gRPC requiere configuraciones concretas de autenticación de certificados en un servidor. La app revisada no implementa ese servidor ni usa `getAuthContext`. Tar permanece en herramientas y requiere evaluar las rutas que procesan archivos. [Aviso del mantenedor del parser XML](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-m7jm-9gc2-mpf2), [aviso del mantenedor de gRPC](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j), [aviso del mantenedor de tar](https://github.com/isaacs/node-tar/security/advisories/GHSA-23hp-3jrh-7fpw)

**Escenario:** procesar XML o archivos controlados por un atacante mediante herramientas vulnerables puede afectar desarrollo/CI; un servidor que use la configuración gRPC afectada podría aceptar información de certificado no autorizada. No se reprodujeron estos escenarios en ParceApp.

**Recomendación:** documentar alcanzabilidad por entorno, actualizar ramas compatibles pendientes y planificar los cambios de stack que requieren versiones mayores. Verificar especialmente herramientas que consumen archivos externos en CI. Mantener las excepciones con responsable y revisión; no emplear actualizaciones forzadas para reducir el contador.

### SEC-05 — El escaneo continúa presentado como verificación de identidad

**OWASP:** A06:2025 — Insecure Design.  
**Severidad:** Medium.  
**Estado:** pendiente, correspondiente a MVP-12.  
**Archivos y líneas:** `src/screens/RegistrationScreen/RegistrationScreen.js:67–80`, `243–245`; `src/utils/parseCedula.js:5–70`.

**Descripción:** la lectura y extracción de datos pone `verificado=true` y muestra “Identidad verificada”. No verifica emisión, autenticidad, vigencia ni correspondencia entre documento y persona. Los datos extraídos pueden editarse.

**Escenario:** un código sintético con formato aceptado produce la misma señal visual que un documento real. No se encontró un privilegio persistente concedido por este estado, lo que limita el impacto observado.

**Recomendación:** describir el resultado como lectura de datos; reservar una afirmación de identidad verificada para un proceso que la respalde. Definir también la experiencia de documentación argentina para el piloto de Formosa.

### SEC-06 — Excepciones no manejadas al escanear datos inesperados

**OWASP:** A10:2025 — Mishandling of Exceptional Conditions.  
**Severidad:** Low.  
**Estado:** pendiente, correspondiente a MVP-12.  
**Archivos y líneas:** `src/utils/CameraScanner.js:27–34`; `src/utils/parseCedula.js:8`, `31–38`, `42–46`, `60–66`.

**Descripción:** el parser asume texto, coincidencias y fragmentos presentes. Operaciones sobre entradas nulas o malformadas pueden lanzar excepciones; el callback del escáner no las captura.

**Escenario:** una lectura inválida provoca una excepción durante la interacción local y puede interrumpir el registro. No se confirmó un ataque remoto sin interacción.

**Recomendación:** validar estructura, longitud y fechas; manejar errores en el callback; permitir reintentar, cerrar o registrar datos manualmente. Conservar los casos de prueba pendientes hasta corregirlos.

### SEC-07 — Política efectiva de contraseñas no verificada

**OWASP:** A07:2025 — Authentication Failures.  
**Severidad histórica:** Medium.  
**Estado:** pendiente de verificación.  
**Archivo y líneas:** `src/screens/RegistrationScreen/RegistrationScreen.js:26–37`, `103–113`.

**Descripción:** la app valida ocho caracteres, letras y números. Este control puede eludirse usando directamente el proveedor de autenticación. No se inspeccionó la política efectiva de Firebase Auth ni se confirmó que acepte contraseñas por debajo del requisito del producto.

**Escenario:** si Auth no impone la política requerida, un cliente alternativo podría registrar credenciales que la interfaz rechaza. Es una condición por verificar, no una configuración débil confirmada.

**Recomendación:** revisar la política del proveedor en un entorno autorizado, establecer los requisitos del producto y alinear la interfaz con la política efectiva. Probar rechazo desde el proveedor además de validación visual.

### SEC-08 — Almacenamiento de sesión dependiente de módulo archivado

**OWASP:** A03:2025 — Software Supply Chain Failures.  
**Severidad:** Low.  
**Estado:** diferido.  
**Archivos y líneas:** `src/services/sessionStorage.js:1–18`; `package.json:29`.

**Descripción:** persiste `react-native-encrypted-storage` 4.0.3. El mantenedor archivó el proyecto en noviembre de 2023. No se identificó un exploit criptográfico actual ni almacenamiento explícito de contraseñas en texto plano. El problema observado es mantenimiento de una dependencia utilizada para tokens de sesión. [Repositorio del mantenedor](https://github.com/emeraldsanto/react-native-encrypted-storage)

**Escenario:** una incompatibilidad o vulnerabilidad futura de la integración nativa requeriría mantenimiento propio o migración, sin soporte activo de este proyecto.

**Recomendación:** planificar migración a una alternativa mantenida, incluyendo adaptación de persistencia Firebase y tratamiento de tokens existentes. Validar reapertura, salida, errores y reinstalación en Android/iOS. La aceptación en dispositivos fue aplazada por el usuario.

## Controles revisados en las funcionalidades nuevas

- Claims `admin:true` proceden del token; campos de perfil no conceden roles. Escritura administrativa se exige en reglas aunque se modifique la interfaz. [Custom claims de Firebase](https://firebase.google.com/docs/auth/admin/custom-claims)
- Catálogo público autenticado sin UID de participantes; reservas y perfiles ajenos no son legibles desde el cliente, incluido el administrador.
- Contador y membresía requieren una modificación atómica coherente. Una reserva aislada, cambio aislado de contador o acceso a otra membresía no cumple las reglas.
- Capacidad no puede quedar debajo del contador. Actividades con reservas no pueden cambiar fecha, ciudad, zona o grupo mediante la rama administrativa.
- Borradores y publicaciones retiradas son privados para administradores. Los publicados históricos siguen legibles por diseño; vigencia es un filtro de producto, no una promesa de confidencialidad.
- Enlaces de aliados se validan como HTTPS, sin credenciales ni caracteres de control; se abren en navegador externo. No se encontró WebView, HTML ejecutable ni una ruta de inyección mediante textos de publicaciones.
- El modo emulador requiere build de desarrollo y proyecto demo; rechaza usarlo en release o con proyecto real.
- Android release carece de fallback debug y exige keystore externo. Esto no verifica por sí solo propiedad o fortaleza del certificado suministrado.
- No se encontraron logs actuales de información personal en `src`, uso de `eval` ni persistencia explícita de contraseñas.

## Avisos npm: conteos separados

| Informe posterior | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Árbol completo | 2 | 67 | 22 | 0 | 91 |
| `omit=dev` | 0 | 23 | 12 | 0 | 35 |

Fuente local: `docs/orchestration/phase2/npm-audit-after.json` y `npm-audit-production-after.json`.

Son entradas de paquetes y cadenas transitivas/metapaquetes, no fallos independientes. `omit=dev` tampoco demuestra inclusión en el runtime móvil: algunas dependencias incluyen ramas para otros entornos. La incorporación de herramientas de emulador modifica el árbol completo y limita la comparación directa con el conteo histórico.

## Límites y siguiente verificación

No se inspeccionaron Firebase real, reglas desplegadas, IAM, política Auth, credenciales privadas, historial Git completo ni certificados de distribución. No hubo pentest, análisis dinámico de red ni comprobación de Keychain/Keystore en dispositivos.

No se recomienda declarar cerrada la seguridad del piloto por compilar o pasar pruebas locales. Antes de activar el piloto deben verificarse permisos efectivos y migración coordinada, identidad de firma, política Auth y excepciones de dependencias. La revisión no detectó un nuevo bypass que requiera modificar las funcionalidades auditadas; los pendientes anteriores conservan sus responsables y alcance.
