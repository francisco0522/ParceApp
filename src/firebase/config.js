import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import {encryptedSessionStorage} from '../services/sessionStorage';
import Config from 'react-native-config';
import {Platform} from 'react-native';
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Config.FIREBASE_API_KEY,
  authDomain: Config.FIREBASE_AUTH_DOMAIN,
  projectId: Config.FIREBASE_PROJECT_ID,
  storageBucket: Config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID,
  appId: Config.FIREBASE_APP_ID,
  measurementId: Config.FIREBASE_MEASUREMENT_ID,
};

const emulatorFlag = Config.FIREBASE_USE_EMULATORS;
if (emulatorFlag && !['true', 'false'].includes(emulatorFlag)) {
  throw new Error('FIREBASE_USE_EMULATORS must be true or false');
}
const useEmulators = emulatorFlag === 'true';
if (
  useEmulators &&
  (!__DEV__ || firebaseConfig.projectId !== 'demo-parceapp')
) {
  throw new Error(
    'Emulators require a development build and project demo-parceapp',
  );
}
if (!useEmulators && firebaseConfig.projectId?.startsWith('demo-')) {
  throw new Error('Demo projects require FIREBASE_USE_EMULATORS=true');
}
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

if (firebaseApp.options.projectId !== firebaseConfig.projectId) {
  throw new Error(
    'Firebase environment changed: restart and rebuild the application',
  );
}

let auth;
try {
  auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(encryptedSessionStorage),
  });
} catch (error) {
  if (error.code !== 'auth/already-initialized') {
    throw error;
  }
  auth = getAuth(firebaseApp);
}

if (useEmulators) {
  const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  // Preserve object identity through Fast Refresh; connect each SDK instance once.
  const attached = global.__parceAppEmulatorInstances || new WeakSet();
  global.__parceAppEmulatorInstances = attached;
  if (!attached.has(auth)) {
    connectAuthEmulator(auth, `http://${host}:9099`, {disableWarnings: true});
    attached.add(auth);
  }
  const firestore = getFirestore(firebaseApp);
  if (!attached.has(firestore)) {
    connectFirestoreEmulator(firestore, host, 8080);
    attached.add(firestore);
  }
}

export {firebaseApp, auth};
