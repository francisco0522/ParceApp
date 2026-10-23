import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, TouchableOpacity, Button} from 'react-native';
jest.mock('react-redux', () => ({
  useSelector: selector => selector({user: {id: 'user-1'}}),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('react-native-paper', () => ({
  Avatar: {Text: 'MockAvatar'},
  Card: Object.assign(({children}) => children, {
    Content: ({children}) => children,
  }),
}));
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1'}},
  firebaseApp: 'app',
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));
import {onSnapshot} from 'firebase/firestore';
import {auth} from '../src/firebase/config';
import ProfileScreen from '../src/screens/ProfileScreen/ProfileScreen';
const data = {
  fullName: 'Persona ficticia',
  emailText: 'synthetic@example.test',
  birthDate: '1990-01-02T00:00:00.000Z',
  profileCompleted: true,
  profileAnswers: {
    comfortableMixedGroup: false,
    preferredLanguage: ['Español'],
    foodType: 'Vegetariana',
  },
};
describe('profile detail display', () => {
  let tree, navigation, unsubscribe;
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = {uid: 'user-1'};
    navigation = {navigate: jest.fn()};
    unsubscribe = jest.fn();
    onSnapshot.mockImplementation((ref, callback) => {
      callback({exists: () => true, data: () => data});
      return unsubscribe;
    });
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    jest.useRealTimers();
  });
  const texts = () =>
    tree.root.findAllByType(Text).map(node => node.props.children);
  function render() {
    act(() => {
      tree = renderer.create(<ProfileScreen navigation={navigation} />);
    });
  }
  test('shows real profile values, false and neutral avatar', () => {
    render();
    expect(texts()).toContain('Persona ficticia');
    expect(texts()).toContain('No');
    expect(texts()).toContain('Español');
    expect(tree.root.findByType('MockAvatar').props.label).toBe('P');
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('ProfileCreationScreen');
  });
  test('missing profile shows retry', () => {
    onSnapshot.mockImplementation((ref, callback) => {
      callback({exists: () => false});
      return unsubscribe;
    });
    render();
    expect(
      texts().some(value => String(value).includes('No encontramos')),
    ).toBe(true);
    expect(tree.root.findByType(Button).props.title).toBe('Reintentar');
  });
  test('permission denied shows retry and resubscribes', () => {
    onSnapshot.mockImplementation((ref, callback, error) => {
      error({code: 'permission-denied'});
      return unsubscribe;
    });
    render();
    act(() => tree.root.findByType(Button).props.onPress());
    expect(onSnapshot).toHaveBeenCalledTimes(2);
  });
  test('timeout stops loading and offers retry', async () => {
    jest.useFakeTimers();
    onSnapshot.mockImplementation(() => unsubscribe);
    render();
    await act(async () => jest.advanceTimersByTimeAsync(20000));
    expect(texts().some(value => String(value).includes('a tiempo'))).toBe(
      true,
    );
    expect(tree.root.findByType(Button).props.title).toBe('Reintentar');
  });
  test('UID mismatch never subscribes', () => {
    auth.currentUser = {uid: 'other'};
    render();
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(texts().some(value => String(value).includes('sesión cambió'))).toBe(
      true,
    );
  });
  test('unmount unsubscribes and ignores late snapshot', () => {
    let receive;
    onSnapshot.mockImplementation((ref, callback) => {
      receive = callback;
      return unsubscribe;
    });
    render();
    act(() => tree.unmount());
    tree = null;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(() => receive({exists: () => true, data: () => data})).not.toThrow();
  });
});
