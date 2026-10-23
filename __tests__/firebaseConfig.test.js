jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(),
  getAuth: jest.fn(),
  getReactNativePersistence: jest.fn(() => 'persistence'),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  connectFirestoreEmulator: jest.fn(),
}));
jest.mock('react-native-config', () => ({
  FIREBASE_PROJECT_ID: 'synthetic-project',
}));
jest.mock('../src/services/sessionStorage', () => ({
  encryptedSessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
import Config from 'react-native-config';
import {Platform} from 'react-native';
import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import {getFirestore, connectFirestoreEmulator} from 'firebase/firestore';
import {encryptedSessionStorage} from '../src/services/sessionStorage';
describe('Firebase encrypted auth and demo emulator guards', () => {
  let app, auth, firestore;
  beforeEach(() => {
    jest.clearAllMocks();
    app = {options: {projectId: 'synthetic-project'}};
    auth = {};
    firestore = {};
    Config.FIREBASE_PROJECT_ID = 'synthetic-project';
    Config.FIREBASE_USE_EMULATORS = 'false';
    global.__DEV__ = true;
    delete global.__parceAppEmulatorInstances;
    getApps.mockReturnValue([]);
    initializeApp.mockReturnValue(app);
    getApp.mockReturnValue(app);
    initializeAuth.mockReturnValue(auth);
    getAuth.mockReturnValue(auth);
    getFirestore.mockReturnValue(firestore);
  });
  const load = () => {
    let config;
    jest.isolateModules(() => {
      config = require('../src/firebase/config');
    });
    return config;
  };
  test('initializes encrypted persistence', () => {
    expect(load().auth).toBe(auth);
    expect(getReactNativePersistence).toHaveBeenCalledWith(
      encryptedSessionStorage,
    );
    expect(initializeAuth).toHaveBeenCalledWith(app, {
      persistence: 'persistence',
    });
    expect(connectAuthEmulator).not.toHaveBeenCalled();
  });
  test('hot reload reuses current app and auth', () => {
    getApps.mockReturnValue([app]);
    initializeAuth.mockImplementation(() => {
      throw {code: 'auth/already-initialized'};
    });
    expect(load().auth).toBe(auth);
    expect(getAuth).toHaveBeenCalledWith(app);
  });
  test('unexpected initialization errors remain visible', () => {
    initializeAuth.mockImplementation(() => {
      throw new Error('broken');
    });
    expect(load).toThrow('broken');
  });
  test.each(['yes', '1', 'TRUE'])(
    'rejects ambiguous emulator flag %s',
    flag => {
      Config.FIREBASE_USE_EMULATORS = flag;
      expect(load).toThrow('must be true or false');
    },
  );
  test('demo project refuses nonemulator config', () => {
    Config.FIREBASE_PROJECT_ID = 'demo-parceapp';
    expect(load).toThrow('Demo projects require');
  });
  test('emulator refuses real project or release build', () => {
    Config.FIREBASE_USE_EMULATORS = 'true';
    expect(load).toThrow('development build');
    Config.FIREBASE_PROJECT_ID = 'demo-parceapp';
    global.__DEV__ = false;
    expect(load).toThrow('development build');
  });
  test('environment switch requires app restart', () => {
    app.options.projectId = 'other';
    expect(load).toThrow('restart and rebuild');
  });
  test('demo development connects local auth/firestore once per instance', () => {
    Config.FIREBASE_PROJECT_ID = 'demo-parceapp';
    Config.FIREBASE_USE_EMULATORS = 'true';
    app.options.projectId = 'demo-parceapp';
    const original = Platform.OS;
    Platform.OS = 'ios';
    try {
      load();
      load();
      expect(connectAuthEmulator).toHaveBeenCalledTimes(1);
      expect(connectAuthEmulator).toHaveBeenCalledWith(
        auth,
        'http://127.0.0.1:9099',
        {disableWarnings: true},
      );
      expect(connectFirestoreEmulator).toHaveBeenCalledWith(
        firestore,
        '127.0.0.1',
        8080,
      );
    } finally {
      Platform.OS = original;
    }
  });
});
