# Modelo canónico v2 — catálogo y reservas privadas

El esquema MVP-04 v1 (`activities` con participantIds) se reemplaza para resolver SEC-01/02. Colección pública autenticada **activityCatalog**, schemaVersion2. Sin identidades personales. Reservas fuente única privada en `users/{uid}/reservations/{activityId}`, un documento por usuario/actividad. participantCount agregado en catálogo se mantiene atómicamente por reglas, nunca se duplica una lista de UID pública.

Esquema, límites, autorización y firmas de servicios completos en [AUTHORIZATION.md](AUTHORIZATION.md). Ciudades confirmadas Cali (`cali`, America/Bogota) y Formosa (`formosa`, America/Argentina/Cordoba); fechas completas Timestamp UTC y representación en ciudad, no zona del dispositivo. Redux usa ISO, IDs de Authentication en state.user.id, no Timestamp.

Creación eventos **solo administradores**. Creador admin obtiene reserva propia en misma transacción (una vez). ID determinista normalización título+ISO+dirección, máximo1400caracteres. Cenas programadas por administración, ID recomendado `dinner_YYYY-MM-DD_city_group`; no autogeneración de actividades al reservar. groupId y ciudad obligatorios cena, restaurante/dirección pueden pending. Detalles de operación en AUTHORIZATION; UI sin ciudad invisible por defecto.

Reserva transacción lee catálogo y membresía, añade documento privado y contador+1. Cancelación futura elimina membresía y contador-1; conservar pasadas. Admin cancelando actividad conserva reservas y muestra estado; usuario puede cancelar su reserva futura en actividad cancelada. Edición con miembros mantiene fecha/ciudad/grupo; jamás cupo<ocupación. No eliminación catálogo desde cliente. Concurrencia respaldada getAfter y document locks; pruebas emulador independientes requeridas.

Agenda escucha colección privada propia y carga catálogo; relectura al reabrir/foco muestra datos actuales del operador. Feedeventos no lee UID. Consulta por kind sin índice compuesto. Aliados independientes `partnerPlans`, esquema1 y feed status+publishFrom con índice compuesto; no reservas internas, enlace externo. Borradores privados admin.

**No migración/despliegue real realizados.** Actividades v1/legacy negadas por reglas nuevas para evitar fugas. Coordinar carga/migración controlada antes de activar reglas/app en piloto.
