# ParceApp

Aplicación React Native para crear un perfil y reservar cenas y eventos. El backlog del MVP está en [docs/MVP_BACKLOG.md](docs/MVP_BACKLOG.md).

## Entorno

- Node.js 20 y npm; instalar dependencias con `npm ci` desde este directorio.
- Android: JDK 17, Android Studio, SDK Android 35 y un emulador o dispositivo con depuración USB. Configurar `ANDROID_HOME` o un `android/local.properties` local con `sdk.dir`.
- iOS: macOS, Xcode, herramientas de línea de comandos y CocoaPods. Instalar pods con `cd ios && pod install` después de instalar dependencias JS. Los módulos nativos requieren una compilación nueva después de actualizar dependencias.

## Firebase

Copiar `.env.example` a `.env` y completar la configuración del proyecto Firebase de desarrollo. No versionar `.env`. Habilitar Authentication con correo/contraseña y Firestore. `src/firebase/config.js` lee los valores mediante `react-native-config`; reiniciar y recompilar la app después de cambiarlos.

El perfil se guarda en `users/{uid}` y Authentication es la fuente de sesión. La persistencia usa almacenamiento nativo cifrado. No migrar documentos antiguos automáticamente. Las reglas e índices del entorno deben revisarse antes de probar con datos reales; el repositorio todavía no contiene la política final del MVP.

## Ejecutar

Desde la raíz, abrir una terminal con `npm start`. En otra terminal ejecutar `npm run android` o `npm run ios`. Seleccionar un simulador/dispositivo disponible. Para iOS también puede abrirse `ios/ParceApp.xcworkspace` en Xcode. Android release todavía requiere configuración de firma propia antes de distribuir.

## Validar

- `npm run lint` usa la configuración React Native compatible con ESLint 8.
- `npm test -- --runInBand --watchman=false` ejecuta Jest y los mocks focalizados de módulos nativos.
- Para generar bundles independientes: `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/build/index.android.bundle --assets-dest android/build/assets` (repetir con `ios`, usando un directorio de salida existente).

Las pruebas con mocks y el bundle comprueban JavaScript, no prueban cámara, Keychain/Keystore ni navegación en dispositivos. Validar manualmente en ambas plataformas: registro, sesión restaurada, cuestionario, home, cenas, eventos, agenda, perfil y salida. MVP-04 ya unifica actividades y reservas en `activities`, con membresía por UID. La operación de cenas y eventos y las mejoras de experiencia de reservas se completan en MVP-05 a MVP-07.

### Compatibilidad Xcode y fmt

El `post_install` de `ios/Podfile` compila únicamente el pod `fmt` 11.0.2 con C++17: su detección de `consteval` bajo Apple Clang de Xcode 26.6 provoca un error de expresión constante al compilar `format.cc`. El propio `fmt/base.h` proporciona una rama C++17 sin `consteval`; React Native y Folly conservan C++20. Se aplica con `pod install --project-directory=ios --no-repo-update`, sin modificar fuentes de Pods. Revisar este ajuste al actualizar React Native/fmt/Xcode.

Validación de compilación del 9 de octubre de 2026: pasan los bundles JavaScript Android/iOS, la compilación Debug del simulador iOS (arm64/x86_64) y Android Debug (arm64-v8a). Android resolvió las dependencias que inicialmente faltaban en caché y terminó con `BUILD SUCCESSFUL` en 11 min 5 s, con 391 tareas. Comando utilizado desde `android/`:

```bash
./gradlew --no-daemon --gradle-user-home ../.cache/gradle --max-workers=2 -PreactNativeArchitectures=arm64-v8a -Dorg.gradle.internal.http.connectionTimeout=15000 -Dorg.gradle.internal.http.socketTimeout=15000 assembleDebug --info
```

Evidencia en `docs/orchestration/build-android-final.log` y `docs/orchestration/build-ios-fmt17-retry.log`. Estas compilaciones no comprueban apertura de pantallas, cámara ni persistencia cifrada en dispositivos; esas validaciones manuales siguen pendientes.

## Seguridad, firma y pruebas locales

Android release exige una firma propia mediante variables de entorno; ver [docs/SIGNING.md](docs/SIGNING.md). No utiliza la clave debug para distribuir. La evaluación de dependencias y avisos restantes está en [docs/DEPENDENCY_REMEDIATION.md](docs/DEPENDENCY_REMEDIATION.md); no se afirma cero vulnerabilidades.

Para probar reglas sin Firebase real: Node 20, JDK17 y `npm run test:rules` (proyecto ficticio `demo-parceapp`). No ejecutar deploy para estas pruebas. El emulador de Firestore escucha en 8080; Auth local para futuras pruebas nativas en 9099. Los binarios descargados del emulador y logs deben ubicarse en `.cache` o `docs/orchestration/phase2`, dentro del proyecto.

Modo de app local: copiar `.env.emulator.example` a un archivo de entorno de desarrollo privado, seleccionar ese archivo con `ENVFILE` al recompilar y reiniciar la app. Usar únicamente build Debug; la configuración rechaza una combinación demo/flag incorrecta o cambio de proyecto sin reinicio. Android Emulator conecta a `10.0.2.2`; iOS Simulator a `127.0.0.1`. No requiere claves reales. La app no redirige Firebase de producción silenciosamente. La aceptación en dispositivos está aplazada por petición del usuario.

La vitrina de museos, cafés, teatros y otros aliados se opera desde la sección administrativa de publicaciones. Modelo, vigencia, ciudades y pruebas locales en [docs/PARTNER_PLANS.md](docs/PARTNER_PLANS.md). Crear eventos y administrar publicaciones requiere el claim firmado admin; las reglas locales deben validarse y desplegarse por un operador antes del piloto.
