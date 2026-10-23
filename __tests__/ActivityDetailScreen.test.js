import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, TouchableOpacity, Alert} from 'react-native';
jest.mock('react-redux', () => ({
  useSelector: selector => selector({user: {id: 'user-1'}}),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('../src/services/activities', () => ({
  watchActivity: jest.fn(),
  watchReservation: jest.fn(),
  reserveActivity: jest.fn(),
  cancelReservation: jest.fn(),
}));
import {
  watchActivity,
  watchReservation,
  reserveActivity,
  cancelReservation,
} from '../src/services/activities';
import ActivityDetailScreen from '../src/screens/ActivityDetailScreen/ActivityDetailScreen';
const activity = {
  id: 'activity-1',
  kind: 'event',
  title: 'Museo',
  city: 'cali',
  startsAt: '2099-01-01T00:00:00Z',
  status: 'open',
  participantCount: 0,
  capacity: 2,
  direction: 'Centro',
  description: 'Prueba',
};
describe('live activity detail and own cancellation', () => {
  let tree, alert, stopActivity, stopReservation, navigation, current, reserved;
  beforeEach(() => {
    jest.clearAllMocks();
    current = {...activity};
    reserved = false;
    stopActivity = jest.fn();
    stopReservation = jest.fn();
    watchActivity.mockImplementation((id, callback) => {
      callback(current);
      return stopActivity;
    });
    watchReservation.mockImplementation((uid, id, callback) => {
      callback(reserved);
      return stopReservation;
    });
    reserveActivity.mockResolvedValue(undefined);
    cancelReservation.mockResolvedValue(undefined);
    navigation = {goBack: jest.fn()};
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    alert.mockRestore();
    jest.useRealTimers();
  });
  function render() {
    act(() => {
      tree = renderer.create(
        <ActivityDetailScreen
          route={{params: {activityId: 'activity-1'}}}
          navigation={navigation}
        />,
      );
    });
  }
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node.findAllByType(Text).some(text => text.props.children === label),
      );
  test('unreserved future activity can be reserved using own UID and ID', async () => {
    render();
    await act(async () => button('Reservar').props.onPress());
    expect(reserveActivity).toHaveBeenCalledWith('user-1', 'activity-1');
    expect(alert.mock.calls.at(-1)[0]).toBe('Reserva confirmada');
  });
  test('own future reservation can be cancelled after confirmation', async () => {
    reserved = true;
    render();
    act(() => button('Cancelar reserva').props.onPress());
    await act(async () =>
      alert.mock.calls
        .at(-1)[2]
        .find(item => item.text === 'Cancelar reserva')
        .onPress(),
    );
    expect(cancelReservation).toHaveBeenCalledWith('user-1', 'activity-1');
    expect(alert.mock.calls.at(-1)[0]).toBe('Reserva cancelada');
  });
  test.each([
    {startsAt: '2000-01-01'},
    {status: 'cancelled'},
    {participantCount: 2},
  ])('unavailable activity hides reserve', override => {
    current = {...current, ...override};
    render();
    expect(button('Reservar')).toBeUndefined();
  });
  test('live update removes action when catalogue fills', () => {
    render();
    const receive = watchActivity.mock.calls[0][1];
    act(() => receive({...current, participantCount: 2}));
    expect(button('Reservar')).toBeUndefined();
  });
  test('failed operation remains on details and can retry', async () => {
    reserveActivity.mockRejectedValue(new Error('EVENT_FULL'));
    render();
    await act(async () => button('Reservar').props.onPress());
    expect(alert.mock.calls.at(-1)[0]).toBe('Operación no realizada');
    expect(button('Reservar').props.disabled).toBe(false);
  });
  test('both live listeners stop on unmount', () => {
    render();
    act(() => tree.unmount());
    tree = null;
    expect(stopActivity).toHaveBeenCalledTimes(1);
    expect(stopReservation).toHaveBeenCalledTimes(1);
  });
  test('missing activity shows retry state', () => {
    watchActivity.mockImplementation((id, callback, error) => {
      error(new Error('EVENT_NOT_FOUND'));
      return stopActivity;
    });
    render();
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => String(node.props.children).includes('Reintentar')),
    ).toBe(true);
  });
});
