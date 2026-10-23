# Diagnóstico nativo de sesión iOS — QA local

## Error identificado

El orquestador capturó con React Native DevTools la excepción real en `src/services/sessionStorage.js`, lectura `EncryptedStorage.getItem('userStatus')` durante `clearLegacySession()` de Splash. Código nativo `-34018`, dominio `com.pacho.ParceAppDev`, mensaje `RNEncryptedStorageError: An error occured while retrieving value`. El primer binario de QA se había construido con `CODE_SIGNING_ALLOWED=NO` y sólo tenía la firma generada por el linker.

Apple identifica este error como `errSecMissingEntitlement`: la llamada a Keychain carece de la autorización requerida. El módulo iOS instalado (`react-native-encrypted-storage`4.0.3) llama `SecItemCopyMatching`; una clave ausente devuelve null (`errSecItemNotFound`) y no ese error. El adaptador ya tolera únicamente `-25300` en limpieza. **No debe tratarse -34018 como clave ausente, desactivar cifrado ni eliminar el control de errores.** No hay evidencia de credenciales inválidas, perfil ausente o rechazo Firestore como causa de esta excepción.

La secuencia de login también ejecuta limpieza de legacy tras Authentication; puede presentar el mismo mensaje genérico al fallar Keychain. La captura confirmada identifica el fallo de Splash; la validación de login debe repetirse tras corregir el binario de QA. Las pruebas Jest que mockean el almacenamiento no demuestran acceso real a Keychain.

## Reconstrucción local aplicada por el orquestador

Reconstrucción simulator Debug, manteniendo configuración demo y firma ad hoc local:

```sh
ENVFILE=.env.emulator.example xcodebuild \
  -workspace ios/ParceApp.xcworkspace \
  -scheme ParceApp -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath .cache/xcode-derived \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES \
  build
```

Ejecutar desde raíz del repositorio. Conservar el ENVFILE de QA verificado por el orquestador si se usa una copia local equivalente: proyecto `demo-parceapp` y emuladores habilitados, sin credenciales de Firebase real. No utilizar esta firma ad hoc para distribución ni dispositivo físico. Para dispositivo/distribución se requiere firma/perfil propios y entitlements efectivos apropiados.

Evidencia: `build-signed-demo.log` termina `BUILD SUCCEEDED`; incluye pasos CodeSign de ejecutable/dylibs/bundle con identidad `Sign to Run Locally`. Inspección readonly del nuevo bundle: `codesign -dv --verbose=2` informa `Signature=adhoc`, identifier `com.pacho.ParceAppDev`. Xcode generó `ParceApp.app-Simulated.xcent` con `application-identifier` correspondiente a equipo+bundle y enlazó las secciones `__TEXT,__entitlements`/`__ents_der`. En simulator estas secciones simuladas importan: que `codesign -d --entitlements -` no muestre entitlements ordinarios no demuestra por sí solo ausencia de los simulados.

No se modificó el proyecto Xcode, el adaptador, Session/Splash/Login ni ninguna fuente de producción para este diagnóstico. No se añadieron diagnósticos temporales ni logs de usuarios, tokens o contraseñas. No se consultó Firebase real. La solicitud readonly al emulador quedó bloqueada por sandbox y luego fue interrumpida; no produjo una respuesta utilizada como evidencia.

## Validación pendiente después del rebuild

Reinstalar el nuevo bundle en el simulador usado por QA y relanzarlo. Comprobar que Splash alcanza login sin -34018; después iniciar sesión con una cuenta sintética, reapertura/persistencia, salida y perfil incompleto. Sólo marcar corregido después de esa prueba nativa; un build exitoso o entitlements generados no bastan. Si persiste -34018, inspeccionar el binario realmente instalado y sus secciones/identificador antes de cambiar fuentes o permisos. Mantener breakpoint de excepción para distinguir Keychain, red o Firestore y no imprimir datos de cuenta/tokens.

## Fuente primaria

[Apple: errSecMissingEntitlement](https://developer.apple.com/documentation/security/errsecmissingentitlement?changes=_8), [Apple DTS: troubleshooting Keychain -34018](https://developer.apple.com/forums/thread/114456).

## Resultado nativo posterior confirmado

El orquestador reinstaló/ejecutó el binario Debug con firma local y comprobó en iOS que Splash alcanza login, el login de la cuenta sintética funciona y Home abre correctamente. La reconstrucción firmada resolvió el fallo Keychain observado; no fue necesario modificar el adaptador ni tolerar -34018. Esto confirma esos pasos concretos, no toda la aceptación de sesión/persistencia ni todos los recorridos.

Durante QA posterior apareció un error distinto al reservar cena: operación transaccional termina con mensaje genérico tras espera. Se investiga por separado con la excepción real del SDK; no debe atribuirse al fallo de firma ya resuelto.

## Segundo defecto: URL incompleta en transacciones Firestore

Excepción exacta capturada por el orquestador en cena: `Error: URL.host is not implemented`, origen React Native `Libraries/Blob/URL.js` y caller Firestore `dist/index.rn.js` RestConnection.Wo (lectura `new URL(rpcUrl).host` antes de BatchGet/Commit). El timeout aparente correspondía a reintentos de transacción; no se relajaron reglas ni cupos.

Corrección puntual: dependencia exacta `react-native-url-polyfill`3.0.0 e import `react-native-url-polyfill/auto` como primer import de `index.js`, antes de App/Firebase. Implementación sólo JavaScript; no requiere cambios nativos ni despliegue. [Instrucción oficial del mantenedor](https://github.com/charpeni/react-native-url-polyfill#installation).

Regresión `__tests__/urlBootstrap.test.js`: instala la URL real incompleta de RN, reproduce getter host que arroja excepción, carga el entrypoint con polyfill real y comprueba que App ya dispone de host al importar; verifica endpoints iOS/Android/emulador y URLSearchParams. No simula éxito reemplazando URL con un mock.

**Verificación nativa del orquestador:** tras reload completo, la sesión restauró Home y la reserva de cena Cali produjo confirmación correcta. QA de agenda/cancelación continúa por separado. No ejecutar pruebas de reglas que limpien el emulador mientras se usa para este QA manual.

Validación automatizada posterior al fix: suite completa Jest **26 suites, 326 pasan, 0 fallan, 4 omitidos (330 total)**; lint completo **0 errores, 39 advertencias**; `git diff --check` pasa. Evidencia `url-fix-jest.log` y `url-fix-lint.log` en este directorio. No se ejecutó el comando de reglas/emulador durante QA manual activo.
