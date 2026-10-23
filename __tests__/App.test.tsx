import React from 'react';
import renderer, {act} from 'react-test-renderer';

jest.mock('react-native-gesture-handler', () => ({}));
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: any) => children,
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({children}: any) => children,
    Screen: ({name, component: Component}: any) =>
      name === 'SplashScreen' ? <Component /> : null,
  }),
}));
jest.mock('../src/screens/index.js', () => {
  const mockReact = require('react');
  const screen = () => mockReact.createElement('MockScreen');
  return {
    LoginScreen: screen,
    RegistrationScreen: screen,
    SplashScreen: () => mockReact.createElement('MockSplashScreen'),
    ProfileCreationScreen: screen,
    ProfileScreen: screen,
    HomeScreen: screen,
    Footer: screen,
    MiercolesCenaScreen: screen,
    OtrosEventosScreen: screen,
    MyAgendaScreen: screen,
  };
});
import App from '../App';

test('app renders the initial splash route with mocked native navigation', () => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<App />);
  });
  expect(tree!.root.findAllByType('MockSplashScreen' as any)).toHaveLength(1);
  act(() => tree!.unmount());
});
