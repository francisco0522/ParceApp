/* eslint-env node */
// Synthetic emulator QA only. No Firebase production SDK/config/credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PROJECT = 'demo-parceapp';
const PASSWORD = 'ParceQa2026!';
const ACCOUNTS = [
  {
    uid: 'qa-ios-admin',
    email: 'qa.ios.admin@example.test',
    name: 'QA iOS Admin',
    admin: true,
    complete: true,
  },
  {
    uid: 'qa-ios-user',
    email: 'qa.ios.user@example.test',
    name: 'QA iOS Usuario',
    admin: false,
    complete: true,
  },
  {
    uid: 'qa-ios-incomplete',
    email: 'qa.ios.incomplete@example.test',
    name: 'QA iOS Incompleto',
    admin: false,
    complete: false,
  },
  {
    uid: 'qa-ios-seat',
    email: 'qa.ios.seat@example.test',
    name: 'QA iOS Cupo',
    admin: false,
    complete: true,
  },
];
function endpoints() {
  assert.ok(
    Number(process.versions.node.split('.')[0]) >= 20,
    'Node 20+ required',
  );
  assert.match(
    process.env.FIREBASE_AUTH_EMULATOR_HOST || '',
    /^(127\.0\.0\.1|localhost):9099$/,
    'Auth emulator loopback:9099 required',
  );
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST || '',
    /^(127\.0\.0\.1|localhost):8080$/,
    'Firestore emulator loopback:8080 required',
  );
  for (const name of [
    'GCLOUD_PROJECT',
    'GOOGLE_CLOUD_PROJECT',
    'FIREBASE_PROJECT_ID',
  ])
    if (process.env[name])
      assert.equal(process.env[name], PROJECT, `${name} must be demo-parceapp`);
  return {
    auth: `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`,
    firestore: `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT}/databases/(default)`,
  };
}
async function request(base, suffix, body, method = 'POST') {
  const url = new URL(base + suffix);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(url.hostname),
    'Network target must remain loopback',
  );
  assert.ok(
    ['8080', '9099'].includes(url.port),
    'Only QA emulator ports permitted',
  );
  assert.ok(
    url.pathname.includes(`/projects/${PROJECT}/`) ||
      url.pathname.endsWith(`/projects/${PROJECT}`),
    'Demo project required',
  );
  const response = await fetch(url, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: 'Bearer owner',
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      `${method} ${url.pathname}: ${response.status} ${value.error?.message || 'request failed'}`,
    );
    error.status = response.status;
    throw error;
  }
  return value;
}
function toValue(value) {
  if (value === null) return {nullValue: null};
  if (value instanceof Date) return {timestampValue: value.toISOString()};
  if (typeof value === 'boolean') return {booleanValue: value};
  if (typeof value === 'number')
    return Number.isInteger(value)
      ? {integerValue: String(value)}
      : {doubleValue: value};
  if (typeof value === 'string') return {stringValue: value};
  if (Array.isArray(value)) return {arrayValue: {values: value.map(toValue)}};
  if (value && typeof value === 'object')
    return {mapValue: {fields: fields(value)}};
  throw new Error('Unsupported QA fixture value');
}
const fields = data =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, toValue(value)]),
  );
