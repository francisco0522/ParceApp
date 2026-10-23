import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, TextInput, TouchableOpacity, Alert, FlatList} from 'react-native';
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('react-native-date-picker', () => 'MockDatePicker');
jest.mock('../src/screens/Footer/Footer', () => () => null);
jest.mock('../src/services/activities', () => ({
  isActivityAdministrator: jest.fn(),
  createEvent: jest.fn(),
  reserveActivity: jest.fn(),
}));
jest.mock('../src/thunks/eventosThunks', () => ({
  fetchEventos: jest.fn(() => ({type: 'mock-fetch'})),
}));
import {useSelector} from 'react-redux';
import {
  isActivityAdministrator,
  createEvent,
  reserveActivity,
} from '../src/services/activities';
import OtrosEventosScreen from '../src/screens/OtrosEventosScreen/OtrosEventosScreen';
const event = {
  id: 'event-1',
  title: 'Museo',
  city: 'cali',
  status: 'open',
  startsAt: '2099-01-01T00:00:00.000Z',
  participantCount: 0,
  capacity: 2,
};
describe('admin events and independent reservation outcomes', () => {
  let tree, state, alert, navigation;
  beforeEach(() => {
    jest.clearAllMocks();
    state = {
      user: {id: 'user-1', name: 'Persona ficticia'},
      eventos: {list: [event], loading: false, error: null},
    };
    useSelector.mockImplementation(selector => selector(state));
    isActivityAdministrator.mockResolvedValue(true);
    createEvent.mockResolvedValue('new-event');
    reserveActivity.mockResolvedValue(undefined);
    navigation = {navigate: jest.fn(), addListener: jest.fn(() => jest.fn())};
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    alert.mockRestore();
  });
  async function render() {
    await act(async () => {
      tree = renderer.create(<OtrosEventosScreen navigation={navigation} />);
    });
  }
  function button(label) {
    return tree.root
      .findAllByType(TouchableOpacity)
      .filter(node =>
        node
          .findAllByType(Text)
          .some(
            text =>
              (Array.isArray(text.props.children)
                ? text.props.children.join('')
                : text.props.children) === label,
          ),
      )
      .at(-1);
  }
  test('ordinary users cannot access creation action', async () => {
    isActivityAdministrator.mockResolvedValue(false);
    await render();
    expect(button('Crear nuevo evento')).toBeUndefined();
  });
  test('admin list and loading state render', async () => {
    state.eventos.loading = true;
    await render();
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => node.props.children === 'Cargando eventos…'),
    ).toBe(true);
    expect(button('Crear nuevo evento')).toBeDefined();
  });
  test('create requires title direction and city', async () => {
    await render();
    act(() => button('Crear nuevo evento').props.onPress());
    await act(async () => button('Crear evento').props.onPress());
    expect(createEvent).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Revisa el evento',
      'Completa título, ciudad y dirección.',
    );
  });
  function fillCreate(capacity = '2') {
    act(() => button('Crear nuevo evento').props.onPress());
    act(() => {
      button('Cali (UTC-05:00)').props.onPress();
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.placeholder === 'Título del evento')
        .props.onChangeText('Café');
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.placeholder === 'Dirección')
        .props.onChangeText('Centro');
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.accessibilityLabel === 'Capacidad')
        .props.onChangeText(capacity);
      const pickers = tree.root.findAllByType('MockDatePicker');
      pickers[0].props.onConfirm(new Date(2099, 0, 1));
      pickers[1].props.onConfirm(new Date(2099, 0, 1, 19, 0));
    });
  }
  test.each([
    ['2', 2],
    ['', null],
    ['0', null],
  ])(
    'create uses chosen city datetime and capacity %s',
    async (input, capacity) => {
      await render();
      fillCreate(input);
      await act(async () => button('Crear evento').props.onPress());
      expect(createEvent).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          title: 'Café',
          direction: 'Centro',
          city: 'cali',
          startsAt: '2099-01-02T00:00:00.000Z',
          capacity,
        }),
      );
      expect(alert.mock.calls.at(-1)[0]).toBe('Evento creado');
    },
  );
  test.each(['-1', '2.5', '10001'])(
    'invalid capacity rejected before service %s',
    async input => {
      await render();
      fillCreate(input);
      await act(async () => button('Crear evento').props.onPress());
      expect(createEvent).not.toHaveBeenCalled();
    },
  );
  function selectEvent(item = event) {
    const list = tree.root.findByType(FlatList);
    let card;
    act(() => {
      card = renderer.create(list.props.renderItem({item}));
    });
    act(() => card.root.findAllByType(TouchableOpacity)[0].props.onPress());
    act(() => card.unmount());
  }
  test('reserve delegates exact ID and removes fulfilled target', async () => {
    await render();
    selectEvent();
    await act(async () => button('Reservar (1)').props.onPress());
    expect(reserveActivity).toHaveBeenCalledWith('user-1', 'event-1');
    expect(alert.mock.calls.at(-1)[0]).toBe('Resultado de reservas');
    expect(button('Reservar (1)')).toBeUndefined();
  });
  test('partial results retry only failed event, treating existing membership as achieved', async () => {
    const second = {...event, id: 'event-2', title: 'Teatro'};
    state.eventos.list = [event, second];
    reserveActivity
      .mockRejectedValueOnce(new Error('ALREADY_REGISTERED'))
      .mockRejectedValueOnce(new Error('EVENT_FULL'))
      .mockResolvedValueOnce(undefined);
    await render();
    selectEvent();
    selectEvent(second);
    await act(async () => button('Reservar (2)').props.onPress());
    expect(button('Reintentar pendientes (1)')).toBeDefined();
    await act(async () => button('Reintentar pendientes (1)').props.onPress());
    expect(reserveActivity.mock.calls.map(call => call[1])).toEqual([
      'event-1',
      'event-2',
      'event-2',
    ]);
  });
  test('past/cancelled events excluded', async () => {
    state.eventos.list = [
      event,
      {...event, id: 'past', startsAt: '2000-01-01'},
      {...event, id: 'closed', status: 'cancelled'},
    ];
    await render();
    expect(
      tree.root.findByType(FlatList).props.data.map(item => item.id),
    ).toEqual(['event-1']);
  });
});
