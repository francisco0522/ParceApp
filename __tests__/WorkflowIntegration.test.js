import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TouchableOpacity, Text, FlatList} from 'react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import rootReducer from '../src/app/rooReducer';
import {setUser} from '../src/slices/userSlice';
let mockProfile;
let mockActivity;
let mockReserved = false;
const mockQuestions = [{key: 'social', question: 'Social', type: 'boolean'}];
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('react-native-paper', () => ({
  Avatar: {Text: 'MockAvatar'},
  Card: Object.assign(({children}) => children, {
    Content: ({children}) => children,
  }),
}));
jest.mock('../src/screens/Footer/Footer', () => () => null);
jest.mock('../src/firebase/config', () => ({
  auth: {
    currentUser: {uid: 'user-1', email: 'synthetic@example.test'},
    authStateReady: async () => {},
  },
  firebaseApp: 'app',
}));
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: jest.fn(),
}));
jest.mock('../src/services/sessionStorage', () => ({
  encryptedSessionStorage: {removeItem: jest.fn()},
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: () => 'db',
  collection: (db, ...parts) => ({path: parts.join('/'), type: 'collection'}),
  doc: (db, ...parts) => ({path: parts.join('/'), id: parts.at(-1)}),
  query: (...args) => args,
  where: (...args) => args,
  getDoc: async () => ({exists: () => true, data: () => mockProfile}),
  getDocs: async () => ({
    docs: mockQuestions.map((data, index) => ({
      id: String(index),
      data: () => data,
    })),
  }),
  updateDoc: jest.fn(),
  Timestamp: {
    fromDate: date => ({toDate: () => date}),
    now: () => ({toDate: () => new Date()}),
  },
  runTransaction: async (db, callback) =>
    callback({
      get: async ref =>
        ref.path.startsWith('users/')
          ? {exists: () => mockReserved}
          : {id: 'activity-1', exists: () => true, data: () => mockActivity},
      update: (ref, patch) => {
        mockActivity = {...mockActivity, ...patch};
      },
      set: () => {
        mockReserved = true;
      },
      delete: () => {
        mockReserved = false;
      },
    }),
  serverTimestamp: () => 'server-time',
  onSnapshot: (ref, callback) => {
    if (ref.type === 'collection') {
      callback({docs: mockReserved ? [{id: 'activity-1'}] : []});
    } else if (ref.path.startsWith('activityCatalog')) {
      callback({
        id: 'activity-1',
        exists: () => true,
        data: () => mockActivity,
      });
    } else if (ref.path.includes('/reservations/')) {
      callback({exists: () => mockReserved});
    } else {
      callback({exists: () => true, data: () => mockProfile});
    }
    return () => {};
  },
}));
import ProfileCreationScreen from '../src/screens/ProileCreationScreen/ProfileCreationScreen';
import ProfileScreen from '../src/screens/ProfileScreen/ProfileScreen';
import SplashScreen from '../src/screens/SplashScreen/SplashScreen';
import MyAgendaScreen from '../src/screens/MyAgendaScreen/MyAgendaScreen';
import {updateDoc} from 'firebase/firestore';
import {reserveActivity, cancelReservation} from '../src/services/activities';
describe('workflows using actual services with in-memory Firestore', () => {
  let tree, store, navigation;
  beforeEach(() => {
    updateDoc.mockImplementation(async (ref, patch) => {
      mockReserved = false;
      mockProfile = {...mockProfile, ...patch};
    });
    mockReserved = false;
    mockProfile = {
      fullName: 'Persona ficticia',
      emailText: 'synthetic@example.test',
      profileCompleted: false,
      profileAnswers: {legacy: 'preserved'},
    };
    mockActivity = {
      schemaVersion: 2,
      timeZone: 'America/Bogota',
      title: 'Museo',
      city: 'cali',
      kind: 'event',
      status: 'open',
      capacity: 2,
      participantCount: 0,
      startsAt: '2099-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    store = configureStore({reducer: rootReducer});
    store.dispatch(setUser({id: 'user-1'}));
    navigation = {reset: jest.fn(), navigate: jest.fn()};
  });
  afterEach(() => {
    jest.useRealTimers();
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
  });
  async function mount(Screen) {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    await act(async () => {
      tree = renderer.create(
        <Provider store={store}>
          <Screen navigation={navigation} />
        </Provider>,
      );
    });
  }
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(
            text =>
              (Array.isArray(text.props.children)
                ? text.props.children.join('')
                : text.props.children) === label,
          ),
      );
  test('complete profile, reopen session, display and edit preserves false and unknown answers', async () => {
    await mount(ProfileCreationScreen);
    await act(async () => button('No').props.onPress());
    expect(mockProfile).toMatchObject({
      profileCompleted: true,
      profileAnswers: {social: false, legacy: 'preserved'},
    });
    expect(store.getState().user.profileCompleted).toBe(true);
    await mount(SplashScreen);
    expect(navigation.reset).toHaveBeenLastCalledWith({
      index: 0,
      routes: [{name: 'HomeScreen'}],
    });
    expect(store.getState().user.id).toBe('user-1');
    await mount(ProfileScreen);
    act(() => button('Editar preferencias').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('ProfileCreationScreen');
    await mount(ProfileCreationScreen);
    expect(
      tree.root
        .findAllByType(TouchableOpacity)
        .filter(node => node.props.accessibilityState?.selected),
    ).toHaveLength(1);
    await act(async () => button('Sí').props.onPress());
    expect(mockProfile.profileAnswers).toEqual({
      social: true,
      legacy: 'preserved',
    });
  });
  test('profile save timeout displays retryable error; a late DB completion cannot navigate', async () => {
    jest.useFakeTimers();
    let resolve;
    updateDoc.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await mount(ProfileCreationScreen);
    let pending;
    act(() => {
      pending = button('No').props.onPress();
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20000);
      await pending;
    });
    expect(navigation.reset).not.toHaveBeenCalled();
    expect(store.getState().user.profileCompleted).toBe(false);
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => String(node.props.children).includes('a tiempo')),
    ).toBe(true);
    await act(async () => resolve());
    expect(navigation.reset).not.toHaveBeenCalled();
  });
  test('reservation membership appears in agenda under the exact same activity id', async () => {
    await reserveActivity('user-1', 'activity-1');
    expect(mockActivity.participantCount).toBe(1);
    expect(mockReserved).toBe(true);
    await mount(MyAgendaScreen);
    expect(tree.root.findByType(FlatList).props.data[0]).toMatchObject({
      id: 'activity-1',
      participantCount: 1,
    });
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => node.props.children === 'Museo'),
    ).toBe(true);
  });
  test('cancellation releases count and is absent from agenda after remount', async () => {
    await reserveActivity('user-1', 'activity-1');
    await mount(MyAgendaScreen);
    expect(tree.root.findByType(FlatList).props.data).toHaveLength(1);
    await cancelReservation('user-1', 'activity-1');
    expect(mockActivity.participantCount).toBe(0);
    expect(mockReserved).toBe(false);
    await mount(MyAgendaScreen);
    expect(tree.root.findByType(FlatList).props.data).toHaveLength(0);
  });
});
