# QA nativo de iOS — piloto MVP

Validación realizada el 9 de octubre de 2026 en iPhone 17 Pro simulado, iOS 26.5. Firebase Authentication y Firestore locales, proyecto `demo-parceapp`, cuentas y actividades sintéticas. No se desplegaron reglas ni se modificaron datos de producción.

## Resultados comprobados en la interfaz

| Recorrido | Resultado |
| --- | --- |
| Inicio y login de usuario y administrador | Correcto después de reconstruir con firma local para Keychain. |
| Restauración de sesión | Home recuperado tras recarga completa y tras reabrir simulador/proceso el 10 de octubre sin introducir credenciales. |
| Cierre de sesión | Regresa a login. |
| Perfil | Lectura, edición, varios idiomas y respuesta final «No» guardados. |
| Cena Cali | Confirmación, contador 0/6 → 1/6 y aparición en agenda. |
| Cancelación de cena | Confirmación, contador 1/6 → 0/6 y eliminación de la reserva de agenda. |
| Agenda | Próximas, actividad cancelada y actividad finalizada diferenciadas; finalizada sin botón de cancelación. |
| Eventos | Catálogo con cupos agotados deshabilitados; administrador creó evento de Formosa para 10/10/2026 13:38 UTC-03:00 con capacidad 2 y reserva inicial 1/2. |
| Planes de aliados | Feed de tres publicaciones vigentes; borrador, retirado y vencido excluidos. Filtro Formosa y detalle con horario UTC-03:00 correctos. |
| Publicación administrativa | Borrador publicado, visible en Home; después retirado y ausente de Home. |
| Acceso administrativo | Gestión de publicaciones presente para administrador y ausente en Home de usuario normal. |

## Defectos encontrados y corregidos

1. Keychain devolvía `-34018` en el binario de QA construido con firma desactivada. Reconstruir con firma local solucionó Splash y login; no se modificó el almacenamiento cifrado.
2. Las transacciones Firestore fallaban con `URL.host is not implemented`. Se cargó `react-native-url-polyfill/auto` antes de App; reserva y cancelación quedaron comprobadas en el simulador. Se añadió prueba de regresión con la URL real de React Native.

[Diagnóstico y receta reproducible](orchestration/ios-qa/native-session-diagnosis.md).

## Verificación automatizada posterior

Jest: 26 suites, 330 pruebas: 326 correctas, 0 fallidas, 4 omitidas. Lint: 0 errores, 39 advertencias. Las 61 pruebas de reglas habían pasado en la validación previa; no se volvieron a ejecutar durante QA manual porque limpian los datos del emulador.

## Pendiente de aceptación

Dispositivo Android y dispositivos físicos iOS; cámara/escáner; registro nuevo y perfil inicialmente incompleto; validación del enlace externo; creación de una publicación nueva y expiración mientras la app está abierta. No se consideran aprobados por esta prueba. Producción aún requiere roles, migración y despliegue controlado según los documentos del proyecto.

No se implementaron MVP adicionales durante esta validación. El PR debe conservar estos límites y los hallazgos de seguridad pendientes.
