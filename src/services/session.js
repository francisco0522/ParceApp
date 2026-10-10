import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {doc, getDoc, getFirestore, setDoc} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {encryptedSessionStorage} from './sessionStorage';
import {auth, firebaseApp} from '../firebase/config';

const legacyKeys = [
  'userStatus',
  'id',
  'fullName',
  'email',
  'phone',
  'birthDate',
];
export async function clearLegacySession() {
  await Promise.all(
    legacyKeys.flatMap(key => [
      AsyncStorage.removeItem(key),
      encryptedSessionStorage.removeItem(key),
    ]),
  );
}
export function serializeDate(value) {
  if (!value) {
    return null;
  }
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export async function loadSessionProfile(user) {
  const snapshot = await getDoc(
    doc(getFirestore(firebaseApp), 'users', user.uid),
  );
  if (!snapshot.exists()) {
    throw new Error('PROFILE_MISSING');
  }
  if (auth.currentUser?.uid !== user.uid) {
    throw new Error('SESSION_CHANGED');
  }
  const data = snapshot.data();
  return {
    id: user.uid,
    name: data.fullName || null,
    email: user.email || data.emailText || null,
    phone: data.phone || null,
    birthDate: serializeDate(data.birthDate),
    profileCompleted: data.profileCompleted === true,
  };
}
export const sessionRoute = profile =>
  profile.profileCompleted ? 'HomeScreen' : 'ProfileCreationScreen';
export const resetToSession = (navigation, profile) =>
  navigation.reset({index: 0, routes: [{name: sessionRoute(profile)}]});
export async function login(email, password) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await clearLegacySession();
  return loadSessionProfile(result.user);
}
let pendingRegistrationUid = null;

export async function register({fullName, email, password, birthDate}) {
  // Retry a failed profile write without recreating the authenticated account.
  let user = auth.currentUser;
  if (
    !user ||
    user.uid !== pendingRegistrationUid ||
    user.email?.toLowerCase() !== email.trim().toLowerCase()
  ) {
    user = (await createUserWithEmailAndPassword(auth, email.trim(), password))
      .user;
    pendingRegistrationUid = user.uid;
  }
  const ref = doc(getFirestore(firebaseApp), 'users', user.uid);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      fullName: fullName.trim(),
      emailText: user.email,
      birthDate: serializeDate(birthDate),
      createdAt: new Date().toISOString(),
      profileCompleted: false,
    });
  }
  await clearLegacySession();
  const profile = await loadSessionProfile(user);
  pendingRegistrationUid = null;
  return profile;
}
export async function logout() {
  await signOut(auth);
  pendingRegistrationUid = null;
  await clearLegacySession();
}
export function sessionError(error) {
  if (error.message === 'PROFILE_MISSING') {
    return 'No encontramos el perfil de esta cuenta. Reintenta o contacta al equipo para revisar una cuenta anterior.';
  }
  if (
    error.code === 'auth/network-request-failed' ||
    error.code === 'unavailable'
  ) {
    return 'No hay conexión. Revisa tu red y vuelve a intentar.';
  }
  if (error.code === 'auth/email-already-in-use') {
    return 'No se pudo crear la cuenta con este correo. Intenta iniciar sesión.';
  }
  if (
    [
      'auth/invalid-credential',
      'auth/wrong-password',
      'auth/user-not-found',
    ].includes(error.code)
  ) {
    return 'Correo o contraseña incorrectos.';
  }
  return 'No pudimos completar la sesión. Vuelve a intentar.';
}
