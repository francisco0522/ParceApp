jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: null},
  firebaseApp: 'app',
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((database, ...parts) => ({
    path: parts.join('/'),
    type: 'collection',
  })),
  doc: jest.fn((database, ...parts) => ({
    path: parts.join('/'),
    id: parts.at(-1),
  })),
  getFirestore: jest.fn(() => 'db'),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  runTransaction: jest.fn(),
  serverTimestamp: () => 'server-time',
  Timestamp: {fromDate: date => ({toDate: () => date})},
}));
import {auth} from '../src/firebase/config';
import {
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  where,
} from 'firebase/firestore';
import {
  isoDate,
  selectedStartsAt,
  activityFromSnapshot,
  formatActivityDate,
  activityError,
} from '../src/models/activity';
import {
  listEvents,
  listDinners,
  getActivity,
  watchActivity,
  watchUserActivities,
  isActivityAdministrator,
  createEvent,
  createDinner,
  reserveActivity,
  cancelReservation,
} from '../src/services/activities';
const data = (overrides = {}) => ({
  schemaVersion: 2,
  timeZone: 'America/Bogota',
  city: 'cali',
  title: 'Museo',
  kind: 'event',
  status: 'open',
  participantCount: 0,
  capacity: 2,
  direction: 'Centro',
  description: '',
  groupId: null,
  venueName: null,
  assignmentStatus: 'pending',
  startsAt: '2099-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});
const snapshot = (values = data(), id = 'activity-1') => ({
  id,
  exists: () => true,
  data: () => values,
});
describe('public catalogue model v2', () => {
  test('serializes snapshot timestamps with no identity disclosure', () => {
    expect(activityFromSnapshot(snapshot())).toMatchObject({
      id: 'activity-1',
      participantCount: 0,
    });
    expect(isoDate({toDate: () => new Date('2099-01-01')})).toBe(
      '2099-01-01T00:00:00.000Z',
    );
  });
  test.each([
    ['cali', '2099-01-02T00:30:00.000Z'],
    ['formosa', '2099-01-01T22:30:00.000Z'],
  ])('city wall clock uses correct offset %s', (city, iso) => {
    expect(
      selectedStartsAt(
        new Date(2099, 0, 1),
        new Date(2000, 0, 1, 19, 30),
        city,
      ),
    ).toBe(iso);
  });
  test('unsupported city fails and formatting shows pilot offset', () => {
    expect(() => selectedStartsAt(new Date(), new Date(), 'bogota')).toThrow(
      'INVALID_CITY',
    );
    expect(formatActivityDate(data())).toContain('UTC-05:00');
    expect(formatActivityDate(data({city: 'formosa'}))).toContain('UTC-03:00');
    expect(formatActivityDate(data({city: 'unknown'}))).toBe(
      'Ciudad sin configurar',
    );
  });
  test.each([
    {schemaVersion: 1},
    {timeZone: 'UTC'},
    {title: ''},
    {city: 'bogota'},
    {kind: 'ad'},
    {status: 'bad'},
    {participantIds: ['alice']},
    {createdBy: 'alice'},
    {participantCount: -1},
    {participantCount: 1.5},
    {capacity: 0},
    {capacity: 1, participantCount: 2},
  ])('rejects malformed or legacy public record', override =>
    expect(() => activityFromSnapshot(snapshot(data(override)))).toThrow(
      'INVALID_ACTIVITY',
    ),
  );
  test.each([null, 'bad', new Date('bad')])('rejects invalid date', value =>
    expect(() => isoDate(value)).toThrow('INVALID_DATE'),
  );
  test.each([
    'UNAUTHENTICATED',
    'ADMIN_REQUIRED',
    'INVALID_CITY',
    'INVALID_DATE',
    'INVALID_ACTIVITY',
    'DUPLICATE',
    'EVENT_NOT_FOUND',
    'ACTIVITY_CLOSED',
    'ALREADY_REGISTERED',
    'NOT_REGISTERED',
    'EVENT_FULL',
    'offline',
  ])('maps activity error %s', message =>
    expect(activityError({message})).toEqual(expect.any(String)),
  );
});
describe('public catalogue and private reservation services', () => {
  let transaction, memberExists;
  beforeEach(() => {
    jest.clearAllMocks();
    memberExists = false;
    auth.currentUser = {
      uid: 'user-1',
      getIdTokenResult: jest.fn(async () => ({claims: {admin: true}})),
    };
    transaction = {
      get: jest.fn(async ref =>
        ref.path.startsWith('users/')
          ? {exists: () => memberExists}
          : snapshot(),
      ),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    runTransaction.mockImplementation(async (db, callback) =>
      callback(transaction),
    );
  });
  test('admin authorization comes from custom claim only', async () => {
    expect(await isActivityAdministrator()).toBe(true);
    auth.currentUser.getIdTokenResult.mockResolvedValue({
      claims: {role: 'admin'},
    });
    expect(await isActivityAdministrator()).toBe(false);
    auth.currentUser = null;
    expect(await isActivityAdministrator()).toBe(false);
  });
  test('list functions query public catalogue and sort complete dates', async () => {
    getDocs.mockResolvedValue({
      docs: [
        snapshot(data({startsAt: '2099-02-01'}), 'later'),
        snapshot(data(), 'first'),
      ],
    });
    expect((await listEvents()).map(item => item.id)).toEqual([
      'first',
      'later',
    ]);
    await listDinners();
    expect(where).toHaveBeenCalledWith('kind', '==', 'event');
    expect(where).toHaveBeenCalledWith('kind', '==', 'dinner');
  });
  test('activity lookup missing/valid records', async () => {
    getDoc.mockResolvedValue(snapshot());
    expect((await getActivity('activity-1')).id).toBe('activity-1');
    getDoc.mockResolvedValue({exists: () => false});
    await expect(getActivity('activity-1')).rejects.toThrow('EVENT_NOT_FOUND');
  });
  test('create event atomically writes public count and private creator reservation', async () => {
    transaction.get.mockResolvedValue({exists: () => false});
    const id = await createEvent('user-1', {
      title: ' Museo ',
      direction: ' Centro ',
      city: 'cali',
      startsAt: '2099-01-01',
      capacity: 2,
      participantIds: ['leak'],
    });
    expect(id).toMatch(/^event_cali_museo_/);
    expect(transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({path: `activityCatalog/${id}`}),
      expect.objectContaining({
        schemaVersion: 2,
        participantCount: 1,
        city: 'cali',
      }),
    );
    const publicWrite = transaction.set.mock.calls[0][1];
    expect(publicWrite.participantIds).toBeUndefined();
    expect(publicWrite.createdBy).toBeUndefined();
    expect(transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({path: `users/user-1/reservations/${id}`}),
      {activityId: id, createdAt: 'server-time'},
    );
  });
  test('nonadmin cannot create events or dinners', async () => {
    auth.currentUser.getIdTokenResult.mockResolvedValue({claims: {}});
    await expect(createEvent('user-1', {})).rejects.toThrow('ADMIN_REQUIRED');
    await expect(createDinner('user-1', {})).rejects.toThrow('ADMIN_REQUIRED');
    expect(runTransaction).not.toHaveBeenCalled();
  });
  test('duplicate event creation never writes', async () => {
    await expect(
      createEvent('user-1', {
        title: 'Museo',
        direction: 'Centro',
        city: 'cali',
        startsAt: '2099-01-01',
        capacity: 2,
      }),
    ).rejects.toThrow('DUPLICATE');
    expect(transaction.set).not.toHaveBeenCalled();
  });
  test.each([
    {title: ''},
    {direction: ''},
    {capacity: 0},
    {capacity: 10001},
    {startsAt: '2000-01-01'},
    {startsAt: 'bad'},
    {city: 'bogota'},
  ])('rejects invalid event input', async override => {
    await expect(
      createEvent('user-1', {
        title: 'Museo',
        direction: 'Centro',
        city: 'cali',
        startsAt: '2099-01-01',
        capacity: 2,
        ...override,
      }),
    ).rejects.toThrow();
    expect(transaction.set).not.toHaveBeenCalled();
  });
  test('administrator schedules dinner with city/group/date identity and zero initial count', async () => {
    transaction.get.mockResolvedValue({exists: () => false});
    const id = await createDinner('user-1', {
      title: 'Cena',
      startsAt: '2099-01-02T00:00:00Z',
      city: 'cali',
      capacity: 6,
      groupId: 'group-1',
    });
    expect(id).toBe('dinner_2099-01-01_cali_group-1');
    expect(transaction.set).toHaveBeenCalledTimes(1);
    expect(transaction.set.mock.calls[0][1]).toMatchObject({
      participantCount: 0,
      kind: 'dinner',
    });
  });
  test('reservation reads private membership then atomically increments public count', async () => {
    await reserveActivity('user-1', 'activity-1');
    expect(transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({path: 'activityCatalog/activity-1'}),
      {participantCount: 1},
    );
    expect(transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({path: 'users/user-1/reservations/activity-1'}),
      {activityId: 'activity-1', createdAt: 'server-time'},
    );
  });
  test('private duplicate membership prevents write', async () => {
    memberExists = true;
    await expect(reserveActivity('user-1', 'activity-1')).rejects.toThrow(
      'ALREADY_REGISTERED',
    );
    expect(transaction.update).not.toHaveBeenCalled();
  });
  test.each([
    [{participantCount: 2}, 'EVENT_FULL'],
    [{status: 'cancelled'}, 'ACTIVITY_CLOSED'],
    [{status: 'completed'}, 'ACTIVITY_CLOSED'],
    [{startsAt: '2000-01-01'}, 'ACTIVITY_CLOSED'],
  ])('rejects unavailable activity', async (override, error) => {
    transaction.get.mockImplementation(async ref =>
      ref.path.startsWith('users/')
        ? {exists: () => false}
        : snapshot(data(override)),
    );
    await expect(reserveActivity('user-1', 'activity-1')).rejects.toThrow(
      error,
    );
    expect(transaction.update).not.toHaveBeenCalled();
  });
  test('missing dinner cannot be created through old reservation argument', async () => {
    transaction.get.mockResolvedValue({exists: () => false});
    await expect(
      reserveActivity('user-1', 'missing', {kind: 'dinner'}),
    ).rejects.toThrow('EVENT_NOT_FOUND');
    expect(transaction.set).not.toHaveBeenCalled();
  });
  test('null capacity allows another member', async () => {
    transaction.get.mockImplementation(async ref =>
      ref.path.startsWith('users/')
        ? {exists: () => false}
        : snapshot(data({capacity: null})),
    );
    await reserveActivity('user-1', 'activity-1');
    expect(transaction.update).toHaveBeenCalled();
  });
  test('cancellation decrements count and deletes own reservation atomically', async () => {
    memberExists = true;
    transaction.get.mockImplementation(async ref =>
      ref.path.startsWith('users/')
        ? {exists: () => true}
        : snapshot(data({participantCount: 1})),
    );
    await cancelReservation('user-1', 'activity-1');
    expect(transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({path: 'activityCatalog/activity-1'}),
      {participantCount: 0},
    );
    expect(transaction.delete).toHaveBeenCalledWith(
      expect.objectContaining({path: 'users/user-1/reservations/activity-1'}),
    );
  });
  test('missing membership cannot be cancelled', async () => {
    await expect(cancelReservation('user-1', 'activity-1')).rejects.toThrow(
      'NOT_REGISTERED',
    );
    expect(transaction.delete).not.toHaveBeenCalled();
  });
  test('auth change after read prevents write', async () => {
    transaction.get.mockImplementation(async () => {
      auth.currentUser = null;
      return snapshot();
    });
    await expect(reserveActivity('user-1', 'activity-1')).rejects.toThrow(
      'UNAUTHENTICATED',
    );
    expect(transaction.update).not.toHaveBeenCalled();
  });
  test.each(['', 'a/b', null])(
    'invalid identity fails before transaction',
    async id => {
      await expect(reserveActivity('user-1', id)).rejects.toThrow(
        'INVALID_ACTIVITY',
      );
      expect(runTransaction).not.toHaveBeenCalled();
    },
  );
  test('watch joins own memberships with live public catalogue and cleans both listeners', () => {
    const callbacks = new Map(),
      stops = [];
    onSnapshot.mockImplementation((ref, callback) => {
      callbacks.set(ref.path, callback);
      const stop = jest.fn();
      stops.push(stop);
      return stop;
    });
    const success = jest.fn(),
      failure = jest.fn();
    const stop = watchUserActivities('user-1', success, failure);
    callbacks.get('users/user-1/reservations')({docs: [{id: 'activity-1'}]});
    callbacks.get('activityCatalog/activity-1')(snapshot());
    expect(success.mock.calls[0][0][0]).toMatchObject({
      id: 'activity-1',
      participantCount: 0,
    });
    callbacks.get('activityCatalog/activity-1')(
      snapshot(data({participantCount: 1})),
    );
    expect(success.mock.calls.at(-1)[0][0].participantCount).toBe(1);
    stop();
    stops.forEach(listener => expect(listener).toHaveBeenCalledTimes(1));
    callbacks.get('activityCatalog/activity-1')(
      snapshot(data({participantCount: 2})),
    );
    expect(success).toHaveBeenCalledTimes(2);
  });
  test('empty own reservation snapshot produces empty agenda', () => {
    onSnapshot.mockImplementation((ref, callback) => {
      callback({docs: []});
      return jest.fn();
    });
    const success = jest.fn();
    watchUserActivities('user-1', success, jest.fn());
    expect(success).toHaveBeenCalledWith([]);
  });
  test('public activity watch propagates missing and malformed records', () => {
    let receive;
    onSnapshot.mockImplementation((ref, callback) => {
      receive = callback;
      return jest.fn();
    });
    const success = jest.fn(),
      failure = jest.fn();
    watchActivity('activity-1', success, failure);
    receive(snapshot());
    expect(success).toHaveBeenCalled();
    receive({exists: () => false});
    expect(failure).toHaveBeenCalledWith(
      expect.objectContaining({message: 'EVENT_NOT_FOUND'}),
    );
  });
});
