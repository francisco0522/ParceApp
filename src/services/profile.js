import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  updateDoc,
} from 'firebase/firestore';
import {auth, firebaseApp} from '../firebase/config';

const db = getFirestore(firebaseApp);
const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isOptionValue = value =>
  typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value));

export function validateQuestions(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw new Error('INVALID_FORM');
  }
  const keys = new Set();
  for (const question of items) {
    if (
      !isRecord(question) ||
      typeof question.key !== 'string' ||
      !question.key.trim() ||
      ['__proto__', 'constructor', 'prototype'].includes(question.key) ||
      keys.has(question.key) ||
      typeof question.question !== 'string' ||
      !question.question.trim() ||
      !['single', 'multi', 'boolean'].includes(question.type) ||
      (question.required !== undefined &&
        typeof question.required !== 'boolean')
    ) {
      throw new Error('INVALID_FORM');
    }
    keys.add(question.key);
    if (question.type !== 'boolean') {
      if (
        !Array.isArray(question.options) ||
        !question.options.length ||
        question.options.length > 100 ||
        question.options.some(
          option =>
            !isRecord(option) ||
            typeof option.label !== 'string' ||
            !isOptionValue(option.value),
        ) ||
        new Set(question.options.map(option => option.value)).size !==
          question.options.length
      ) {
        throw new Error('INVALID_FORM');
      }
    }
    if (
      question.type === 'multi' &&
      question.maxSelections !== undefined &&
      (!Number.isInteger(question.maxSelections) ||
        question.maxSelections < 1 ||
        question.maxSelections > question.options.length)
    ) {
      throw new Error('INVALID_FORM');
    }
  }
  return [...items].sort(
    (a, b) =>
      (Number.isFinite(a.order) ? a.order : 0) -
      (Number.isFinite(b.order) ? b.order : 0),
  );
}

export function questionError(question, value) {
  const missing =
    value === undefined ||
    value === null ||
    (Array.isArray(value) && value.length === 0);
  if (missing) {
    return question.required === false
      ? null
      : 'Selecciona una respuesta para continuar.';
  }
  if (question.type === 'boolean') {
    return typeof value === 'boolean' ? null : 'Selecciona Sí o No.';
  }
  if (question.type === 'single') {
    return question.options.some(option => option.value === value)
      ? null
      : 'Selecciona una opción vigente.';
  }
  if (
    !Array.isArray(value) ||
    new Set(value).size !== value.length ||
    value.some(item => !question.options.some(option => option.value === item))
  ) {
    return 'Revisa las opciones seleccionadas.';
  }
  if (value.length > (question.maxSelections ?? question.options.length)) {
    return `Selecciona máximo ${question.maxSelections} opciones.`;
  }
  return null;
}

export function validateAnswers(questions, answers) {
  validateQuestions(questions);
  if (!isRecord(answers)) {
    throw new Error('INVALID_ANSWERS');
  }
  const index = questions.findIndex(question =>
    questionError(question, answers[question.key]),
  );
  if (index >= 0) {
    throw Object.assign(new Error('INVALID_ANSWERS'), {questionIndex: index});
  }
}

function assertSession(uid) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('SESSION_CHANGED');
  }
}
async function withTimeout(operation) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 20000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function fetchProfileForm(uid) {
  assertSession(uid);
  const [form, profile] = await withTimeout(
    Promise.all([
      getDocs(collection(db, 'formularioPerfil')),
      getDoc(doc(db, 'users', uid)),
    ]),
  );
  assertSession(uid);
  if (!profile.exists()) {
    throw new Error('PROFILE_MISSING');
  }
  const questions = validateQuestions(
    form.docs.map(snapshot => ({...snapshot.data(), id: snapshot.id})),
  );
  const data = profile.data();
  const answers = data.profileAnswers ?? {};
  if (!isRecord(answers)) {
    throw new Error('INVALID_ANSWERS');
  }
  return {questions, answers, profileCompleted: data.profileCompleted === true};
}
export async function saveProfileAnswers(uid, questions, answers) {
  assertSession(uid);
  validateAnswers(questions, answers);
  await withTimeout(
    updateDoc(doc(db, 'users', uid), {
      profileAnswers: answers,
      profileCompleted: true,
      updatedAt: new Date().toISOString(),
    }),
  );
  assertSession(uid);
}
export function profileDate(value) {
  if (value == null) {
    return null;
  }
  const date =
    value instanceof Date
      ? value
      : typeof value.toDate === 'function'
        ? value.toDate()
        : typeof value.seconds === 'number'
          ? new Date(value.seconds * 1000)
          : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function profileError(error) {
  if (error.message === 'PROFILE_TIMEOUT') {
    return 'No pudimos confirmar el resultado a tiempo. Revisa tu conexión y reintenta; los cambios pueden haberse guardado.';
  }
  if (error.message === 'INVALID_FORM') {
    return 'El cuestionario no está disponible o tiene opciones inválidas. Reintenta o contacta al equipo.';
  }
  if (error.message === 'INVALID_ANSWERS') {
    return 'Revisa las respuestas del cuestionario antes de guardar.';
  }
  if (error.message === 'PROFILE_MISSING') {
    return 'No encontramos tu perfil. Contacta al equipo para revisar tu cuenta.';
  }
  if (error.message === 'SESSION_CHANGED') {
    return 'La sesión cambió. Vuelve a iniciar sesión.';
  }
  if (error.code === 'permission-denied') {
    return 'No tienes permiso para acceder al perfil. Reintenta o contacta al equipo.';
  }
  return 'No pudimos cargar o guardar tu perfil. Revisa la conexión y reintenta.';
}
