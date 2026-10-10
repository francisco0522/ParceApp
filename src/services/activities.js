import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import {auth, firebaseApp} from '../firebase/config';
import {activityFromSnapshot, PILOT_CITIES, isoDate} from '../models/activity';

const database = () => getFirestore(firebaseApp);
function authenticatedId(userId) {
  if (!userId || auth.currentUser?.uid !== userId) {
    throw new Error('UNAUTHENTICATED');
  }
  return userId;
}
export async function isActivityAdministrator() {
  if (!auth.currentUser) {
    return false;
  }
  const result = await auth.currentUser.getIdTokenResult();
  return result.claims.admin === true;
}
function validId(activityId) {
  if (
    typeof activityId !== 'string' ||
    !activityId ||
    activityId.includes('/') ||
    activityId.length > 1400
  ) {
    throw new Error('INVALID_ACTIVITY');
  }
}
function validateActivity(input) {
  const optionalText = (value, max) =>
    value == null ||
    (typeof value === 'string' &&
      value.trim().length > 0 &&
      value.trim().length <= max);
  if (
    !optionalText(input.city, 100) ||
    !optionalText(input.direction, 500) ||
    !optionalText(input.groupId, 100) ||
    !optionalText(input.venueName, 200) ||
    (input.description !== undefined &&
      (typeof input.description !== 'string' ||
        input.description.length > 4000)) ||
    (input.venueName && !input.direction)
  ) {
    throw new Error('INVALID_ACTIVITY');
  }
  const startsAt = isoDate(input.startsAt);
  if (
    !['dinner', 'event'].includes(input.kind) ||
    !Object.keys(PILOT_CITIES).includes(input.city) ||
    typeof input.title !== 'string' ||
    !input.title.trim() ||
    input.title.trim().length > 160 ||
    (input.capacity !== null &&
      (!Number.isInteger(input.capacity) ||
        input.capacity < 1 ||
        input.capacity > 10000)) ||
    new Date(startsAt).getTime() <= Date.now()
  ) {
    throw new Error('INVALID_ACTIVITY');
  }
  // Construct an explicit public projection: never spread caller data/UIDs.
  return {
    title: input.title.trim(),
    kind: input.kind,
    startsAt: Timestamp.fromDate(new Date(startsAt)),
    capacity: input.capacity,
    city: input.city,
    direction: input.direction?.trim() || null,
    description: input.description || '',
    groupId: input.groupId?.trim() || null,
    venueName: input.venueName?.trim() || null,
    assignmentStatus: input.venueName?.trim() ? 'assigned' : 'pending',
    timeZone: PILOT_CITIES[input.city].timeZone,
    schemaVersion: 2,
    status: 'open',
    createdAt: serverTimestamp(),
    participantCount: 0,
  };
}
export async function listActivities(kind) {
  let deadline;
  try {
    const result = await Promise.race([
      getDocs(
        query(
          collection(database(), 'activityCatalog'),
          where('kind', '==', kind),
        ),
      ),
      new Promise((resolve, reject) => {
        deadline = setTimeout(
          () => reject(new Error('ACTIVITY_TIMEOUT')),
          20000,
        );
      }),
    ]);
    return result.docs
      .map(activityFromSnapshot)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  } finally {
    clearTimeout(deadline);
  }
}
export const listEvents = () => listActivities('event');
export const listDinners = () => listActivities('dinner');
export async function getActivity(activityId) {
  validId(activityId);
  const snapshot = await getDoc(doc(database(), 'activityCatalog', activityId));
  if (!snapshot.exists()) {
    throw new Error('EVENT_NOT_FOUND');
  }
  return activityFromSnapshot(snapshot);
}
export function watchUserActivities(userId, onData, onError) {
  authenticatedId(userId);
  let generation = 0;
  let active = true;
  let catalogListeners = [];
  const stopCatalog = () => {
    catalogListeners.forEach(stop => stop());
    catalogListeners = [];
  };
  const unsubscribe = onSnapshot(
    collection(database(), 'users', userId, 'reservations'),
    snapshot => {
      const current = ++generation;
      stopCatalog();
      const items = new Map();
      const expected = snapshot.docs.length;
      const fail = error => {
        if (active && current === generation) {
          onError(error);
        }
      };
      if (!expected) {
        try {
          authenticatedId(userId);
          onData([]);
        } catch (error) {
          fail(error);
        }
        return;
      }
      catalogListeners = snapshot.docs.map(reservation =>
        onSnapshot(
          doc(database(), 'activityCatalog', reservation.id),
          entry => {
            if (!active || current !== generation) {
              return;
            }
            try {
              authenticatedId(userId);
              if (!entry.exists()) {
                throw new Error('EVENT_NOT_FOUND');
              }
              items.set(entry.id, activityFromSnapshot(entry));
              if (items.size === expected) {
                onData(
                  [...items.values()].sort((a, b) =>
                    a.startsAt.localeCompare(b.startsAt),
                  ),
                );
              }
            } catch (error) {
              fail(error);
            }
          },
          fail,
        ),
      );
    },
    error => {
      if (active) {
        stopCatalog();
        generation++;
        onError(error);
      }
    },
  );
  return () => {
    active = false;
    generation++;
    stopCatalog();
    unsubscribe();
  };
}
export async function createEvent(userId, input) {
  authenticatedId(userId);
  if (!(await isActivityAdministrator())) {
    throw new Error('ADMIN_REQUIRED');
  }
  authenticatedId(userId);
  if (!input.direction?.trim()) {
    throw new Error('INVALID_ACTIVITY');
  }
  const data = validateActivity({...input, kind: 'event'});
  const normalize = value =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  const key = `event_${data.city}_${encodeURIComponent(normalize(data.title))}_${encodeURIComponent(isoDate(data.startsAt))}_${encodeURIComponent(normalize(data.direction))}`;
  validId(key);
  const db = database();
  const ref = doc(db, 'activityCatalog', key);
  const membership = doc(db, 'users', userId, 'reservations', key);
  await runTransaction(db, async transaction => {
    authenticatedId(userId);
    const existing = await transaction.get(ref);
    authenticatedId(userId);
    if (existing.exists()) {
      throw new Error('DUPLICATE');
    }
    transaction.set(ref, {...data, participantCount: 1});
    transaction.set(membership, {
      activityId: key,
      createdAt: serverTimestamp(),
    });
  });
  return ref.id;
}
// Only server-authorized catalogue entries can be reserved. dinnerInput from
// older callers is intentionally not used to create an unapproved activity.
export async function reserveActivity(userId, activityId) {
  authenticatedId(userId);
  validId(activityId);
  const db = database();
  const ref = doc(db, 'activityCatalog', activityId);
  const membership = doc(db, 'users', userId, 'reservations', activityId);
  await runTransaction(db, async transaction => {
    authenticatedId(userId);
    const snapshot = await transaction.get(ref);
    const existing = await transaction.get(membership);
    authenticatedId(userId);
    if (!snapshot.exists()) {
      throw new Error('EVENT_NOT_FOUND');
    }
    const activity = activityFromSnapshot(snapshot);
    if (
      activity.status !== 'open' ||
      new Date(activity.startsAt).getTime() <= Date.now()
    ) {
      throw new Error('ACTIVITY_CLOSED');
    }
    if (existing.exists()) {
      throw new Error('ALREADY_REGISTERED');
    }
    if (
      activity.capacity !== null &&
      activity.participantCount >= activity.capacity
    ) {
      throw new Error('EVENT_FULL');
    }
    transaction.update(ref, {participantCount: activity.participantCount + 1});
    transaction.set(membership, {activityId, createdAt: serverTimestamp()});
  });
}
export async function cancelReservation(userId, activityId) {
  authenticatedId(userId);
  validId(activityId);
  const db = database();
  const ref = doc(db, 'activityCatalog', activityId);
  const membership = doc(db, 'users', userId, 'reservations', activityId);
  await runTransaction(db, async transaction => {
    authenticatedId(userId);
    const snapshot = await transaction.get(ref);
    const existing = await transaction.get(membership);
    authenticatedId(userId);
    if (!snapshot.exists()) {
      throw new Error('EVENT_NOT_FOUND');
    }
    if (!existing.exists()) {
      throw new Error('NOT_REGISTERED');
    }
    const activity = activityFromSnapshot(snapshot);
    if (new Date(activity.startsAt).getTime() <= Date.now()) {
      throw new Error('ACTIVITY_CLOSED');
    }
    transaction.update(ref, {participantCount: activity.participantCount - 1});
    transaction.delete(membership);
  });
}

