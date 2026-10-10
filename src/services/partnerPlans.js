import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import {auth, firebaseApp} from '../firebase/config';
import {planFromSnapshot, validatePlanInput} from '../models/partnerPlan';

const database = () => getFirestore(firebaseApp);
function session(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('UNAUTHENTICATED');
  }
}
function validId(id) {
  if (typeof id !== 'string' || !id || id.includes('/') || id.length > 1400) {
    throw new Error('PLAN_NOT_FOUND');
  }
}
export async function isPlanAdministrator(uid) {
  session(uid);
  const token = await auth.currentUser.getIdTokenResult();
  session(uid);
  return token.claims.admin === true;
}
export function watchPublishedPlans(uid, reference, onData, onError) {
  session(uid);
  const q = query(
    collection(database(), 'partnerPlans'),
    where('status', '==', 'published'),
    where('publishFrom', '<=', Timestamp.fromDate(new Date(reference))),
  );
  let active = true;
  const stop = onSnapshot(
    q,
    snapshot => {
      if (!active) {
        return;
      }
      try {
        session(uid);
        onData(snapshot.docs.map(planFromSnapshot));
      } catch (error) {
        onError(error);
      }
    },
    error => {
      if (active) {
        onError(error);
      }
    },
  );
  return () => {
    active = false;
    stop();
  };
}
export function watchPartnerPlan(uid, id, onData, onError) {
  session(uid);
  validId(id);
  let active = true;
  const stop = onSnapshot(
    doc(database(), 'partnerPlans', id),
    snapshot => {
      if (!active) {
        return;
      }
      try {
        session(uid);
        if (!snapshot.exists()) {
          throw new Error('PLAN_NOT_FOUND');
        }
        onData(planFromSnapshot(snapshot));
      } catch (error) {
        onError(error);
      }
    },
    error => {
      if (active) {
        onError(error);
      }
    },
  );
  return () => {
    active = false;
    stop();
  };
}
export function watchAdminPlans(uid, onData, onError) {
  session(uid);
  let active = true;
  const stop = onSnapshot(
    collection(database(), 'partnerPlans'),
    snapshot => {
      if (!active) {
        return;
      }
      try {
        session(uid);
        onData(
          snapshot.docs
            .map(planFromSnapshot)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
        );
      } catch (error) {
        onError(error);
      }
    },
    error => {
      if (active) {
        onError(error);
      }
    },
  );
  return () => {
    active = false;
    stop();
  };
}
export async function savePartnerPlan(uid, id, input) {
  if (!(await isPlanAdministrator(uid))) {
    throw new Error('ADMIN_REQUIRED');
  }
  const data = validatePlanInput(input);
  for (const field of ['startsAt', 'endsAt', 'publishFrom', 'publishUntil']) {
    data[field] = Timestamp.fromDate(new Date(data[field]));
  }
  const db = database();
  if (id) {
    validId(id);
  }
  const ref = id
    ? doc(db, 'partnerPlans', id)
    : doc(collection(db, 'partnerPlans'));
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(ref);
    session(uid);
    if (id && !existing.exists()) {
      throw new Error('PLAN_NOT_FOUND');
    }
    const timestamp = serverTimestamp();
    if (existing.exists()) {
      transaction.update(ref, {...data, updatedAt: timestamp});
    } else {
      transaction.set(ref, {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  });
  return ref.id;
}
