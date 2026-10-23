import {PILOT_CITIES, isoDate} from './activity';

export const PLAN_CATEGORIES = {
  museum: 'Museo',
  cafe: 'Café',
  theatre: 'Teatro',
  restaurant: 'Restaurante',
  bar: 'Bar',
  other: 'Otro',
};
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const statuses = ['draft', 'published', 'withdrawn'];
function text(value, maximum, required = true) {
  if (
    typeof value !== 'string' ||
    value.length > maximum ||
    (required && !value.trim())
  ) {
    throw new Error('INVALID_PLAN');
  }
  return value.trim();
}
export function safeHttpsUrl(value) {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    /[\s\u0000-\u001f\u007f\\]/.test(value)
  ) {
    return false;
  }
  const match = /^https:\/\/([^/?#]+)(?:[/?#][^\s]*)?$/i.exec(value);
  if (!match || match[1].includes('@')) {
    return false;
  }
  const authority = /^([^:]+)(?::([0-9]{1,5}))?$/.exec(match[1]);
  if (
    !authority ||
    (authority[2] && (Number(authority[2]) < 1 || Number(authority[2]) > 65535))
  ) {
    return false;
  }
  const host = authority[1];
  return (
    host.length <= 253 &&
    host
      .split('.')
      .every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  );
}
export function validatePlanInput(input) {
  if (
    !input ||
    !owns(PILOT_CITIES, input.city) ||
    !owns(PLAN_CATEGORIES, input.category) ||
    !statuses.includes(input.status) ||
    typeof input.sponsored !== 'boolean'
  ) {
    throw new Error('INVALID_PLAN');
  }
  if (
    !safeHttpsUrl(input.externalUrl) ||
    (input.imageUrl !== null && !safeHttpsUrl(input.imageUrl))
  ) {
    throw new Error('INVALID_PLAN_URL');
  }
  const dates = {};
  for (const field of ['startsAt', 'endsAt', 'publishFrom', 'publishUntil']) {
    dates[field] = isoDate(input[field]);
  }
  if (
    dates.endsAt <= dates.startsAt ||
    dates.publishUntil <= dates.publishFrom
  ) {
    throw new Error('INVALID_PLAN_DATES');
  }
  return {
    schemaVersion: 1,
    ally: text(input.ally, 160),
    title: text(input.title, 160),
    description: text(input.description, 4000, false),
    address: text(input.address, 500),
    imageUrl: input.imageUrl,
    externalUrl: input.externalUrl,
    category: input.category,
    city: input.city,
    sponsored: input.sponsored,
    status: input.status,
    ...dates,
  };
}
export function planFromSnapshot(snapshot) {
  const data = snapshot.data();
  if (data.schemaVersion !== 1) {
    throw new Error('INVALID_PLAN');
  }
  return {
    ...validatePlanInput(data),
    id: snapshot.id,
    createdAt: isoDate(data.createdAt),
    updatedAt: isoDate(data.updatedAt),
  };
}
export function isPlanVisible(plan, now = Date.now()) {
  return (
    plan?.status === 'published' &&
    new Date(plan.publishFrom).getTime() <= now &&
    new Date(plan.publishUntil).getTime() > now &&
    new Date(plan.endsAt).getTime() > now
  );
}
export function visiblePlans(plans, city, now = Date.now()) {
  return plans
    .filter(plan => isPlanVisible(plan, now) && (!city || plan.city === city))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
export function planDate(plan, field = 'startsAt') {
  const zone = PILOT_CITIES[plan.city];
  const offset = Number(zone.offset.slice(0, 3)) * 60;
  const date = new Date(new Date(plan[field]).getTime() + offset * 60000);
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} (UTC${zone.offset})`;
}
export function planError(error) {
  return (
    {
      UNAUTHENTICATED: 'La sesión cambió. Vuelve a iniciar sesión.',
      ADMIN_REQUIRED: 'Solo administradores pueden administrar publicaciones.',
      INVALID_PLAN: 'Revisa los campos, ciudad, categoría y estado.',
      INVALID_PLAN_URL: 'Usa enlaces HTTPS sin espacios ni credenciales.',
      INVALID_DATE: 'Revisa las fechas.',
      INVALID_PLAN_DATES:
        'Las fechas de fin deben ser posteriores a las de inicio.',
      PLAN_NOT_FOUND: 'La publicación ya no está disponible.',
    }[error?.message] ||
    'No pudimos cargar o guardar la publicación. Revisa tu conexión y reintenta.'
  );
}
