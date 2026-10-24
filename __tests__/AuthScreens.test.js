import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TextInput, TouchableOpacity, Alert, Button, Text} from 'react-native';
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({useDispatch: () => mockDispatch}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('react-native-date-picker', () => 'MockDatePicker');
jest.mock('react-native-element-dropdown', () => ({Dropdown: 'MockDropdown'}));
jest.mock('../src/utils/CameraScanner', () => 'MockScanner');
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1'}, authStateReady: jest.fn()},
}));
jest.mock('../src/services/session', () => ({
  login: jest.fn(),
  register: jest.fn(),
  clearLegacySession: jest.fn(),
  loadSessionProfile: jest.fn(),
  resetToSession: jest.fn((navigation, profile) =>
    navigation.reset({
      index: 0,
      routes: [
        {
          name: profile.profileCompleted
            ? 'HomeScreen'
            : 'ProfileCreationScreen',
        },
      ],
    }),
  ),
  logout: jest.fn(),
  sessionError: () => 'Reintenta la sesión',
}));
import {auth} from '../src/firebase/config';
import {
  login,
  register,
  clearLegacySession,
  loadSessionProfile,
  resetToSession,
  logout,
} from '../src/services/session';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import RegistrationScreen from '../src/screens/RegistrationScreen/RegistrationScreen';
import SplashScreen from '../src/screens/SplashScreen/SplashScreen';
const profile = {
  id: 'user-1',
  name: 'Persona ficticia',
  profileCompleted: false,
};
describe('account screen flows', () => {
  let tree, navigation, alert;
  beforeEach(() => {
    jest.clearAllMocks();
    navigation = {navigate: jest.fn(), reset: jest.fn()};
    auth.currentUser = {uid: 'user-1'};
    auth.authStateReady.mockResolvedValue(undefined);
    login.mockResolvedValue(profile);
    register.mockResolvedValue(profile);
    loadSessionProfile.mockResolvedValue(profile);
    clearLegacySession.mockResolvedValue(undefined);
    logout.mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    alert.mockRestore();
  });
  async function render(Screen) {
    await act(async () => {
      tree = renderer.create(<Screen navigation={navigation} />);
    });
  }
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(
        node => node.findAll(child => child.props.children === label).length,
      );
  const fill = (placeholder, value) =>
    act(() =>
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.placeholder === placeholder)
        .props.onChangeText(value),
    );
  test('login validates missing credentials', async () => {
    await render(LoginScreen);
    await act(async () => button('Iniciar Sesión').props.onPress());
    expect(login).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Error',
      'Ingresa tu correo y contraseña',
    );
  });
  test.each([false, true])(
    'login stores profile and resets to completion route %s',
    async completed => {
      login.mockResolvedValue({...profile, profileCompleted: completed});
      await render(LoginScreen);
      fill('Correo Electronico', 'synthetic@example.test');
      fill('Contraseña', 'password1');
      await act(async () => button('Iniciar Sesión').props.onPress());
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user/setUser',
          payload: expect.objectContaining({id: 'user-1'}),
        }),
      );
      expect(navigation.reset.mock.calls[0][0].routes[0].name).toBe(
        completed ? 'HomeScreen' : 'ProfileCreationScreen',
      );
    },
  );
  test('login error retains form for retry', async () => {
    login.mockRejectedValue(new Error('offline'));
    await render(LoginScreen);
    fill('Correo Electronico', 'synthetic@example.test');
    fill('Contraseña', 'password1');
    await act(async () => button('Iniciar Sesión').props.onPress());
    expect(alert).toHaveBeenCalled();
    expect(button('Iniciar Sesión').props.disabled).toBe(false);
    expect(navigation.reset).not.toHaveBeenCalled();
  });
  test('login duplicate callbacks submit only once', async () => {
    let resolve;
    login.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await render(LoginScreen);
    fill('Correo Electronico', 'synthetic@example.test');
    fill('Contraseña', 'password1');
    let pending;
    act(() => {
      const press = button('Iniciar Sesión').props.onPress;
      pending = press();
      press();
    });
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(profile);
      await pending;
    });
  });
  test('registration requires fields', async () => {
    await render(RegistrationScreen);
    await act(async () => button('Crear cuenta').props.onPress());
    expect(register).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
  });
  function fillRegistration(
    password = 'password1',
    email = 'synthetic@example.test',
    date = new Date(1990, 0, 2),
  ) {
    act(() => {
      const inputs = tree.root.findAllByType(TextInput);
      inputs[0].props.onChangeText('Persona ficticia');
      inputs[1].props.onChangeText(email);
      inputs[2].props.onChangeText(password);
      tree.root.findByType('MockDatePicker').props.onConfirm(date);
    });
  }
  test('registration submits manual adult data and routes incomplete profile', async () => {
    await render(RegistrationScreen);
    fillRegistration();
    await act(async () => button('Crear cuenta').props.onPress());
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Persona ficticia',
        email: 'synthetic@example.test',
        password: 'password1',
        birthDate: expect.any(Date),
      }),
    );
    expect(navigation.reset.mock.calls[0][0].routes[0].name).toBe(
      'ProfileCreationScreen',
    );
  });
  test.each(['short1', 'password', '12345678'])(
    'registration rejects password %s',
    async password => {
      await render(RegistrationScreen);
      fillRegistration(password);
      await act(async () => button('Crear cuenta').props.onPress());
      expect(register).not.toHaveBeenCalled();
      expect(alert.mock.calls[0][0]).toBe('Contraseña insegura');
    },
  );
  test.each([
    ['bad', new Date(1990, 0, 2)],
    ['synthetic@example.test', new Date()],
    ['synthetic@example.test', new Date('bad')],
  ])(
    'registration rejects invalid email or underage date',
    async (email, date) => {
      await render(RegistrationScreen);
      fillRegistration('password1', email, date);
      await act(async () => button('Crear cuenta').props.onPress());
      expect(register).not.toHaveBeenCalled();
    },
  );
  test('registration permits retry after service failure', async () => {
    register
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(profile);
    await render(RegistrationScreen);
    fillRegistration();
    await act(async () => button('Crear cuenta').props.onPress());
    expect(navigation.reset).not.toHaveBeenCalled();
    await act(async () => button('Crear cuenta').props.onPress());
    expect(register).toHaveBeenCalledTimes(2);
    expect(navigation.reset).toHaveBeenCalled();
  });
  test('document scan fills registration without logging document data', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await render(RegistrationScreen);
      const scanButton = tree.root.findAllByType(TouchableOpacity).find(node =>
        node.findAllByType(Text).some(text => /documento|identidad/i.test(text.props.children)),
      );
      act(() => scanButton.props.onPress());
      act(() => tree.root.findByType('MockScanner').props.onScan({
        fullName: 'PERSONA FICTICIA', year: '2000', month: '02', day: '29', gender: '', idNumber: '12345678',
      }));
      expect(tree.root.findAllByType(TextInput).some(node => node.props.value === 'PERSONA FICTICIA')).toBe(true);
      expect(tree.root.findByType('MockDatePicker').props.date).toEqual(new Date(2000, 1, 29));
      expect(log).not.toHaveBeenCalled();
      expect(register).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  test('splash reopens completed persisted profile', async () => {
    loadSessionProfile.mockResolvedValue({...profile, profileCompleted: true});
    await render(SplashScreen);
    expect(auth.authStateReady).toHaveBeenCalled();
    expect(loadSessionProfile).toHaveBeenCalledWith(auth.currentUser);
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'HomeScreen'}],
    });
  });
  test('splash incomplete profile reopens questionnaire', async () => {
    await render(SplashScreen);
    expect(resetToSession).toHaveBeenCalledWith(navigation, profile);
  });
  test('splash without authenticated user clears state and opens login', async () => {
    auth.currentUser = null;
    await render(SplashScreen);
    expect(mockDispatch.mock.calls.map(call => call[0].type)).toEqual([
      'user/clearUser',
      'eventos/clearEventos',
    ]);
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'LoginScreen'}],
    });
  });
  test('splash read failure exposes retry and logout controls', async () => {
    loadSessionProfile
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(profile);
    await render(SplashScreen);
    const retry = tree.root
      .findAllByType(Button)
      .find(node => node.props.title === 'Reintentar');
    await act(async () => retry.props.onPress());
    expect(loadSessionProfile).toHaveBeenCalledTimes(2);
    expect(navigation.reset).toHaveBeenCalled();
  });
  test('splash ignores completion after unmount', async () => {
    let resolve;
    loadSessionProfile.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await render(SplashScreen);
    act(() => tree.unmount());
    tree = null;
    await act(async () => resolve(profile));
    expect(navigation.reset).not.toHaveBeenCalled();
  });
});
