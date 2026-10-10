import rootReducer from '../src/app/rooReducer';
import {
  setId,
  setName,
  setEmail,
  setBirthDate,
  setPhone,
} from '../src/slices/userSlice';
import {setEventos} from '../src/slices/eventosSlice';

describe('existing root state and user field actions', () => {
  test('initializes both user and eventos domains', () => {
    const state = rootReducer(undefined, {type: 'unknown'});
    expect(state.user).toMatchObject({
      id: null,
      name: null,
      email: null,
      birthDate: null,
      phone: null,
    });
    expect(state.eventos.list).toEqual([]);
  });
  test.each([
    [setId, 'id', 'user-1'],
    [setName, 'name', 'Persona ficticia'],
    [setEmail, 'email', 'synthetic@example.test'],
    [setBirthDate, 'birthDate', '1990-01-02T00:00:00.000Z'],
    [setPhone, 'phone', '0000000000'],
  ])('updates a user field without changing events', (action, key, value) => {
    const state = rootReducer(undefined, {type: 'unknown'});
    const next = rootReducer(state, action(value));
    expect(next.user[key]).toBe(value);
    expect(next.eventos).toBe(state.eventos);
    expect(state.user[key]).toBeNull();
  });
  test('updating events does not change the user', () => {
    const state = rootReducer(undefined, setId('user-1'));
    expect(rootReducer(state, setEventos([{id: 'event'}])).user).toBe(
      state.user,
    );
  });
});
