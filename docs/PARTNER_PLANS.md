# Vitrina y operación de aliados — MVP-08/09

## Experiencia

Home muestra hasta dos planes vigentes y permite abrir “Explorar planes”. La lista completa ofrece Todas/Cali/Formosa, ordena por inicio y no consulta gustos ni respuestas del perfil. La etiqueta “Patrocinado” aparece si sponsored=true, tanto en tarjeta como detalle. Ciudad, categoría, aliado, fecha local y dirección son visibles. Un plan en curso permanece hasta endsAt; se excluyen borradores, retirados, aún no publicados y publicaciones/actividades vencidas. Inicio/fin son instantes UTC; se muestran Cali UTC-05 y Formosa UTC-03 según PILOT_CITIES.

Detalle escucha cambios del documento: al retirar/eliminar/denegar lectura, se oculta el contenido y no se permite abrir su enlace. El botón valida nuevamente vigencia y URL antes de abrir el navegador del aliado; compra/inscripción no ocurre en ParceApp. Imágenes fallidas muestran un reemplazo neutro. Carga, lista vacía, errores y reintento están implementados; watchdog de carga20 segundos evita indicador permanente.

## Contrato

Colección `partnerPlans` schemaVersion1, campos exactos definidos en `docs/AUTHORIZATION.md`: ally,title,description,address,imageUrl,category,city,startsAt,endsAt,publishFrom,publishUntil,externalUrl,sponsored,status,createdAt,updatedAt. Fechas Firestore Timestamp; servicios entregan ISO serializable. Categorías: museum,cafe,theatre,restaurant,bar,other. Ciudades IDs cali/formosa. Status draft/published/withdrawn. endsAt>startsAt; publishUntil>publishFrom. URLs HTTPS de host válido sin credenciales, controles, espacios ni barras inversas; puertos1–65535. imageUrl null admite publicación sin imagen. Cliente construye payload por whitelist, no copia campos desconocidos.

Modelo/validación: `src/models/partnerPlan.js`. Sus métodos validatePlanInput y planFromSnapshot validan esquema/fechas/URLs, safeHttpsUrl valida enlaces, isPlanVisible/visiblePlans filtran y planDate muestra hora local. Servicios `src/services/partnerPlans.js`: watchPublishedPlans(uid,reference,onData,onError), watchPartnerPlan(uid,id,...), watchAdminPlans(uid,...), savePartnerPlan(uid,id,input), isPlanAdministrator(uid).

## Administración concreta

Solo usuario con claim firmado `admin:true` ve “Administrar publicaciones” en Home. No existe registro de admin desde la app ni un campo de perfil que otorgue ese permiso. El operador autorizado asigna claims en un entorno confiable conforme a `docs/AUTHORIZATION.md` y [documentación oficial](https://firebase.google.com/docs/auth/admin/custom-claims); renovar sesión/token tras cambios. No se asignó ningún rol real ni se contactó Firebase de producción en esta entrega.

1. Abrir Administrar publicaciones → Nueva publicación.
2. Seleccionar ciudad y categoría. Completar aliado, título, descripción, dirección y enlace HTTPS; imagen opcional.
3. Completar inicio/fin y vigencia de publicación en formato `AAAA-MM-DD HH:mm`, **hora local de la ciudad elegida**. Cambiar ciudad implica revisar esas fechas antes de guardar.
4. Marcar Patrocinado cuando corresponda. Guardar borrador conserva contenido privado a administradores.
5. Abrir el borrador y Publicar. Si publishFrom<=ahora<publishUntil y endsAt>ahora, aparecerá en feed después de sincronizar. Revisar texto/imagen/enlace antes de publicar.
6. Editar modifica contenido conservando createdAt; updatedAt lo establece el servidor. Retirar establece withdrawn, oculta el plan en feed y bloquea su lectura a usuarios comunes por reglas. No se borra historia automáticamente. Un operador IAM que use Console omite reglas: validar cargas manuales contra el mismo contrato.
7. Reabrir como usuario común y comprobar que no hay entrada de edición. Comprobar que un borrador o retirado no puede leerse ni escribirse directamente con ese usuario en emulador.

La pantalla administrativa utiliza Firebase SDK cliente: permisos locales del botón no sustituyen las reglas. `savePartnerPlan` comprueba UID antes/después de operaciones asíncronas y adminclaim antes de escribir; la política del servidor es la autoridad. Revocación de claims requiere renovar el token; las reglas no están desplegadas en esta fase.

## Procedimiento de prueba local sin producción

Ejecutar Emulator Suite con `--project demo-parceapp`, reglas versionadas y pruebas `npm run test:rules`. La suite puede usar contextos autenticados con claim admin y UID comunes; eso no crea roles de producción. Para pruebas manuales futuras, buildDebug con `.env.emulator.example`, Auth9099/Firestore8080 y usuarios exclusivamente locales. Los viajes nativos están aplazados por solicitud del usuario.

Fixture sugerido, sin identidad comercial real: aliado “Aliado de prueba”, título “Actividad de prueba”, ciudad Cali, categoría museum, dirección “Dirección de prueba”, imagen null, enlace `https://example.com/actividad`, sponsored true. Generar instantes en relación al reloj de prueba: startsAt=ahora+1h, endsAt=ahora+2h, publishFrom=ahora-1min y publishUntil=ahora+3h. Publicar/retirar deben pasar por un contexto admin autorizado y la validación SDK; no importar un fixture con Timestamp/string mezclados a datos reales.

Comprobar: borrador no visible → publicar aparece → detalle/enlace válidos → vencimiento desaparece → retirar oculta detalle abierto → usuario común no puede editar → imagen fallida no bloquea → error permite reintentar. Con Formosa, hora19:00 corresponde UTC22:00; Cali19:00 corresponde UTC00:00 del día siguiente. No confundir ambos offsets.

## Sincronización y costo del piloto

La lista consulta status==published y publishFrom<=referencia. Reconsulta cada30 segundos para nuevas publicaciones programadas; reloj local cada1 segundo oculta vencimientos y al volver foreground comprueba estado actual. La escucha actualiza retiradas inmediatamente cuando hay conexión. No se recorta la consulta antes de filtrar vencidos, para evitar ocultar planes vigentes detrás de entradas viejas; solo Home muestra las dos primeras después del filtrado.

Esto favorece un piloto pequeño, no un catálogo masivo: cada renovación puede releer publicados históricos. El operador debe retirar publicaciones terminadas tras revisión y mantener un volumen acotado; revisar métricas/cuotas y optimizar consulta/paginación antes de escalar. Dispositivo sin conexión puede conservar caché publicada; el estado remoto solo se confirma al recuperar red. Caducidad de producto no vuelve secreto un documento published; conforme al contrato, publicado vencido puede seguir legible por ID aunque la interfaz lo oculte.

No se publicaron anuncios, migraron datos ni desplegaron reglas en Firebase real. Permisos efectivos desplegados y aceptación nativa permanecen pendientes de esas acciones externas.
