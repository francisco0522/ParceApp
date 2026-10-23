# Firma de distribución

SEC-03: Android release ya no utiliza la firma debug. Las tareas release fallan si falta la configuración, el archivo no existe, la ruta no es absoluta, el keystore reside dentro del repositorio o el alias es el conocido `androiddebugkey`. Debug conserva su firma de desarrollo.

Configurar en un gestor de secretos o en el entorno local/CI, sin escribir valores en logs ni argumentos de comandos:

- `PARCEAPP_RELEASE_STORE_FILE`: ruta absoluta a un keystore propio **fuera del repositorio**.
- `PARCEAPP_RELEASE_STORE_PASSWORD`: contraseña del keystore.
- `PARCEAPP_RELEASE_KEY_ALIAS`: alias de la clave de carga/distribución.
- `PARCEAPP_RELEASE_KEY_PASSWORD`: contraseña de la clave.

No se generó ninguna clave en esta entrega ni se distribuyó un binario. La persona responsable debe configurar la identidad de firma y custodiar respaldo/recuperación, usando Play App Signing cuando corresponda. Un keystore externo no prueba por sí mismo que la clave sea segura: revisar certificado y propiedad antes de distribuir. La clave debug sigue siendo exclusivamente de desarrollo.

Desde `android/`, ejecutar `./gradlew bundleRelease` con el entorno configurado para generar el AAB, y verificar la identidad del certificado en el proceso de distribución. No pasar contraseñas mediante `-P` ni versionar archivos con secretos. No copiar keystores al directorio de la app; `.gitignore` no sustituye almacenamiento seguro. Sin las cuatro variables, `./gradlew assembleRelease --dry-run` debe fallar antes de ejecutar tareas y explicar la configuración faltante. Ningún fallback firma release con debug.

En iOS no se configuró un equipo/certificado de distribución: Xcode/CI debe usar el equipo autorizado y perfiles correctos antes de archivar para distribuir. La compilación de simulador `CODE_SIGNING_ALLOWED=NO` demuestra compilación, no firma de producción.

Fuentes oficiales: [Android app signing](https://developer.android.com/studio/publish/app-signing) y [React Native signed APK](https://reactnative.dev/docs/signed-apk-android). Las contraseñas y claves privadas deben permanecer controladas por el propietario, nunca por el repositorio.