function fromValue(value) {
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value)
    return (value.arrayValue.values || []).map(fromValue);
  if ('mapValue' in value)
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, item]) => [
        key,
        fromValue(item),
      ]),
    );
  throw new Error('Unknown Firestore fixture value');
}
async function getDocument(base, id) {
  try {
    const result = await request(base, `/documents/${id}`, undefined, 'GET');
    return Object.fromEntries(
      Object.entries(result.fields || {}).map(([key, value]) => [
        key,
        fromValue(value),
      ]),
    );
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}
function fixtureSet(now = new Date()) {
  const day = delta =>
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + delta,
      ),
    )
      .toISOString()
      .slice(0, 10);
  const wall = (delta, hour, city) =>
    new Date(
      `${day(delta)}T${hour}:00${city === 'formosa' ? '-03:00' : '-05:00'}`,
    );
  const createdAt = new Date(now.getTime() - 3600000);
  const activity = (title, city, startsAt, overrides = {}) => ({
    schemaVersion: 2,
    kind: 'event',
    title,
    city,
    timeZone:
      city === 'formosa' ? 'America/Argentina/Cordoba' : 'America/Bogota',
    startsAt,
    createdAt,
    capacity: 6,
    participantCount: 0,
    status: 'open',
    direction: 'Dirección sintética QA',
    description:
      'Datos ficticios locales para validar iOS. No es una actividad real.',
    groupId: null,
    venueName: 'Lugar QA ficticio',
    assignmentStatus: 'assigned',
    ...overrides,
  });
  const dinnerCali = `dinner_${day(3)}_cali_qa-ios-cali`;
  const dinnerFormosa = `dinner_${day(3)}_formosa_qa-ios-formosa`;
  const activities = {
    [dinnerCali]: activity(
      'QA Cena Cali 19:00',
      'cali',
      wall(3, '19:00', 'cali'),
      {
        kind: 'dinner',
        groupId: 'qa-ios-cali',
        direction: null,
        venueName: null,
        assignmentStatus: 'pending',
      },
    ),
    [dinnerFormosa]: activity(
      'QA Cena Formosa 19:00',
      'formosa',
      wall(3, '19:00', 'formosa'),
      {kind: 'dinner', groupId: 'qa-ios-formosa'},
    ),
    'qa-ios-event-open': activity(
      'QA Museo Cali disponible',
      'cali',
      wall(2, '18:00', 'cali'),
      {capacity: 2},
    ),
    'qa-ios-event-formosa': activity(
      'QA Teatro Formosa disponible',
      'formosa',
      wall(2, '18:00', 'formosa'),
      {capacity: null},
    ),
    'qa-ios-event-full': activity(
      'QA Café Cali sin cupos',
      'cali',
      wall(2, '17:00', 'cali'),
      {capacity: 1, participantCount: 1},
    ),
    'qa-ios-event-reserved': activity(
      'QA Evento para cancelar',
      'cali',
      wall(4, '18:00', 'cali'),
      {capacity: 2, participantCount: 1},
    ),
    'qa-ios-event-cancelled': activity(
      'QA Actividad cancelada',
      'cali',
      wall(4, '20:00', 'cali'),
      {status: 'cancelled', participantCount: 1},
    ),
    'qa-ios-event-past': activity(
      'QA Evento historial',
      'cali',
      wall(-2, '18:00', 'cali'),
      {status: 'completed', participantCount: 1},
    ),
  };
  const plan = (title, city, status = 'published', overrides = {}) => ({
    schemaVersion: 1,
    ally: 'Aliado QA ficticio',
    title,
    description: 'Publicación sintética. Compra externa sólo de demostración.',
    imageUrl: null,
    category: 'museum',
    city,
    address: 'Dirección QA ficticia',
    startsAt: wall(2, '10:00', city),
    endsAt: wall(2, '20:00', city),
    publishFrom: new Date(now.getTime() - 86400000),
    publishUntil: wall(3, '23:00', city),
    externalUrl: 'https://example.com/',
    sponsored: true,
    status,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });
  const plans = {
    'qa-ios-plan-cali': plan('QA Museo Cali patrocinado', 'cali'),
    'qa-ios-plan-formosa': plan(
      'QA Teatro Formosa patrocinado',
      'formosa',
      'published',
      {
        category: 'theatre',
        startsAt: wall(2, '11:00', 'formosa'),
        endsAt: wall(2, '21:00', 'formosa'),
      },
    ),
    'qa-ios-plan-image-fallback': plan(
      'QA Café imagen fallida',
      'cali',
      'published',
      {
        category: 'cafe',
        imageUrl: 'https://example.invalid/qa-ios-image.png',
        sponsored: false,
        startsAt: wall(2, '12:00', 'cali'),
      },
    ),
    'qa-ios-plan-draft': plan('QA Borrador privado', 'cali', 'draft'),
    'qa-ios-plan-withdrawn': plan('QA Retirado privado', 'cali', 'withdrawn'),
    'qa-ios-plan-expired': plan('QA Publicación vencida', 'cali', 'published', {
      publishFrom: wall(-4, '10:00', 'cali'),
      publishUntil: wall(-1, '23:00', 'cali'),
      startsAt: wall(-2, '10:00', 'cali'),
      endsAt: wall(-2, '20:00', 'cali'),
    }),
  };
  const questions = {
    'qa-ios-01-food': {
      key: 'foodType',
      question: '¿Qué alimentación prefieres? (QA)',
      type: 'single',
      required: true,
      order: 1,
      options: [
        {label: 'Omnívora', value: 'omnivora'},
        {label: 'Vegetariana', value: 'vegetariana'},
      ],
    },
    'qa-ios-02-languages': {
      key: 'preferredLanguage',
      question: '¿Qué idiomas prefieres? (QA)',
      type: 'multi',
      required: true,
      order: 2,
      maxSelections: 2,
      options: [
        {label: 'Español', value: 'Español'},
        {label: 'Inglés', value: 'Inglés'},
        {label: 'Portugués', value: 'Portugués'},
      ],
    },
    'qa-ios-03-social': {
      key: 'comfortableMixedGroup',
      question: '¿Te sientes cómodo en grupos mixtos? (QA)',
      type: 'boolean',
      required: true,
      order: 3,
    },
  };
  const documents = {};
  for (const account of ACCOUNTS)
    documents[`users/${account.uid}`] = {
      fullName: account.name,
      emailText: account.email,
      birthDate: '1990-01-02T12:00:00.000Z',
      createdAt: createdAt.toISOString(),
      profileCompleted: account.complete,
      ...(account.complete
        ? {
            profileAnswers: {
              foodType: 'vegetariana',
              preferredLanguage: ['Español'],
              comfortableMixedGroup: false,
            },
          }
        : {}),
    };
  for (const [id, value] of Object.entries(activities))
    documents[`activityCatalog/${id}`] = value;
  for (const [id, value] of Object.entries(plans))
    documents[`partnerPlans/${id}`] = value;
  for (const [id, value] of Object.entries(questions))
    documents[`formularioPerfil/${id}`] = value;
  for (const [uid, id] of [
    ['qa-ios-seat', 'qa-ios-event-full'],
    ['qa-ios-user', 'qa-ios-event-reserved'],
    ['qa-ios-user', 'qa-ios-event-cancelled'],
    ['qa-ios-user', 'qa-ios-event-past'],
  ])
    documents[`users/${uid}/reservations/${id}`] = {activityId: id, createdAt};
  return {
    documents,
    activities,
    plans,
    questions,
    dinnerCali,
    dinnerFormosa,
    seededAt: now.toISOString(),
  };
}
async function seedAccount(base, account) {
  const found = await request(base, '/accounts:lookup', {
    localId: [account.uid],
    email: [account.email],
  });
  const users = found.users || [];
  assert.ok(
    users.every(
      user => user.localId === account.uid && user.email === account.email,
    ),
    'Refusing email/UID collision with non-QA account',
  );
  if (!users.length)
    await request(base, '/accounts', {
      localId: account.uid,
      email: account.email,
      password: PASSWORD,
      displayName: account.name,
      emailVerified: true,
    });
  const expected = account.admin ? {admin: true} : {};
  await request(base, '/accounts:update', {
    localId: account.uid,
    customAttributes: JSON.stringify(expected),
  });
  const verify = await request(base, '/accounts:lookup', {
    localId: [account.uid],
  });
  const user = verify.users?.[0];
  assert.equal(user?.email, account.email);
  assert.deepEqual(JSON.parse(user.customAttributes || '{}'), expected);
  return {
    uid: account.uid,
    email: account.email,
    role: account.admin ? 'admin' : 'user',
    profileCompleted: account.complete,
  };
}
function ownedDocument(id) {
  return (
    /^users\/qa-ios-(admin|user|incomplete|seat)(\/reservations\/qa-ios-event-[a-z-]+)?$/.test(
      id,
    ) ||
    /^(activityCatalog|partnerPlans|formularioPerfil)\/qa-ios-[a-z0-9-]+$/.test(
      id,
    ) ||
    /^activityCatalog\/dinner_\d{4}-\d{2}-\d{2}_(cali|formosa)_qa-ios-(cali|formosa)$/.test(
      id,
    )
  );
}
async function main() {
  const base = endpoints();
  const fixture = fixtureSet();
  // Preflight both live local services; no Auth/Firestore mutation if either is absent.
  await request(base.auth, '/accounts:lookup', {localId: ['qa-ios-admin']});
  await getDocument(base.firestore, 'users/qa-ios-admin');
  const currentForm = await request(
    base.firestore,
    '/documents/formularioPerfil',
    undefined,
    'GET',
  ).catch(error => {
    if (error.status === 404) return {documents: []};
    throw error;
  });
  const foreignQuestions = (currentForm.documents || [])
    .map(document => document.name.split('/').at(-1))
    .filter(id => !id.startsWith('qa-ios-'));
  assert.equal(
    foreignQuestions.length,
    0,
    'Existing non-QA questionnaire detected; refusing to mix/alter it. Use isolated fresh demo, without deleting its data.',
  );
  const accounts = [];
  for (const account of ACCOUNTS)
    accounts.push(await seedAccount(base.auth, account));
  const writes = [],
    preservedExisting = [];
  for (const [id, data] of Object.entries(fixture.documents)) {
    assert.ok(ownedDocument(id), `Unowned document ${id}`);
    if (await getDocument(base.firestore, id)) {
      preservedExisting.push(id);
      continue;
    }
    writes.push({
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/${id}`,
        fields: fields(data),
      },
      currentDocument: {exists: false},
    });
  }
  if (writes.length)
    await request(base.firestore, '/documents:commit', {writes});
  const verified = [];
  for (const id of Object.keys(fixture.documents)) {
    const actual = await getDocument(base.firestore, id);
    assert.ok(actual, `Seeded document missing ${id}`);
    if (id.startsWith('activityCatalog/')) {
      assert.equal(actual.schemaVersion, 2);
      assert.ok(!('participantIds' in actual) && !('createdBy' in actual));
      assert.ok(
        actual.participantCount >= 0 &&
          (actual.capacity === null ||
            actual.participantCount <= actual.capacity),
      );
    }
    verified.push({
      path: id,
      ...(actual.startsAt ? {startsAt: actual.startsAt} : {}),
      ...(actual.status ? {status: actual.status} : {}),
      ...(typeof actual.participantCount === 'number'
        ? {participantCount: actual.participantCount}
        : {}),
    });
  }
  const result = {
    projectId: PROJECT,
    hosts: {
      auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
      firestore: process.env.FIRESTORE_EMULATOR_HOST,
    },
    seededAt: fixture.seededAt,
    syntheticPassword: PASSWORD,
    accounts,
    createdDocumentCount: writes.length,
    preservedExisting,
    verifiedDocuments: verified,
    scenarioIds: {
      dinnerCali: fixture.dinnerCali,
      dinnerFormosa: fixture.dinnerFormosa,
    },
    notes: [
      'Only deterministic own QA IDs touched; existing Firestore docs preserved, no deletes.',
      'If preservedExisting is nonempty, prior manual changes remain; consult current verified counters/states.',
      'Never run test:rules clearFirestore concurrently with manual QA.',
    ],
  };
  const output = path.join(__dirname, 'ios-demo-manifest.json');
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(
    `Demo seed verified: ${accounts.length} synthetic accounts, ${writes.length} new documents, ${preservedExisting.length} existing documents preserved. Manifest: ${output}`,
  );
}
if (require.main === module)
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = {endpoints, fixtureSet, ownedDocument, toValue, fromValue};