export function watchActivity(activityId, onData, onError) {
  validId(activityId);
  return onSnapshot(
    doc(database(), 'activityCatalog', activityId),
    snapshot => {
      try {
        if (!snapshot.exists()) {
          throw new Error('EVENT_NOT_FOUND');
        }
        onData(activityFromSnapshot(snapshot));
      } catch (error) {
        onError(error);
      }
    },
    onError,
  );
}

// Administrative scheduling only; publishing never happens from reservation.
export async function createDinner(userId, input) {
  authenticatedId(userId);
  if (!(await isActivityAdministrator())) {
    throw new Error('ADMIN_REQUIRED');
  }
  authenticatedId(userId);
  const data = validateActivity({...input, kind: 'dinner'});
  if (!data.groupId || data.capacity === null) {
    throw new Error('INVALID_ACTIVITY');
  }
  const offset = Number(PILOT_CITIES[data.city].offset.slice(0, 3));
  const calendarDate = new Date(
    new Date(isoDate(data.startsAt)).getTime() + offset * 3600000,
  )
    .toISOString()
    .slice(0, 10);
  const key = `dinner_${calendarDate}_${data.city}_${encodeURIComponent(data.groupId)}`;
  validId(key);
  const ref = doc(database(), 'activityCatalog', key);
  await runTransaction(database(), async transaction => {
    const existing = await transaction.get(ref);
    authenticatedId(userId);
    if (existing.exists()) {
      throw new Error('DUPLICATE');
    }
    transaction.set(ref, data);
  });
  return key;
}

export function watchReservation(userId, activityId, onData, onError) {
  authenticatedId(userId);
  validId(activityId);
  return onSnapshot(
    doc(database(), 'users', userId, 'reservations', activityId),
    snapshot => {
      try {
        authenticatedId(userId);
        onData(snapshot.exists());
      } catch (error) {
        onError(error);
      }
    },
    onError,
  );
}
