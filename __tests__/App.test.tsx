import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Provider} from 'react-redux';
import {setUser} from '../src/slices/userSlice';
import {setEventos} from '../src/slices/eventosSlice';
let mockRoute = 'HomeScreen';
const mockNavigation = {reset: jest.fn()};
jest.mock('react-native-gesture-handler', () => ({}));
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: any) => children,
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({children}: any) => children,
    Screen: ({name, component: Component}: any) =>
      name === mockRoute ? <Component navigation={mockNavigation} /> : null,
  }),
}));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));
jest.mock('../src/firebase/config', () => ({auth: {currentUser: null}}));
jest.mock('../src/screens/index.js', () => {
  const mockReact = require('react');
  const screen = () => mockReact.createElement('MockPublicScreen');
  return {
    LoginScreen: screen,
    RegistrationScreen: screen,
    SplashScreen: screen,
    ProfileCreationScreen: screen,
    ProfileScreen: screen,
    HomeScreen: () => mockReact.createElement('MockHome'),
    Footer: screen,
    MiercolesCenaScreen: screen,
    OtrosEventosScreen: screen,
    MyAgendaScreen: screen,
  };
});
import {auth} from '../src/firebase/config';
import {onAuthStateChanged} from 'firebase/auth';
jest.mock(
  '../src/screens/ActivityDetailScreen/ActivityDetailScreen',
  () => () => require('react').createElement('MockProtectedRoute'),
);
import App from '../App';
describe('App integrated Redux session guard with mocked navigator', () => {
  let tree: renderer.ReactTestRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = 'HomeScreen';
    auth.currentUser = null;
    act(() => {
      tree = renderer.create(<App />);
    });
    act(() => {
      (onAuthStateChanged as jest.Mock).mock.calls[0][1](null);
    });
  });
  afterEach(() => act(() => tree.unmount()));
  test('signed out users cannot render protected home', () => {
    expect(tree.root.findAllByType('MockHome' as any)).toHaveLength(0);
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'SplashScreen'}],
    });
  });
  test('UID mismatch denies protected screen; matching UID grants access', () => {
    auth.currentUser = {uid: 'auth-user'};
    act(() =>
      tree.root
        .findByType(Provider)
        .props.store.dispatch(setUser({id: 'other'})),
    );
    expect(tree.root.findAllByType('MockHome' as any)).toHaveLength(0);
    act(() =>
      tree.root
        .findByType(Provider)
        .props.store.dispatch(setUser({id: 'auth-user'})),
    );
    expect(tree.root.findAllByType('MockHome' as any)).toHaveLength(1);
  });
  test('auth signout callback clears user and event slices then denies home', () => {
    auth.currentUser = {uid: 'auth-user'};
    const store = tree.root.findByType(Provider).props.store;
    act(() => {
      store.dispatch(setUser({id: 'auth-user'}));
      store.dispatch(setEventos([{id: 'event'}]));
    });
    expect(tree.root.findAllByType('MockHome' as any)).toHaveLength(1);
    auth.currentUser = null;
    act(() => {
      (onAuthStateChanged as jest.Mock).mock.calls[0][1](null);
    });
    expect(store.getState().user.id).toBeNull();
    expect(store.getState().eventos.list).toEqual([]);
    expect(tree.root.findAllByType('MockHome' as any)).toHaveLength(0);
  });
  test('public login renders without authentication', () => {
    mockRoute = 'LoginScreen';
    act(() => tree.update(<App />));
    expect(tree.root.findAllByType('MockPublicScreen' as any)).toHaveLength(1);
  });
  test('unmount removes auth listener', () => {
    const unsubscribe = (onAuthStateChanged as jest.Mock).mock.results[0].value;
    act(() => tree.unmount());
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  test.each([
    'ActivityDetailScreen',
  ])('new route %s is protected by exact UID', route => {
    mockRoute = route;
    act(() => tree.update(<App />));
    expect(tree.root.findAllByType('MockProtectedRoute' as any)).toHaveLength(
      0,
    );
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'SplashScreen'}],
    });
    auth.currentUser = {uid: 'auth-user'};
    act(() =>
      tree.root
        .findByType(Provider)
        .props.store.dispatch(setUser({id: 'auth-user'})),
    );
    expect(tree.root.findAllByType('MockProtectedRoute' as any)).toHaveLength(
      1,
    );
  });
});
