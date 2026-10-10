jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: null},
  firebaseApp: 'app',
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, ...parts) => ({path: parts.join('/')})),
  doc: jest.fn((db, ...parts) =>
    parts.length
      ? {path: parts.join('/'), id: parts.at(-1)}
      : {path: 'partnerPlans/generated', id: 'generated'},
  ),
  getFirestore: () => 'db',
  onSnapshot: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  runTransaction: jest.fn(),
  serverTimestamp: () => 'server-time',
  Timestamp: {fromDate: date => ({toDate: () => date})},
}));
import {auth} from '../src/firebase/config';
import {onSnapshot, runTransaction, where} from 'firebase/firestore';
import {partnerPlan} from '../tests/partnerFixtures';
import {
  isPlanAdministrator,
  watchPublishedPlans,
  watchPartnerPlan,
  watchAdminPlans,
  savePartnerPlan,
} from '../src/services/partnerPlans';
describe('partner plans service permissions and listeners', () => {
  let transaction, stop, receive, failure;
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = {
      uid: 'user-1',
      getIdTokenResult: jest.fn(async () => ({claims: {admin: true}})),
    };
    transaction = {
      get: jest.fn(async () => ({exists: () => false})),
      set: jest.fn(),
      update: jest.fn(),
    };
    runTransaction.mockImplementation(async (db, callback) =>
      callback(transaction),
    );
    stop = jest.fn();
    onSnapshot.mockImplementation((ref, callback, error) => {
      receive = callback;
      failure = error;
      return stop;
    });
  });
  test('admin requires matching authenticated UID and true custom claim', async () => {
    expect(await isPlanAdministrator('user-1')).toBe(true);
    auth.currentUser.getIdTokenResult.mockResolvedValue({
      claims: {role: 'admin'},
    });
    expect(await isPlanAdministrator('user-1')).toBe(false);
    await expect(isPlanAdministrator('other')).rejects.toThrow(
      'UNAUTHENTICATED',
    );
  });
  test('changed auth after claims read rejected', async () => {
    auth.currentUser.getIdTokenResult.mockImplementation(async () => {
      auth.currentUser = null;
      return {claims: {admin: true}};
    });
    await expect(isPlanAdministrator('user-1')).rejects.toThrow(
      'UNAUTHENTICATED',
    );
  });
  test('public feed queries published plus publication start, returns parsed entries and unsubscribes', () => {
    const data = jest.fn(),
      error = jest.fn();
    const cancel = watchPublishedPlans('user-1', Date.now(), data, error);
    expect(where).toHaveBeenCalledWith('status', '==', 'published');
    expect(where).toHaveBeenCalledWith('publishFrom', '<=', expect.any(Object));
    receive({docs: [{id: 'plan-1', data: () => partnerPlan()}]});
    expect(data.mock.calls[0][0][0].id).toBe('plan-1');
    cancel();
    receive({docs: []});
    expect(data).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });
  test('feed propagates malformed data and current session changes', () => {
    const error = jest.fn();
    watchPublishedPlans('user-1', Date.now(), jest.fn(), error);
    receive({docs: [{id: 'bad', data: () => partnerPlan({category: 'bad'})}]});
    expect(error).toHaveBeenCalled();
    auth.currentUser = null;
    receive({docs: []});
    expect(error).toHaveBeenLastCalledWith(
      expect.objectContaining({message: 'UNAUTHENTICATED'}),
    );
  });
  test('detail missing document propagates error; invalid identity never subscribes', () => {
    const error = jest.fn();
    watchPartnerPlan('user-1', 'plan-1', jest.fn(), error);
    receive({exists: () => false});
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({message: 'PLAN_NOT_FOUND'}),
    );
    expect(() => watchPartnerPlan('user-1', 'a/b', jest.fn(), error)).toThrow(
      'PLAN_NOT_FOUND',
    );
  });
  test('admin watcher sorts complete dates and forwards errors', () => {
    const data = jest.fn(),
      error = jest.fn();
    watchAdminPlans('user-1', data, error);
    receive({
      docs: [
        {
          id: 'later',
          data: () => partnerPlan({startsAt: '2099-01-01T04:00:00Z'}),
        },
        {id: 'first', data: () => partnerPlan()},
      ],
    });
    expect(data.mock.calls[0][0].map(plan => plan.id)).toEqual([
      'first',
      'later',
    ]);
    failure(new Error('offline'));
    expect(error).toHaveBeenCalled();
  });
  test('create stamps new public plan, update preserves createdAt', async () => {
    await expect(savePartnerPlan('user-1', null, partnerPlan())).resolves.toBe(
      'generated',
    );
    expect(transaction.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        createdAt: 'server-time',
        updatedAt: 'server-time',
        schemaVersion: 1,
      }),
    );
    transaction.get.mockResolvedValue({exists: () => true});
    await savePartnerPlan(
      'user-1',
      'plan-1',
      partnerPlan({status: 'withdrawn'}),
    );
    expect(transaction.update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({status: 'withdrawn', updatedAt: 'server-time'}),
    );
    expect(transaction.update.mock.calls[0][1].createdAt).toBeUndefined();
  });
  test('ordinary user cannot save and invalid URL never writes', async () => {
    auth.currentUser.getIdTokenResult.mockResolvedValue({claims: {}});
    await expect(
      savePartnerPlan('user-1', null, partnerPlan()),
    ).rejects.toThrow('ADMIN_REQUIRED');
    auth.currentUser.getIdTokenResult.mockResolvedValue({
      claims: {admin: true},
    });
    await expect(
      savePartnerPlan(
        'user-1',
        null,
        partnerPlan({externalUrl: 'http://example.test'}),
      ),
    ).rejects.toThrow('INVALID_PLAN_URL');
    expect(transaction.set).not.toHaveBeenCalled();
  });
  test('missing update target and changed auth prevent write', async () => {
    await expect(
      savePartnerPlan('user-1', 'missing', partnerPlan()),
    ).rejects.toThrow('PLAN_NOT_FOUND');
    transaction.get.mockImplementation(async () => {
      auth.currentUser = null;
      return {exists: () => false};
    });
    await expect(
      savePartnerPlan('user-1', null, partnerPlan()),
    ).rejects.toThrow('UNAUTHENTICATED');
    expect(transaction.set).not.toHaveBeenCalled();
  });
});
