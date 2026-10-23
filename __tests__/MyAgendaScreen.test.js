import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, FlatList, TouchableOpacity} from 'react-native';
jest.mock('react-redux', () => ({useSelector: jest.fn()}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('react-native-paper', () => ({Avatar: {Text: 'MockAvatar'}}));
jest.mock('../src/screens/Footer/Footer', () => () => null);
jest.mock('../src/services/activities', () => ({
  watchUserActivities: jest.fn(),
}));
import {useSelector} from 'react-redux';
import {watchUserActivities} from '../src/services/activities';
import MyAgendaScreen from '../src/screens/MyAgendaScreen/MyAgendaScreen';
describe('canonical agenda', () => {
  let tree, unsubscribe;
  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribe = jest.fn();
    useSelector.mockImplementation(selector =>
      selector({user: {id: 'user-1', name: 'Persona ficticia'}}),
    );
    watchUserActivities.mockImplementation((uid, callback) => {
      callback([]);
      return unsubscribe;
    });
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
  });
  function render() {
    act(() => {
      tree = renderer.create(
        <MyAgendaScreen navigation={{navigate: jest.fn()}} />,
      );
    });
  }
  test('subscribes with Redux id and shows empty results', () => {
    render();
    expect(watchUserActivities).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
    expect(
      tree.root
        .findAllByType(Text)
        .some(node =>
          String(node.props.children).includes('Aún no tienes próximas'),
        ),
    ).toBe(true);
  });
  test('unsubscribes', () => {
    render();
    act(() => tree.unmount());
    tree = null;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  test('displays canonical reservation id and membership count', () => {
    watchUserActivities.mockImplementation((uid, callback) => {
      callback([
        {
          id: 'activity-1',
          title: 'Museo',
          kind: 'event',
          startsAt: '2099-01-01T00:00:00.000Z',
          city: 'cali',
          status: 'open',
          participantCount: 1,
          capacity: null,
        },
      ]);
      return unsubscribe;
    });
    render();
    expect(tree.root.findByType(FlatList).props.data[0].id).toBe('activity-1');
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => node.props.children === 'Museo'),
    ).toBe(true);
  });
  test('error offers retry and resubscribes', () => {
    watchUserActivities.mockImplementation((uid, callback, failure) => {
      failure(new Error('offline'));
      return unsubscribe;
    });
    render();
    act(() =>
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node =>
          node
            .findAllByType(Text)
            .some(text => String(text.props.children).includes('Reintentar')),
        )
        .props.onPress(),
    );
    expect(watchUserActivities).toHaveBeenCalledTimes(2);
  });
  test('missing session stops loading without subscribing', () => {
    useSelector.mockImplementation(selector =>
      selector({user: {id: null, name: null}}),
    );
    render();
    expect(watchUserActivities).not.toHaveBeenCalled();
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => String(node.props.children).includes('Cargando')),
    ).toBe(false);
  });
  test('agenda separates upcoming and past reservations', () => {
    const future = {
      id: 'future',
      title: 'Museo',
      kind: 'event',
      city: 'cali',
      startsAt: '2099-01-01',
      participantCount: 1,
      capacity: 2,
      status: 'open',
    };
    const past = {...future, id: 'past', startsAt: '2000-01-01'};
    watchUserActivities.mockImplementation((uid, callback) => {
      callback([future, past]);
      return unsubscribe;
    });
    render();
    expect(
      tree.root.findByType(FlatList).props.data.map(item => item.id),
    ).toEqual(['future']);
    const target = tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => String(text.props.children).includes('Pasadas')),
      );
    act(() => target.props.onPress());
    expect(
      tree.root.findByType(FlatList).props.data.map(item => item.id),
    ).toEqual(['past']);
  });
});
