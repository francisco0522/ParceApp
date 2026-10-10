export const PILOT_CITIES = {
  cali: {name: 'Cali', timeZone: 'America/Bogota', offset: '-05:00'},
  formosa: {
    name: 'Formosa',
    timeZone: 'America/Argentina/Cordoba',
    offset: '-03:00',
  },
};
export const ACTIVITY_TIME_ZONE = PILOT_CITIES.cali.timeZone;

export function isoDate(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (!value || !Number.isFinite(date.getTime())) {
    throw new Error('INVALID_DATE');
  }
  return date.toISOString();
}

export function activityFromSnapshot(snapshot) {
  const data = snapshot.data();
  if (
    data.schemaVersion !== 2 ||
    !Object.keys(PILOT_CITIES).includes(data.city) ||
    data.timeZone !== PILOT_CITIES[data.city].timeZone ||
    typeof data.title !== 'string' ||
    !data.title.trim() ||
    !['dinner', 'event'].includes(data.kind) ||
    !['open', 'cancelled', 'completed'].includes(data.status) ||
    !Number.isInteger(data.participantCount) ||
    data.participantCount < 0 ||
    'participantIds' in data ||
    'createdBy' in data ||
    (data.capacity !== null &&
      (!Number.isInteger(data.capacity) ||
        data.capacity < 1 ||
        data.participantCount > data.capacity))
  ) {
    throw new Error('INVALID_ACTIVITY');
  }
  return {
    ...data,
    id: snapshot.id,
    startsAt: isoDate(data.startsAt),
    createdAt: isoDate(data.createdAt),
  };
}

// DatePicker values represent the selected calendar date and wall-clock time.
// Pilot wall-clock offsets: Cali UTC-05 and Formosa UTC-03.
export function selectedStartsAt(date, hour, city = 'cali') {
  if (!Object.keys(PILOT_CITIES).includes(city)) {
    throw new Error('INVALID_CITY');
  }
  const pad = value => String(value).padStart(2, '0');
  const calendar = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return isoDate(
    `${calendar}T${pad(hour.getHours())}:${pad(hour.getMinutes())}:00${PILOT_CITIES[city].offset}`,
  );
}

export function formatActivityDate(activity) {
  const city = PILOT_CITIES[activity.city];
  if (!city) {
    return 'Ciudad sin configurar';
  }
  const offsetMinutes = Number(city.offset.slice(0, 3)) * 60;
  const date = new Date(
    new Date(activity.startsAt).getTime() + offsetMinutes * 60000,
  );
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} (UTC${city.offset})`;
}
export function activityError(error) {
  const messages = {
    ACTIVITY_TIMEOUT:
      'La carga tardó demasiado. Revisa la conexión y reintenta.',
    UNAUTHENTICATED: 'La sesión cambió. Vuelve a iniciar sesión.',
    ADMIN_REQUIRED: 'Solo los administradores pueden crear actividades.',
    INVALID_CITY: 'Selecciona Cali o Formosa.',
    INVALID_DATE: 'Revisa la fecha y hora.',
    INVALID_ACTIVITY: 'Revisa título, ciudad, dirección, cupos y fecha futura.',
    DUPLICATE: 'Ya existe ese evento con igual título, fecha y dirección.',
    EVENT_NOT_FOUND: 'La actividad no está disponible. Actualiza la lista.',
    ACTIVITY_CLOSED: 'La actividad ya no admite esta operación.',
    ALREADY_REGISTERED: 'Ya tienes una reserva en esta actividad.',
    NOT_REGISTERED: 'No tienes una reserva en esta actividad.',
    EVENT_FULL: 'La actividad ya no tiene cupos.',
  };
  return (
    messages[error.message] ||
    'No pudimos completar la operación. Revisa tu conexión y reintenta.'
  );
}
