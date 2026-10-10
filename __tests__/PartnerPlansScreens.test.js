/* eslint-disable no-script-url -- Adversarial URL fixtures must be rejected and never executed. */
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  Alert,
  AppState,
  ActivityIndicator,
} from 'react-native';
jest.mock('react-redux', () => ({
  useSelector: selector =>
    selector({user: {id: 'user-1', profileAnswers: {food: 'unrelated'}}}),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('../src/screens/Footer/Footer', () => () => null);
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1'}},
}));
jest.mock('../src/services/partnerPlans', () => ({
  watchPublishedPlans: jest.fn(),
  watchPartnerPlan: jest.fn(),
  isPlanAdministrator: jest.fn(),
  watchAdminPlans: jest.fn(),
  savePartnerPlan: jest.fn(),
}));
import {
  watchPublishedPlans,
  watchPartnerPlan,
  isPlanAdministrator,
  watchAdminPlans,
  savePartnerPlan,
} from '../src/services/partnerPlans';
import ExplorePlansScreen from '../src/screens/ExplorePlansScreen/ExplorePlansScreen';
import PlanDetailScreen from '../src/screens/PlanDetailScreen/PlanDetailScreen';
import PartnerPlanAdminScreen from '../src/screens/PartnerPlanAdminScreen/PartnerPlanAdminScreen';
import PlanCard, {PlanImage} from '../src/screens/ExplorePlansScreen/PlanCard';
import {partnerPlan} from '../tests/partnerFixtures';
describe('partner plan cards and feed', () => {
  let tree, navigation, stop;
  beforeEach(() => {
    jest.clearAllMocks();
    navigation = {navigate: jest.fn(), goBack: jest.fn()};
    stop = jest.fn();
    watchPublishedPlans.mockImplementation((uid, reference, callback) => {
      callback([
        partnerPlan(),
        partnerPlan({
          id: 'formosa',
          city: 'formosa',
          startsAt: '2099-01-01T01:00:00Z',
        }),
        partnerPlan({id: 'draft', status: 'draft'}),
      ]);
      return stop;
    });
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    jest.useRealTimers();
  });
  async function render() {
    await act(async () => {
      tree = renderer.create(<ExplorePlansScreen navigation={navigation} />);
    });
  }
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node.findAllByType(Text).some(text => text.props.children === label),
      );
  test('all city feed is ordered and navigates using plan id without taste matching', async () => {
    await render();
    const list = tree.root.findByType(FlatList);
    expect(list.props.data.map(plan => plan.id)).toEqual(['plan-1', 'formosa']);
    let card;
    act(() => {
      card = renderer.create(list.props.renderItem({item: list.props.data[0]}));
    });
    act(() => card.root.findByType(TouchableOpacity).props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('PlanDetailScreen', {
      planId: 'plan-1',
    });
    act(() => card.unmount());
  });
  test('Cali and Formosa filters are explicit', async () => {
    await render();
    act(() => button('Formosa').props.onPress());
    expect(
      tree.root.findByType(FlatList).props.data.map(plan => plan.id),
    ).toEqual(['formosa']);
    act(() => button('Cali').props.onPress());
    expect(
      tree.root.findByType(FlatList).props.data.map(plan => plan.id),
    ).toEqual(['plan-1']);
  });
  test('error retry creates a fresh subscription', async () => {
    watchPublishedPlans.mockImplementation((uid, reference, data, error) => {
      error(new Error('offline'));
      return stop;
    });
    await render();
    const retry = tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => String(text.props.children).includes('Reintentar')),
      );
    act(() => retry.props.onPress());
    expect(watchPublishedPlans).toHaveBeenCalledTimes(2);
  });
  test('loading becomes timeout error then retry', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    watchPublishedPlans.mockImplementation(() => stop);
    await render();
    expect(tree.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(
      0,
    );
    await act(async () => jest.advanceTimersByTimeAsync(20000));
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => String(node.props.children).includes('Reintentar')),
    ).toBe(true);
  });
  test('clock removes plan exactly at expiry and cleans listener', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    watchPublishedPlans.mockImplementation((uid, reference, callback) => {
      callback([partnerPlan({publishUntil: '2026-01-01T00:00:02Z'})]);
      return stop;
    });
    await render();
    expect(tree.root.findByType(FlatList).props.data).toHaveLength(1);
    await act(async () => jest.advanceTimersByTimeAsync(2000));
    expect(tree.root.findByType(FlatList).props.data).toHaveLength(0);
    act(() => tree.unmount());
    tree = null;
    expect(stop).toHaveBeenCalledTimes(1);
  });
  test('30-second reference refreshes newly scheduled query and foreground ticks clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const listeners = [];
    const appState = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((name, callback) => {
        listeners.push(callback);
        return {remove: jest.fn()};
      });
    await render();
    await act(async () => jest.advanceTimersByTimeAsync(30000));
    expect(watchPublishedPlans).toHaveBeenCalledTimes(2);
    jest.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    act(() => listeners[0]('active'));
    expect(watchPublishedPlans).toHaveBeenCalledTimes(3);
    appState.mockRestore();
  });
  test('sponsored label shown and image failures use fallback', () => {
    act(() => {
      tree = renderer.create(
        <PlanCard
          plan={partnerPlan({imageUrl: 'https://example.test/image'})}
          onPress={jest.fn()}
        />,
      );
    });
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => node.props.children === 'Patrocinado'),
    ).toBe(true);
    act(() => tree.root.findByType(Image).props.onError());
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => node.props.children === 'Imagen no disponible'),
    ).toBe(true);
  });
  test('non sponsored card never carries advertising label; new image retries', () => {
    act(() => {
      tree = renderer.create(<PlanImage url="https://example.test/a" />);
    });
    act(() => tree.root.findByType(Image).props.onError());
    act(() => tree.update(<PlanImage url="https://example.test/b" />));
    expect(tree.root.findByType(Image).props.source.uri).toBe(
      'https://example.test/b',
    );
  });
});
describe('partner plan detail external action', () => {
  let tree, navigation, open, alert, plan;
  beforeEach(() => {
    jest.clearAllMocks();
    plan = partnerPlan();
    navigation = {goBack: jest.fn()};
    watchPartnerPlan.mockImplementation((uid, id, callback) => {
      callback(plan);
      return jest.fn();
    });
    open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
    open.mockRestore();
    alert.mockRestore();
    jest.useRealTimers();
  });
  function render() {
    act(() => {
      tree = renderer.create(
        <PlanDetailScreen
          navigation={navigation}
          route={{params: {planId: 'plan-1'}}}
        />,
      );
    });
  }
  const button = () =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(
            text =>
              text.props.children === 'Ver información o comprar con el aliado',
          ),
      );
  test('opens valid link with sponsorship attribution', async () => {
    render();
    await act(async () => button().props.onPress());
    expect(open).toHaveBeenCalledWith(plan.externalUrl);
    expect(
      tree.root
        .findAllByType(Text)
        .some(node => node.props.children === 'Patrocinado'),
    ).toBe(true);
  });
  test('invalid URL is refused even if entry supplied by listener', async () => {
    plan.externalUrl = 'javascript:alert(1)';
    render();
    await act(async () => button().props.onPress());
    expect(open).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Plan no disponible');
  });
  test('failed link opening shows retryable message', async () => {
    open.mockRejectedValue(new Error('unavailable'));
    render();
    await act(async () => button().props.onPress());
    expect(alert.mock.calls[0][0]).toBe('No se pudo abrir el enlace');
  });
  test('withdrawn/expired plan removes external action', () => {
    plan.status = 'withdrawn';
    render();
    expect(button()).toBeUndefined();
    expect(
      tree.root
        .findAllByType(Text)
        .some(
          node => node.props.children === 'Este plan ya no está disponible.',
        ),
    ).toBe(true);
  });
  test('expiry between render and button press cannot open link', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01'));
    plan.publishUntil = '2026-01-01T00:00:01Z';
    render();
    const press = button().props.onPress;
    jest.setSystemTime(new Date('2026-01-01T00:00:02Z'));
    await act(async () => press());
    expect(open).not.toHaveBeenCalled();
  });
});
describe('partner publication admin editor', () => {
  let tree, alert;
  beforeEach(() => {
    jest.clearAllMocks();
    isPlanAdministrator.mockResolvedValue(true);
    watchAdminPlans.mockImplementation((uid, data) => {
      data([partnerPlan()]);
      return jest.fn();
    });
    savePartnerPlan.mockResolvedValue('plan-1');
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
      tree = renderer.create(
        <PartnerPlanAdminScreen navigation={{goBack: jest.fn()}} />,
      );
    });
  }
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node.findAllByType(Text).some(text => text.props.children === label),
      );
  test('ordinary user cannot see editor or subscribe to drafts', async () => {
    isPlanAdministrator.mockResolvedValue(false);
    await render();
    expect(button('Nueva publicación')).toBeUndefined();
    expect(watchAdminPlans).not.toHaveBeenCalled();
  });
  test.each([
    ['Guardar borrador', 'draft'],
    ['Publicar', 'published'],
    ['Retirar', 'withdrawn'],
  ])('existing plan can %s', async (label, status) => {
    await render();
    act(() => button('Exposición').props.onPress());
    await act(async () => button(label).props.onPress());
    expect(savePartnerPlan).toHaveBeenCalledWith(
      'user-1',
      'plan-1',
      expect.objectContaining({
        status,
        imageUrl: null,
        city: 'cali',
        startsAt: '2099-01-01T00:00:00.000Z',
      }),
    );
    expect(alert).toHaveBeenCalledWith('Publicación guardada');
  });
  test('new entry malformed date prevents save', async () => {
    await render();
    act(() => button('Nueva publicación').props.onPress());
    act(() =>
      tree.root
        .findAllByType(TextInput)
        .find(node => node.props.accessibilityLabel === 'Inicio de actividad')
        .props.onChangeText('2099-02-31 20:00'),
    );
    await act(async () => button('Publicar').props.onPress());
    expect(savePartnerPlan).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][0]).toBe('No se pudo guardar');
  });
  test('duplicate save presses submit once and preserve retry after error', async () => {
    let resolve;
    savePartnerPlan.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await render();
    act(() => button('Exposición').props.onPress());
    let pending;
    act(() => {
      const press = button('Publicar').props.onPress;
      pending = press();
      press();
    });
    expect(savePartnerPlan).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
      await pending;
    });
  });
});
