jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, collection, id) => `${collection}/${id}`),
  getFirestore: jest.fn(() => 'db'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: jest.fn(),
}));
jest.mock('../src/services/sessionStorage', () => ({
  encryptedSessionStorage: {removeItem: jest.fn()},
}));
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1', email: 'synthetic@example.test'}},
  firebaseApp: 'app',
}));
import {auth} from '../src/firebase/config';
import {getDoc, setDoc, doc} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {encryptedSessionStorage} from '../src/services/sessionStorage';
import {
  clearLegacySession,
  serializeDate,
  loadSessionProfile,
  sessionRoute,
  resetToSession,
  login,
  register,
  logout,
  sessionError,
} from '../src/services/session';
const user = {uid: 'user-1', email: 'synthetic@example.test'};
const snapshot = (data = {}, exists = true) => ({
  exists: () => exists,
  data: () => data,
});
describe('session lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = user;
    getDoc.mockResolvedValue(
      snapshot({fullName: 'Persona ficticia', profileCompleted: false}),
    );
    setDoc.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
    encryptedSessionStorage.removeItem.mockResolvedValue(undefined);
    signInWithEmailAndPassword.mockResolvedValue({user});
    signOut.mockImplementation(async () => {
      auth.currentUser = null;
    });
  });
  test.each([null, 'invalid', new Date('invalid')])(
    'serializes invalid/absent dates to null',
    value => {
      expect(serializeDate(value)).toBeNull();
    },
  );
  test('serializes Date and Timestamp to ISO', () => {
    const iso = '1990-01-02T00:00:00.000Z';
    expect(serializeDate(new Date(iso))).toBe(iso);
    expect(serializeDate({toDate: () => new Date(iso)})).toBe(iso);
  });
  test('reads document by authenticated UID, not a field query', async () => {
    expect(await loadSessionProfile(user)).toMatchObject({
      id: 'user-1',
      name: 'Persona ficticia',
      email: user.email,
      profileCompleted: false,
    });
    expect(doc).toHaveBeenCalledWith('db', 'users', 'user-1');
  });
  test('missing profile fails explicitly', async () => {
    getDoc.mockResolvedValue(snapshot({}, false));
    await expect(loadSessionProfile(user)).rejects.toThrow('PROFILE_MISSING');
  });
  test('changing auth during a read rejects stale data', async () => {
    getDoc.mockImplementation(async () => {
      auth.currentUser = {uid: 'other'};
      return snapshot();
    });
    await expect(loadSessionProfile(user)).rejects.toThrow('SESSION_CHANGED');
  });
  test.each([false, true])('routes according to completion %s', completed => {
    const profile = {profileCompleted: completed};
    expect(sessionRoute(profile)).toBe(
      completed ? 'HomeScreen' : 'ProfileCreationScreen',
    );
    const navigation = {reset: jest.fn()};
    resetToSession(navigation, profile);
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: sessionRoute(profile)}],
    });
  });
  test('cleans both legacy stores', async () => {
    await clearLegacySession();
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(6);
    expect(encryptedSessionStorage.removeItem).toHaveBeenCalledTimes(6);
  });
  test('login trims email and restores profile', async () => {
    expect(await login(` ${user.email} `, 'password')).toMatchObject({
      id: user.uid,
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      user.email,
      'password',
    );
  });
  test('login authentication failures propagate', async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error('bad credentials'));
    await expect(login(user.email, 'bad')).rejects.toThrow('bad credentials');
    expect(getDoc).not.toHaveBeenCalled();
  });
  test('registration retries a failed profile write without recreating account', async () => {
    auth.currentUser = null;
    createUserWithEmailAndPassword.mockImplementation(async () => {
      auth.currentUser = user;
      return {user};
    });
    getDoc.mockResolvedValueOnce(snapshot({}, false));
    setDoc.mockRejectedValueOnce(new Error('offline'));
    const input = {
      fullName: ' Persona ficticia ',
      email: user.email,
      password: 'password',
      birthDate: '1990-01-02',
    };
    await expect(register(input)).rejects.toThrow('offline');
    getDoc
      .mockResolvedValueOnce(snapshot({}, false))
      .mockResolvedValueOnce(
        snapshot({fullName: 'Persona ficticia', profileCompleted: false}),
      );
    await expect(register(input)).resolves.toMatchObject({id: user.uid});
    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenLastCalledWith(
      'users/user-1',
      expect.objectContaining({
        fullName: 'Persona ficticia',
        profileCompleted: false,
        birthDate: '1990-01-02T00:00:00.000Z',
      }),
    );
  });
  test('logout signs out before cleaning obsolete stores', async () => {
    await logout();
    expect(signOut).toHaveBeenCalledWith(auth);
    expect(auth.currentUser).toBeNull();
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(
      AsyncStorage.removeItem.mock.invocationCallOrder[0],
    );
  });
  test.each([
    {message: 'PROFILE_MISSING'},
    {code: 'auth/network-request-failed'},
    {code: 'unavailable'},
    {code: 'auth/email-already-in-use'},
    {code: 'auth/invalid-credential'},
    {code: 'auth/wrong-password'},
    {code: 'auth/user-not-found'},
    {message: 'other'},
  ])('maps errors to readable messages', error => {
    expect(typeof sessionError(error)).toBe('string');
    expect(sessionError(error).length).toBeGreaterThan(10);
  });
});
