import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {TouchableOpacity, Button, Text} from 'react-native';
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(selector => selector({user: {id: 'user-1'}})),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'MockSafeArea',
}));
jest.mock('../src/firebase/config', () => ({
  auth: {currentUser: {uid: 'user-1'}},
}));
jest.mock('../src/services/profile', () => ({
  ...jest.requireActual('../src/services/profile'),
  fetchProfileForm: jest.fn(),
  saveProfileAnswers: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
}));
import {auth} from '../src/firebase/config';
import {fetchProfileForm, saveProfileAnswers} from '../src/services/profile';
import ProfileCreationScreen from '../src/screens/ProileCreationScreen/ProfileCreationScreen';
const single = {
  key: 'food',
  type: 'single',
  question: 'Comida',
  options: [
    {value: 'one', label: 'Uno'},
    {value: 'two', label: 'Dos'},
  ],
};
const boolean = {key: 'social', type: 'boolean', question: 'Social'};
describe('profile questionnaire UI', () => {
  let tree, navigation;
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = {uid: 'user-1'};
    navigation = {reset: jest.fn()};
    fetchProfileForm.mockResolvedValue({
      questions: [single],
      answers: {legacy: 'preserved', food: 'one'},
      profileCompleted: true,
    });
    saveProfileAnswers.mockResolvedValue(undefined);
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = null;
    }
  });
  async function render() {
    await act(async () => {
      tree = renderer.create(<ProfileCreationScreen navigation={navigation} />);
    });
  }
  const button = label =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(
        node =>
          node.findAll(child =>
            Array.isArray(child.props.children)
              ? child.props.children.includes(label)
              : child.props.children === label,
          ).length,
      );
  test('prefills existing answer and saves changed last single answer', async () => {
    await render();
    const checked = tree.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityState?.selected);
    expect(checked).toHaveLength(1);
    await act(async () => button('Dos').props.onPress());
    expect(saveProfileAnswers).toHaveBeenCalledWith('user-1', [single], {
      food: 'two',
      legacy: 'preserved',
    });
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{name: 'HomeScreen'}],
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({payload: {profileCompleted: true}}),
    );
  });
  test('last boolean false is saved explicitly', async () => {
    fetchProfileForm.mockResolvedValue({
      questions: [boolean],
      answers: {legacy: 'preserved'},
    });
    await render();
    await act(async () => button('No').props.onPress());
    expect(saveProfileAnswers).toHaveBeenCalledWith('user-1', [boolean], {
      social: false,
      legacy: 'preserved',
    });
  });
  test('omitting optional answer removes only its own key', async () => {
    fetchProfileForm.mockResolvedValue({
      questions: [{...single, required: false}],
      answers: {food: 'one', legacy: 'preserved'},
    });
    await render();
    await act(async () => button('Omitir respuesta').props.onPress());
    expect(saveProfileAnswers.mock.calls[0][2]).toEqual({legacy: 'preserved'});
  });
  test('empty required answer cannot advance or save', async () => {
    fetchProfileForm.mockResolvedValue({questions: [boolean], answers: {}});
    await render();
    await act(async () => button('Guardar preferencias').props.onPress());
    expect(saveProfileAnswers).not.toHaveBeenCalled();
    expect(
      tree.root
        .findAllByType(Text)
        .some(node =>
          String(node.props.children).includes('Selecciona una respuesta'),
        ),
    ).toBe(true);
  });
  test('multi max selections displays validation and saves permitted choices', async () => {
    const multi = {...single, type: 'multi', maxSelections: 1};
    fetchProfileForm.mockResolvedValue({questions: [multi], answers: {}});
    await render();
    act(() => button('Uno').props.onPress());
    act(() => button('Dos').props.onPress());
    await act(async () => button('Guardar preferencias').props.onPress());
    expect(saveProfileAnswers.mock.calls[0][2]).toEqual({food: ['one']});
  });
  test('load failure and empty form offer retry', async () => {
    fetchProfileForm
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({questions: [], answers: {}});
    await render();
    await act(async () => tree.root.findByType(Button).props.onPress());
    expect(fetchProfileForm).toHaveBeenCalledTimes(2);
    expect(tree.root.findByType(Button).props.title).toBe('Reintentar');
  });
  test('save failure preserves answers and allows retry', async () => {
    saveProfileAnswers
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    await render();
    await act(async () => button('Dos').props.onPress());
    expect(navigation.reset).not.toHaveBeenCalled();
    await act(async () => button('Guardar preferencias').props.onPress());
    expect(saveProfileAnswers.mock.calls[1][2]).toEqual({
      food: 'two',
      legacy: 'preserved',
    });
    expect(navigation.reset).toHaveBeenCalledTimes(1);
  });
  test('unmount or UID change prevents late success navigation', async () => {
    let resolve;
    saveProfileAnswers.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await render();
    let pending;
    act(() => {
      pending = button('Dos').props.onPress();
    });
    act(() => tree.unmount());
    tree = null;
    await act(async () => {
      resolve();
      await pending;
    });
    expect(navigation.reset).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
  test('duplicate press submits only once', async () => {
    let resolve;
    saveProfileAnswers.mockImplementation(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await render();
    let pending;
    act(() => {
      const press = button('Dos').props.onPress;
      pending = press();
      press();
    });
    expect(saveProfileAnswers).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
      await pending;
    });
  });
  test('restored questionnaire can be reopened and edited without losing unknown keys', async () => {
    let stored = {food: 'one', legacy: 'preserved'};
    fetchProfileForm.mockImplementation(async () => ({
      questions: [single],
      answers: {...stored},
      profileCompleted: true,
    }));
    saveProfileAnswers.mockImplementation(async (uid, questions, answers) => {
      stored = {...answers};
    });
    await render();
    await act(async () => button('Dos').props.onPress());
    act(() => tree.unmount());
    tree = null;
    await render();
    expect(
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.accessibilityState?.selected)
        .findAllByType(Text)[0].props.children,
    ).toContain('Dos');
    await act(async () => button('Uno').props.onPress());
    expect(stored).toEqual({food: 'one', legacy: 'preserved'});
  });
});
