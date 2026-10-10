jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((db, c, id) => `${c}/${id}`),
  getFirestore: jest.fn(() => 'db'),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
}));
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1'}},
  firebaseApp: 'app',
}));
import {auth} from '../src/firebase/config';
import {getDoc, getDocs, updateDoc} from 'firebase/firestore';
import {
  validateQuestions,
  questionError,
  validateAnswers,
  fetchProfileForm,
  saveProfileAnswers,
  profileDate,
  profileError,
} from '../src/services/profile';
const single = {
  key: 'food',
  question: '¿Comida?',
  type: 'single',
  options: [
    {label: 'Uno', value: 'one'},
    {label: 'Dos', value: 'two'},
  ],
};
const boolean = {key: 'social', question: '¿Social?', type: 'boolean'};
const multi = {...single, key: 'languages', type: 'multi', maxSelections: 1};
describe('profile validation and persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = {uid: 'user-1'};
    getDocs.mockResolvedValue({docs: [{id: 'one', data: () => single}]});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        profileAnswers: {food: 'one', legacy: 'preserved'},
        profileCompleted: true,
      }),
    });
    updateDoc.mockResolvedValue(undefined);
  });
  afterEach(() => jest.useRealTimers());
  test('sorts questions without mutating input', () => {
    const input = [
      {...single, order: 2},
      {...boolean, order: 1},
    ];
    expect(validateQuestions(input)[0].key).toBe('social');
    expect(input[0].key).toBe('food');
  });
  test.each([
    [],
    null,
    [{...single, key: '__proto__'}],
    [single, single],
    [{...single, type: 'text'}],
    [{...single, options: []}],
    [
      {
        ...single,
        options: [
          {label: 'A', value: 'one'},
          {label: 'B', value: 'one'},
        ],
      },
    ],
    [{...multi, maxSelections: 0}],
    [{...single, required: 'yes'}],
  ])('rejects malformed form', questions => {
    expect(() => validateQuestions(questions)).toThrow('INVALID_FORM');
  });
  test('false is a valid boolean answer and missing required fields fail', () => {
    expect(questionError(boolean, false)).toBeNull();
    expect(questionError(boolean, undefined)).toBeTruthy();
    expect(questionError({...boolean, required: false}, undefined)).toBeNull();
    expect(questionError(boolean, 'false')).toBeTruthy();
  });
  test.each([
    ['one', null],
    ['obsolete', 'Selecciona una opción vigente.'],
  ])('single options validate', (value, error) => {
    expect(questionError(single, value)).toBe(error);
  });
  test.each([['one', 'one'], ['one', 'two'], ['obsolete'], 'one'])(
    'invalid multi choices rejected',
    value => {
      expect(questionError(multi, value)).toBeTruthy();
    },
  );
  test('validates all answers and exposes invalid question index', () => {
    expect(() =>
      validateAnswers([single, boolean], {
        food: 'one',
        social: false,
        legacy: 42,
      }),
    ).not.toThrow();
    try {
      validateAnswers([single, boolean], {food: 'one'});
    } catch (error) {
      expect(error.questionIndex).toBe(1);
    }
    expect(() => validateAnswers([single], [])).toThrow('INVALID_ANSWERS');
  });
  test('restores existing answers including unknown keys', async () => {
    expect(await fetchProfileForm('user-1')).toMatchObject({
      answers: {food: 'one', legacy: 'preserved'},
      profileCompleted: true,
    });
  });
  test('persists last answer false and preserved unknown keys', async () => {
    await saveProfileAnswers('user-1', [boolean], {
      social: false,
      legacy: 'preserved',
    });
    expect(updateDoc).toHaveBeenCalledWith(
      'users/user-1',
      expect.objectContaining({
        profileAnswers: {social: false, legacy: 'preserved'},
        profileCompleted: true,
        updatedAt: expect.any(String),
      }),
    );
  });
  test('invalid answers are never written', async () => {
    await expect(
      saveProfileAnswers('user-1', [single], {food: 'obsolete'}),
    ).rejects.toThrow('INVALID_ANSWERS');
    expect(updateDoc).not.toHaveBeenCalled();
  });
  test('missing profile rejects', async () => {
    getDoc.mockResolvedValue({exists: () => false});
    await expect(fetchProfileForm('user-1')).rejects.toThrow('PROFILE_MISSING');
  });
  test('session changes after network reads reject', async () => {
    getDoc.mockImplementation(async () => {
      auth.currentUser = {uid: 'other'};
      return {exists: () => true, data: () => ({})};
    });
    await expect(fetchProfileForm('user-1')).rejects.toThrow('SESSION_CHANGED');
  });
  test('session changes after save reject', async () => {
    updateDoc.mockImplementation(async () => {
      auth.currentUser = null;
    });
    await expect(
      saveProfileAnswers('user-1', [boolean], {social: false}),
    ).rejects.toThrow('SESSION_CHANGED');
  });
  test('timeout rejects and ignores later completion', async () => {
    jest.useFakeTimers();
    let resolve;
    updateDoc.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    const result = saveProfileAnswers('user-1', [boolean], {social: false});
    const captured = result.catch(error => error);
    await jest.advanceTimersByTimeAsync(20000);
    expect((await captured).message).toBe('PROFILE_TIMEOUT');
    resolve();
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(0);
  });
  test('handles all stored date formats', () => {
    const iso = '1990-01-02T00:00:00.000Z';
    [
      iso,
      new Date(iso),
      {toDate: () => new Date(iso)},
      {seconds: new Date(iso).getTime() / 1000},
    ].forEach(value => expect(profileDate(value).toISOString()).toBe(iso));
    expect(profileDate(null)).toBeNull();
    expect(profileDate('bad')).toBeNull();
  });
  test.each([
    'PROFILE_TIMEOUT',
    'INVALID_FORM',
    'INVALID_ANSWERS',
    'PROFILE_MISSING',
    'SESSION_CHANGED',
    'other',
  ])('explains %s', message =>
    expect(profileError({message})).toEqual(expect.any(String)),
  );
});
