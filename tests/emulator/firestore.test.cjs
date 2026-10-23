/* eslint-disable no-script-url -- Adversarial URL fixture must be rejected and never executed. */
/* eslint-env node */
const {describe, it, before, after, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  Timestamp,
  serverTimestamp,
} = require('firebase/firestore');
const PROJECT = 'demo-parceapp';
const CATALOG = 'activityCatalog';
let env;
const future = () => Timestamp.fromMillis(Date.now() + 86400000);
const past = () => Timestamp.fromMillis(Date.now() - 86400000);
const activity = (overrides = {}) => ({
  schemaVersion: 2,
  kind: 'event',
  title: 'Museo ficticio',
  startsAt: future(),
  timeZone: 'America/Bogota',
  capacity: 2,
  participantCount: 0,
  status: 'open',
  createdAt: serverTimestamp(),
  city: 'cali',
  direction: 'Centro de prueba',
  description: 'Fixture sintético',
  groupId: null,
  venueName: null,
  assignmentStatus: 'pending',
  ...overrides,
});
const profile = (email = 'alice@example.test', overrides = {}) => ({
  fullName: 'Persona ficticia',
  emailText: email,
  birthDate: '1990-01-02T00:00:00.000Z',
  createdAt: '2026-10-09T00:00:00.000Z',
  profileCompleted: false,
  ...overrides,
});
const plan = (overrides = {}) => ({
  schemaVersion: 1,
  ally: 'Museo ficticio',
  title: 'Exposición de prueba',
  description: 'Fixture sintético',
  imageUrl: null,
  category: 'museum',
  city: 'cali',
  address: 'Centro de prueba',
  startsAt: future(),
  endsAt: Timestamp.fromMillis(Date.now() + 172800000),
  publishFrom: past(),
  publishUntil: future(),
  externalUrl: 'https://example.test/plan',
  sponsored: true,
  status: 'published',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});
const db = (uid = 'alice', claims = {}) =>
  env
    .authenticatedContext(uid, {email: `${uid}@example.test`, ...claims})
    .firestore();
const ref = (database, id = 'event-1') => doc(database, CATALOG, id);
const reservation = (database, uid = 'alice', id = 'event-1') =>
  doc(database, 'users', uid, 'reservations', id);
async function seedActivity(overrides = {}, id = 'event-1') {
  await env.withSecurityRulesDisabled(async context =>
    setDoc(ref(context.firestore(), id), activity(overrides)),
  );
}
async function seedReservation(uid = 'alice', id = 'event-1') {
  await env.withSecurityRulesDisabled(async context =>
    setDoc(reservation(context.firestore(), uid, id), {
      activityId: id,
      createdAt: Timestamp.now(),
    }),
  );
}
async function seedPlan(status = 'published', overrides = {}) {
  await env.withSecurityRulesDisabled(async context =>
    setDoc(
      doc(context.firestore(), 'partnerPlans', status),
      plan({status, ...overrides}),
    ),
  );
}
async function atomicJoin(database, uid = 'alice', id = 'event-1') {
  const batch = writeBatch(database);
  batch.update(ref(database, id), {participantCount: 1});
  batch.set(reservation(database, uid, id), {
    activityId: id,
    createdAt: serverTimestamp(),
  });
  return batch.commit();
}
async function transactJoin(database, uid, id = 'event-1') {
  return runTransaction(database, async tx => {
    const a = await tx.get(ref(database, id));
    const r = await tx.get(reservation(database, uid, id));
    assert.equal(r.exists(), false, 'already reserved');
    const data = a.data();
    if (data.capacity !== null && data.participantCount >= data.capacity) {
      throw new Error('FULL');
    }
    tx.update(ref(database, id), {participantCount: data.participantCount + 1});
    tx.set(reservation(database, uid, id), {
      activityId: id,
      createdAt: serverTimestamp(),
    });
  });
}
async function atomicCancel(
  database,
  uid = 'alice',
  count = 0,
  id = 'event-1',
) {
  const batch = writeBatch(database);
  batch.update(ref(database, id), {participantCount: count});
  batch.delete(reservation(database, uid, id));
  return batch.commit();
}
async function privilegedActivity(id = 'event-1') {
  let data;
  await env.withSecurityRulesDisabled(async context => {
    data = (await getDoc(ref(context.firestore(), id))).data();
  });
  return data;
}

