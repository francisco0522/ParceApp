/* eslint-env node */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {
  endpoints,
  fixtureSet,
  ownedDocument,
  toValue,
  fromValue,
} = require('./seed-ios-demo.cjs');

test('seed refuses missing, remote, wrong-port and production emulator configuration', () => {
  const keys = [
    'FIREBASE_AUTH_EMULATOR_HOST',
    'FIRESTORE_EMULATOR_HOST',
    'GCLOUD_PROJECT',
    'GOOGLE_CLOUD_PROJECT',
    'FIREBASE_PROJECT_ID',
  ];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    keys.forEach(key => delete process.env[key]);
    assert.throws(endpoints, /Auth emulator/);
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.GCLOUD_PROJECT = 'demo-parceapp';
    assert.equal(new URL(endpoints().auth).hostname, '127.0.0.1');
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'production.example:9099';
    assert.throws(endpoints, /loopback/);
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8888';
    assert.throws(endpoints, /8080/);
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.GCLOUD_PROJECT = 'parceapp-production';
    assert.throws(endpoints, /demo-parceapp/);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
test('every planned document is QA-owned and unrelated records are excluded', () => {
  const fixtures = fixtureSet(new Date('2026-10-09T15:00:00Z'));
  for (const id of Object.keys(fixtures.documents))
    assert.equal(ownedDocument(id), true, id);
  for (const id of [
    'users/real-person',
    'activityCatalog/real-event',
    'users/qa-ios-user/reservations/real-event',
    'partnerPlans/real-ad',
    'formularioPerfil/real-question',
  ])
    assert.equal(ownedDocument(id), false, id);
  assert.equal(Object.keys(fixtures.documents).length, 25);
});
test('fixture counters exactly match own seed memberships and full/past/cancelled scenarios', () => {
  const fixtures = fixtureSet(new Date('2026-10-09T15:00:00Z'));
  const counts = {};
  for (const [id, document] of Object.entries(fixtures.documents))
    if (id.includes('/reservations/'))
      counts[document.activityId] = (counts[document.activityId] || 0) + 1;
  for (const [id, activity] of Object.entries(fixtures.activities)) {
    assert.equal(activity.schemaVersion, 2);
    assert.equal(activity.participantCount, counts[id] || 0, id);
    assert.ok(!('participantIds' in activity) && !('createdBy' in activity));
    assert.ok(
      activity.capacity === null ||
        activity.participantCount <= activity.capacity,
    );
  }
  assert.equal(fixtures.activities['qa-ios-event-full'].capacity, 1);
  assert.equal(fixtures.activities['qa-ios-event-full'].participantCount, 1);
  assert.equal(
    fixtures.activities['qa-ios-event-cancelled'].status,
    'cancelled',
  );
  assert.equal(fixtures.activities['qa-ios-event-past'].status, 'completed');
});
test('Cali and Formosa 19:00 dinner wall clocks represent different UTC instants', () => {
  const fixtures = fixtureSet(new Date('2026-10-09T15:00:00Z'));
  assert.equal(
    fixtures.activities[fixtures.dinnerCali].startsAt.toISOString(),
    '2026-10-13T00:00:00.000Z',
  );
  assert.equal(
    fixtures.activities[fixtures.dinnerFormosa].startsAt.toISOString(),
    '2026-10-12T22:00:00.000Z',
  );
  assert.equal(
    fixtures.activities[fixtures.dinnerFormosa].timeZone,
    'America/Argentina/Cordoba',
  );
});
test('last question is required boolean; completed profiles preserve false', () => {
  const fixtures = fixtureSet();
  const questions = Object.values(fixtures.questions).sort(
    (a, b) => a.order - b.order,
  );
  assert.equal(questions.at(-1).type, 'boolean');
  assert.equal(questions.at(-1).required, true);
  assert.equal(
    fixtures.documents['users/qa-ios-user'].profileAnswers
      .comfortableMixedGroup,
    false,
  );
  assert.equal(
    fixtures.documents['users/qa-ios-incomplete'].profileCompleted,
    false,
  );
});
test('partner fixtures distinguish published/draft/withdrawn/expired and failed image without credentials', () => {
  const now = new Date('2026-10-09T15:00:00Z');
  const fixtures = fixtureSet(now);
  const visible = Object.values(fixtures.plans).filter(
    plan =>
      plan.status === 'published' &&
      plan.publishFrom <= now &&
      plan.publishUntil > now &&
      plan.endsAt > now,
  );
  assert.equal(visible.length, 3);
  assert.equal(fixtures.plans['qa-ios-plan-expired'].status, 'published');
  assert.ok(fixtures.plans['qa-ios-plan-expired'].publishUntil < now);
  for (const plan of Object.values(fixtures.plans)) {
    assert.ok(plan.endsAt > plan.startsAt);
    assert.ok(plan.publishUntil > plan.publishFrom);
    const url = new URL(plan.externalUrl);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.username, '');
    assert.equal(url.password, '');
  }
  assert.equal(fixtures.plans['qa-ios-plan-image-fallback'].sponsored, false);
});
test('Firestore REST encoding/decoding preserves bool false and timestamp types', () => {
  const date = new Date('2026-10-09T15:00:00Z');
  assert.equal(fromValue(toValue(false)), false);
  assert.equal(fromValue(toValue(date)), date.toISOString());
  assert.deepEqual(
    fromValue(
      toValue({social: false, langs: ['Español'], capacity: null, count: 2}),
    ),
    {social: false, langs: ['Español'], capacity: null, count: 2},
  );
});
