import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
jest.mock('react-redux', () => ({
  useSelector: selector =>
    selector({user: {id: 'user-1', name: 'Persona ficticia'}}),
}));
jest.mock('react-native-gesture-handler', () => ({FlatList: 'MockList'}));
jest.mock('../src/screens/Footer/Footer', () => () => null);
jest.mock('../src/services/activities', () => ({
  watchUserActivities: jest.fn(),
}));
import {watchUserActivities} from '../src/services/activities';
import HomeScreen from '../src/screens/HomeScreen/HomeScreen';

describe('existing home', () => {
  let tree, navigation;
  beforeEach(() => {
    jest.clearAllMocks();
    navigation = {navigate: jest.fn()};
    watchUserActivities.mockImplementation((uid, callback) => {
      callback([]);
      return jest.fn();
    });
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
    }
  });
  async function render() {
    await act(async () => {
      tree = renderer.create(<HomeScreen navigation={navigation} />);
    });
  }
  function button(text) {
    return tree.root
      .findAllByType(TouchableOpacity)
      .find(
        node => node.findAll(child => child.props.children === text).length > 0,
      );
  }
  test.each([
    ['Reservar cena', 'MiercolesCenaScreen'],
    ['Otros Eventos', 'OtrosEventosScreen'],
    ['Mis Reservas', 'MyAgendaScreen'],
    ['Mi perfil', 'ProfileScreen'],
  ])('opens %s destination', async (label, route) => {
    await render();
    act(() => button(label).props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(route);
  });
  test('shows upcoming dinner for an existing reservation belonging to the current user', async () => {
    watchUserActivities.mockImplementation((uid, callback) => {
      callback([
        {
          id: 'one',
          kind: 'dinner',
          status: 'open',
          startsAt: '2099-01-01T00:00:00.000Z',
        },
      ]);
      return jest.fn();
    });
    await render();
    expect(button('Proxima cena')).toBeDefined();
    expect(button('Reservar cena')).toBeUndefined();
  });
  test('ignores reservations belonging to another user', async () => {
    watchUserActivities.mockImplementation((uid, callback) => {
      callback([
        {
          id: 'one',
          kind: 'dinner',
          status: 'completed',
          startsAt: '2000-01-01T00:00:00.000Z',
        },
      ]);
      return jest.fn();
    });
    await render();
    expect(button('Reservar cena')).toBeDefined();
  });
});
