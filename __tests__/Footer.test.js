import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TouchableOpacity, Alert} from 'react-native';
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({useDispatch: () => mockDispatch}));
jest.mock('../src/services/session', () => ({
  logout: jest.fn(),
  sessionError: () => 'Error de sesión',
}));
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1'}},
}));
import {logout} from '../src/services/session';
import {auth} from '../src/firebase/config';
import Footer from '../src/screens/Footer/Footer';
describe('footer navigation and logout', () => {
  let tree, navigation, alert;
  beforeEach(() => {
    jest.clearAllMocks();
    navigation = {navigate: jest.fn(), reset: jest.fn()};
    auth.currentUser = {uid: 'user-1'};
    logout.mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    act(() => {
      tree = renderer.create(<Footer navigation={navigation} />);
    });
  });
  afterEach(() => {
    act(() => tree.unmount());
    alert.mockRestore();
  });
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(
        node => node.findAll(child => child.props.children === label).length,
      );
  test.each([
    ['Home', 'HomeScreen'],
    ['Mis Reservas', 'MyAgendaScreen'],
    ['Mi perfil', 'ProfileScreen'],
  ])('opens %s', (label, route) => {
    act(() => button(label).props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(route);
  });
  test('signout clears both slices and resets navigation', async () => {
    await act(async () => button('Salir').props.onPress());
    expect(mockDispatch.mock.calls.map(call => call[0].type)).toEqual([
      'user/clearUser',
      'eventos/clearEventos',
    ]);
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'LoginScreen'}],
    });
  });
  test('cleanup failure after signout still clears navigation and slices', async () => {
    logout.mockImplementation(async () => {
      auth.currentUser = null;
      throw new Error('storage');
    });
    await act(async () => button('Salir').props.onPress());
    expect(navigation.reset).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(alert).toHaveBeenCalled();
  });
  test('failed signout retains current state and allows retry', async () => {
    logout.mockRejectedValue(new Error('network'));
    await act(async () => button('Salir').props.onPress());
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();
    expect(button('Salir').props.disabled).toBe(false);
  });
  test('suppresses duplicate submissions', async () => {
    let resolve;
    logout.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    let pending;
    act(() => {
      const press = button('Salir').props.onPress;
      pending = press();
      press();
    });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(button('Salir').props.disabled).toBe(true);
    await act(async () => {
      resolve();
      await pending;
    });
  });
});
