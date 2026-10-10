import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Alert, TouchableOpacity, FlatList, Text} from 'react-native';
jest.mock('react-redux', () => ({
  useSelector: selector =>
    selector({user: {id: 'user-1', name: 'Persona ficticia'}}),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('../src/screens/Footer/Footer', () => () => null);
jest.mock('../src/services/activities', () => ({
  listDinners: jest.fn(),
  reserveActivity: jest.fn(),
}));
import {listDinners, reserveActivity} from '../src/services/activities';
import MiercolesCenaScreen from '../src/screens/MiercolesCenaScreen/MiercolesCenaScreen';
const dinner = {
  id: 'dinner-1',
  kind: 'dinner',
  title: 'Cena Cali',
  city: 'cali',
  status: 'open',
  startsAt: '2099-01-01T00:00:00.000Z',
  capacity: 6,
  participantCount: 0,
  groupId: 'group-1',
};
describe('scheduled dinner booking', () => {
  let tree, alert, navigation;
  beforeEach(() => {
    jest.clearAllMocks();
    listDinners.mockResolvedValue([
      dinner,
      {...dinner, id: 'formosa-1', city: 'formosa'},
    ]);
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
      tree = renderer.create(<MiercolesCenaScreen navigation={navigation} />);
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
  function select() {
    act(() => button('Cali').props.onPress());
    let card;
    act(() => {
      const list = tree.root.findByType(FlatList);
      card = renderer.create(list.props.renderItem({item: list.props.data[0]}));
    });
    act(() => card.root.findAllByType(TouchableOpacity)[0].props.onPress());
    act(() => card.unmount());
  }
  async function reserve() {
    select();
    act(() => button('Reservar').props.onPress());
    await act(async () =>
      alert.mock.calls
        .at(-1)[2]
        .find(item => item.text === 'Reservar')
        .onPress(),
    );
  }
  test('booking disabled until a scheduled activity/city selected', async () => {
    await render();
    expect(button('Reservar').props.disabled).toBe(true);
    act(() => button('Cali').props.onPress());
    expect(
      tree.root.findByType(FlatList).props.data.map(item => item.id),
    ).toEqual(['dinner-1']);
  });
  test('reserves only published catalogue ID, never synthesizes dinner', async () => {
    await render();
    await reserve();
    expect(reserveActivity).toHaveBeenCalledWith('user-1', 'dinner-1');
    expect(alert.mock.calls.at(-1)[0]).toBe('Reserva confirmada');
    expect(listDinners).toHaveBeenCalledTimes(2);
  });
  test.each(['EVENT_FULL', 'ALREADY_REGISTERED', 'offline'])(
    'service error remains retryable %s',
    async message => {
      reserveActivity.mockRejectedValue(new Error(message));
      await render();
      await reserve();
      expect(alert.mock.calls.at(-1)[0]).toBe('Reserva no realizada');
    },
  );
  test('filters past/cancelled dinners and disables full card', async () => {
    listDinners.mockResolvedValue([
      {...dinner, status: 'cancelled'},
      {...dinner, id: 'past', startsAt: '2000-01-01'},
      {...dinner, id: 'full', participantCount: 6},
    ]);
    await render();
    act(() => button('Cali').props.onPress());
    const list = tree.root.findByType(FlatList);
    expect(list.props.data.map(item => item.id)).toEqual(['full']);
    let card;
    act(() => {
      card = renderer.create(list.props.renderItem({item: list.props.data[0]}));
    });
    expect(card.root.findAllByType(TouchableOpacity)[0].props.disabled).toBe(
      true,
    );
    act(() => card.unmount());
  });
});
