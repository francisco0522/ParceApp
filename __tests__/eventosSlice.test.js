import reducer, {
  loading,
  setEventos,
  error,
  clearEventos,
} from '../src/slices/eventosSlice';

describe('existing eventos reducer', () => {
  test('starts empty and idle', () => {
    expect(reducer(undefined, {type: 'unknown'})).toEqual({
      list: [],
      loading: false,
      error: null,
      lastFetch: null,
    });
  });
  test('loading resets a previous error and preserves cached events', () => {
    const state = {
      list: [{id: 'one'}],
      loading: false,
      error: 'network',
      lastFetch: 123,
    };
    expect(reducer(state, loading())).toEqual({
      ...state,
      loading: true,
      error: null,
    });
    expect(state.loading).toBe(false);
  });
  test('success stores results and fetch timestamp', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(456);
    const events = [{id: 'one', title: 'Museo'}];
    expect(reducer(undefined, setEventos(events))).toEqual({
      list: events,
      loading: false,
      error: null,
      lastFetch: 456,
    });
    clock.mockRestore();
  });
  test('failure ends loading and preserves cached events', () => {
    const state = {
      list: [{id: 'one'}],
      loading: true,
      error: null,
      lastFetch: 123,
    };
    expect(reducer(state, error('Error cargando eventos'))).toEqual({
      ...state,
      loading: false,
      error: 'Error cargando eventos',
    });
  });
  test('clearing removes cached events and timestamp', () => {
    const state = {
      list: [{id: 'one'}],
      loading: false,
      error: null,
      lastFetch: 123,
    };
    expect(reducer(state, clearEventos())).toEqual({
      ...state,
      list: [],
      lastFetch: null,
    });
  });
  test('supports an empty successful response', () => {
    expect(reducer(undefined, setEventos([])).list).toEqual([]);
  });
});
