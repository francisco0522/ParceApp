jest.mock('../src/services/activities', () => ({listEvents: jest.fn()}));
import {listEvents} from '../src/services/activities';
import {fetchEventos} from '../src/thunks/eventosThunks';
describe('canonical events thunk', () => {
  beforeEach(() => jest.clearAllMocks());
  test.each([[[]], [[{id: 'one', startsAt: '2099-01-01T00:00:00.000Z'}]]])(
    'dispatches loading then canonical results',
    async events => {
      listEvents.mockResolvedValue(events);
      const dispatch = jest.fn();
      await fetchEventos()(dispatch);
      expect(dispatch.mock.calls).toEqual([
        [{type: 'eventos/loading'}],
        [{type: 'eventos/setEventos', payload: events}],
      ]);
    },
  );
  test('handles service rejection', async () => {
    listEvents.mockRejectedValue(new Error('offline'));
    const dispatch = jest.fn();
    await fetchEventos()(dispatch);
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'eventos/error',
      payload: 'No se pudieron cargar los eventos. Intenta nuevamente.',
    });
  });
});