describe('Firestore rules: isolated demo emulator', () => {
  before(async () => {
    const endpoint = process.env.FIRESTORE_EMULATOR_HOST;
    assert.match(
      endpoint || '',
      /^(127\.0\.0\.1|localhost):\d+$/,
      'Firestore emulator loopback is required; never connect to production',
    );
    for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
      if (process.env[key]) {
        assert.equal(process.env[key], PROJECT, 'Only demo-parceapp allowed');
      }
    }
    const [host, port] = endpoint.split(':');
    const rules = fs.readFileSync(
      path.resolve(__dirname, '../../firestore.rules'),
      'utf8',
    );
    assert.match(
      rules,
      /activityCatalog/,
      'Wait for the finalized v2 catalogue contract',
    );
    env = await initializeTestEnvironment({
      projectId: PROJECT,
      firestore: {host, port: Number(port), rules},
    });
  });
  after(async () => {
    if (env) {
      await env.cleanup();
    }
  });
  beforeEach(async () => env.clearFirestore());

  it('owner can create/read private profile and change own display name/preferences', async () => {
    const alice = db();
    await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), profile()));
    await assertSucceeds(getDoc(doc(alice, 'users', 'alice')));
    await assertSucceeds(
      updateDoc(doc(alice, 'users', 'alice'), {
        fullName: 'Alias ficticio',
        profileAnswers: {social: false},
        profileCompleted: true,
        updatedAt: '2026-10-10',
      }),
    );
  });
  it('anonymous/other user/admin cannot read private profile', async () => {
    await env.withSecurityRulesDisabled(async c =>
      setDoc(doc(c.firestore(), 'users', 'alice'), profile()),
    );
    for (const database of [
      env.unauthenticatedContext().firestore(),
      db('bob'),
      db('admin', {admin: true}),
    ]) {
      await assertFails(getDoc(doc(database, 'users', 'alice')));
    }
  });
  it('profiles collection cannot be broadly listed', async () => {
    await assertFails(getDocs(collection(db(), 'users')));
  });
  it('other user cannot create/write/delete owner profile', async () => {
    const bob = db('bob');
    await assertFails(
      setDoc(doc(bob, 'users', 'alice'), profile('bob@example.test')),
    );
    await env.withSecurityRulesDisabled(async c =>
      setDoc(doc(c.firestore(), 'users', 'alice'), profile()),
    );
    await assertFails(
      updateDoc(doc(bob, 'users', 'alice'), {fullName: 'Attacker'}),
    );
    await assertFails(deleteDoc(doc(db(), 'users', 'alice')));
  });
  it('profile cannot spoof authenticated email or initial completion', async () => {
    await assertFails(
      setDoc(doc(db(), 'users', 'alice'), profile('bob@example.test')),
    );
    await assertFails(
      setDoc(
        doc(db(), 'users', 'alice'),
        profile('alice@example.test', {profileCompleted: true}),
      ),
    );
  });
  for (const patch of [
    {emailText: 'other@example.test'},
    {birthDate: '2000-01-01'},
    {createdAt: '2099-01-01'},
    {admin: true},
    {role: 'admin'},
    {profileCompleted: 'yes'},
  ]) {
    it(`profile rejects protected/unknown/type mutation ${Object.keys(patch)[0]}`, async () => {
      await env.withSecurityRulesDisabled(async c =>
        setDoc(doc(c.firestore(), 'users', 'alice'), profile()),
      );
      await assertFails(updateDoc(doc(db(), 'users', 'alice'), patch));
    });
  }
  it('catalogue authenticated read contains no membership/owner fields', async () => {
    await seedActivity();
    const snapshot = await assertSucceeds(getDoc(ref(db())));
    assert.equal(snapshot.data().participantCount, 0);
    assert.equal('participantIds' in snapshot.data(), false);
    assert.equal('createdBy' in snapshot.data(), false);
    await assertSucceeds(getDocs(collection(db(), CATALOG)));
    await assertFails(getDoc(ref(env.unauthenticatedContext().firestore())));
  });
  it('only admin custom claim can create future event or dinner', async () => {
    await assertFails(setDoc(ref(db()), activity()));
    await assertFails(setDoc(ref(db('fake', {role: 'admin'})), activity()));
    await assertSucceeds(setDoc(ref(db('admin', {admin: true})), activity()));
    await assertSucceeds(
      setDoc(
        ref(db('admin', {admin: true}), 'dinner-1'),
        activity({
          kind: 'dinner',
          groupId: 'group-1',
          direction: null,
          capacity: 6,
        }),
      ),
    );
  });
  it('Formosa requires its matching Argentina timezone', async () => {
    await assertSucceeds(
      setDoc(
        ref(db('admin', {admin: true})),
        activity({city: 'formosa', timeZone: 'America/Argentina/Cordoba'}),
      ),
    );
    await assertFails(
      setDoc(
        ref(db('admin', {admin: true}), 'wrong'),
        activity({city: 'formosa', timeZone: 'America/Bogota'}),
      ),
    );
  });
  for (const override of [
    {participantIds: ['alice']},
    {createdBy: 'alice'},
    {schemaVersion: 1},
    {city: 'bogota'},
    {capacity: 0},
    {capacity: 1, participantCount: 2},
    {startsAt: past()},
    {status: 'cancelled'},
    {participantCount: 1},
    {kind: 'dinner', groupId: null},
  ]) {
    it(`admin invalid catalogue create rejected ${JSON.stringify(Object.keys(override))}`, async () => {
      await assertFails(
        setDoc(ref(db('admin', {admin: true})), activity(override)),
      );
    });
  }
  it('admin creator membership and initial count one must be atomic', async () => {
    const database = db('admin', {admin: true});
    const batch = writeBatch(database);
    batch.set(ref(database), activity({participantCount: 1}));
    batch.set(reservation(database, 'admin'), {
      activityId: 'event-1',
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });
  it('user cannot modify catalogue metadata/count alone or delete activity', async () => {
    await seedActivity();
    for (const patch of [
      {capacity: 99},
      {status: 'cancelled'},
      {title: 'Attacker'},
      {startsAt: future()},
      {participantCount: 1},
    ]) {
      await assertFails(updateDoc(ref(db()), patch));
    }
    await assertFails(deleteDoc(ref(db('admin', {admin: true}))));
  });
  it('admin can assign venue/cancel but cannot change booked date/city/group', async () => {
    await seedActivity({participantCount: 1});
    const adminDb = db('admin', {admin: true});
    await assertSucceeds(
      updateDoc(ref(adminDb), {
        venueName: 'Lugar ficticio',
        direction: 'Centro',
        assignmentStatus: 'assigned',
        status: 'cancelled',
      }),
    );
    await assertFails(updateDoc(ref(adminDb), {startsAt: future()}));
    await assertFails(
      updateDoc(ref(adminDb), {
        city: 'formosa',
        timeZone: 'America/Argentina/Cordoba',
      }),
    );
    await assertFails(updateDoc(ref(adminDb), {participantCount: 0}));
  });
  it('own atomic reservation increments count and is privately readable/listable', async () => {
    await seedActivity();
    const alice = db();
    await assertSucceeds(atomicJoin(alice));
    await assertSucceeds(getDoc(reservation(alice)));
    await assertSucceeds(
      getDocs(collection(alice, 'users', 'alice', 'reservations')),
    );
    assert.equal((await privilegedActivity()).participantCount, 1);
    await assertFails(getDoc(reservation(db('bob'), 'alice')));
    await assertFails(
      getDocs(collection(db('bob'), 'users', 'alice', 'reservations')),
    );
  });
  it('reservation without count change denied', async () => {
    await seedActivity();
    await assertFails(
      setDoc(reservation(db()), {
        activityId: 'event-1',
        createdAt: serverTimestamp(),
      }),
    );
    assert.equal((await privilegedActivity()).participantCount, 0);
  });
  it('reservation for another UID denied even in otherwise atomic batch', async () => {
    await seedActivity();
    await assertFails(atomicJoin(db(), 'bob'));
    assert.equal((await privilegedActivity()).participantCount, 0);
  });
  for (const fields of [
    {activityId: 'wrong', createdAt: serverTimestamp()},
    {activityId: 'event-1', createdAt: Timestamp.now()},
    {activityId: 'event-1', createdAt: serverTimestamp(), uid: 'alice'},
  ]) {
    it(`reservation rejects forged fields ${Object.keys(fields).join(',')}`, async () => {
      await seedActivity();
      const database = db();
      const batch = writeBatch(database);
      batch.update(ref(database), {participantCount: 1});
      batch.set(reservation(database), fields);
      await assertFails(batch.commit());
    });
  }
  it('duplicate reservation cannot rewrite membership or increment twice', async () => {
    await seedActivity({participantCount: 1});
    await seedReservation();
    const database = db();
    const batch = writeBatch(database);
    batch.update(ref(database), {participantCount: 2});
    batch.set(reservation(database), {
      activityId: 'event-1',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
    assert.equal((await privilegedActivity()).participantCount, 1);
  });
  for (const override of [
    {status: 'cancelled'},
    {status: 'completed'},
    {startsAt: past()},
    {capacity: 1, participantCount: 1},
  ]) {
    it(`closed/past/full activity cannot be joined ${Object.keys(override).join(',')}`, async () => {
      await seedActivity(override);
      await assertFails(atomicJoin(db()));
    });
  }
  it('missing catalogue cannot be synthesized by regular user', async () => {
    const database = db();
    const batch = writeBatch(database);
    batch.set(ref(database), activity({participantCount: 1}));
    batch.set(reservation(database), {
      activityId: 'event-1',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });
  it('count increase of two and non-member decrease rejected', async () => {
    await seedActivity({participantCount: 1});
    const database = db();
    const batch = writeBatch(database);
    batch.update(ref(database), {participantCount: 3});
    batch.set(reservation(database), {
      activityId: 'event-1',
      createdAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
    await assertFails(updateDoc(ref(database), {participantCount: 0}));
  });
  it('own atomic cancellation decrements and removes membership', async () => {
    await seedActivity({participantCount: 1});
    await seedReservation();
    await assertSucceeds(atomicCancel(db()));
    assert.equal((await privilegedActivity()).participantCount, 0);
    assert.equal((await getDoc(reservation(db()))).exists(), false);
  });
  it('cancellation cannot remove membership without count or target another UID', async () => {
    await seedActivity({participantCount: 1});
    await seedReservation();
    await assertFails(deleteDoc(reservation(db())));
    await assertFails(atomicCancel(db('bob'), 'alice'));
    assert.equal((await privilegedActivity()).participantCount, 1);
  });
  it('repeat cancellation cannot make counter negative', async () => {
    await seedActivity({participantCount: 1});
    await seedReservation();
    await atomicCancel(db());
    await assertFails(atomicCancel(db(), 'alice', -1));
    assert.equal((await privilegedActivity()).participantCount, 0);
  });
  it('past cancellation denied; cancelled future activity still frees own place', async () => {
    await seedActivity({participantCount: 1, startsAt: past()});
    await seedReservation();
    await assertFails(atomicCancel(db()));
    await seedActivity({participantCount: 1, status: 'cancelled'});
    await assertSucceeds(atomicCancel(db()));
  });
  it('two real transactions competing for last seat allow exactly one', async () => {
    await seedActivity({capacity: 1});
    const results = await Promise.allSettled([
      transactJoin(db('alice'), 'alice'),
      transactJoin(db('bob'), 'bob'),
    ]);
    assert.equal(
      results.filter(result => result.status === 'fulfilled').length,
      1,
    );
    assert.equal((await privilegedActivity()).participantCount, 1);
    const alice = (await getDoc(reservation(db(), 'alice'))).exists();
    const bob = (await getDoc(reservation(db('bob'), 'bob'))).exists();
    assert.equal(Number(alice) + Number(bob), 1);
  });
  it('concurrent same-UID transactions do not double count', async () => {
    await seedActivity();
    const results = await Promise.allSettled([
      transactJoin(db(), 'alice'),
      transactJoin(db(), 'alice'),
    ]);
    assert.equal(
      results.filter(result => result.status === 'fulfilled').length,
      1,
    );
    assert.equal((await privilegedActivity()).participantCount, 1);
  });
  it('null capacity permits multiple distinct members', async () => {
    await seedActivity({capacity: null});
    await transactJoin(db(), 'alice');
    await transactJoin(db('bob'), 'bob');
    assert.equal((await privilegedActivity()).participantCount, 2);
  });
  it('legacy activities/member collections and unknown private metadata are denied', async () => {
    for (const name of [
      'activities',
      'reservas',
      'eventos',
      'activityOwners',
      'unknown',
    ]) {
      await env.withSecurityRulesDisabled(async c =>
        setDoc(doc(c.firestore(), name, 'one'), {participantIds: ['alice']}),
      );
      await assertFails(getDoc(doc(db(), name, 'one')));
      await assertFails(setDoc(doc(db(), name, 'two'), {anything: true}));
    }
  });
  it('partner plan only admin writes; own profile role cannot promote', async () => {
    await assertFails(setDoc(doc(db(), 'partnerPlans', 'one'), plan()));
    await assertFails(
      setDoc(doc(db('fake', {role: 'admin'}), 'partnerPlans', 'one'), plan()),
    );
    const adminDb = db('admin', {admin: true});
    await assertSucceeds(setDoc(doc(adminDb, 'partnerPlans', 'one'), plan()));
    await assertSucceeds(
      updateDoc(doc(adminDb, 'partnerPlans', 'one'), {
        status: 'withdrawn',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(deleteDoc(doc(adminDb, 'partnerPlans', 'one')));
  });
  it('published plans readable, draft/withdrawn private including list queries', async () => {
    await seedPlan();
    await seedPlan('draft');
    await seedPlan('withdrawn');
    await assertSucceeds(getDoc(doc(db(), 'partnerPlans', 'published')));
    await assertFails(getDoc(doc(db(), 'partnerPlans', 'draft')));
    await assertFails(getDoc(doc(db(), 'partnerPlans', 'withdrawn')));
    await assertFails(getDocs(collection(db(), 'partnerPlans')));
    await assertSucceeds(
      getDocs(
        query(
          collection(db(), 'partnerPlans'),
          where('status', '==', 'published'),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(collection(db('admin', {admin: true}), 'partnerPlans')),
    );
    await assertFails(
      getDoc(
        doc(
          env.unauthenticatedContext().firestore(),
          'partnerPlans',
          'published',
        ),
      ),
    );
  });
  it('published historical plans are not confidential; expiry is a feed filter', async () => {
    await seedPlan('published', {
      publishFrom: Timestamp.fromMillis(Date.now() - 172800000),
      publishUntil: past(),
      startsAt: Timestamp.fromMillis(Date.now() - 259200000),
      endsAt: Timestamp.fromMillis(Date.now() - 172800000),
    });
    await assertSucceeds(getDoc(doc(db(), 'partnerPlans', 'published')));
  });
  for (const override of [
    {externalUrl: 'javascript:alert(1)'},
    {imageUrl: 'http://example.test/img'},
    {category: 'invalid'},
    {city: 'bogota'},
    {sponsored: 'true'},
    {startsAt: future(), endsAt: past()},
    {publishFrom: future(), publishUntil: past()},
    {status: 'secret'},
    {uid: 'alice'},
  ]) {
    it(`admin rejects malformed plan ${Object.keys(override).join(',')}`, async () => {
      await assertFails(
        setDoc(
          doc(db('admin', {admin: true}), 'partnerPlans', 'one'),
          plan(override),
        ),
      );
    });
  }
  it('questionnaire reads authenticated and writes admin only', async () => {
    await env.withSecurityRulesDisabled(async c =>
      setDoc(doc(c.firestore(), 'formularioPerfil', 'one'), {
        question: 'Prueba',
      }),
    );
    await assertSucceeds(getDoc(doc(db(), 'formularioPerfil', 'one')));
    await assertFails(
      setDoc(doc(db(), 'formularioPerfil', 'two'), {question: 'Attacker'}),
    );
    await assertSucceeds(
      setDoc(doc(db('admin', {admin: true}), 'formularioPerfil', 'two'), {
        question: 'Prueba',
      }),
    );
  });
});
