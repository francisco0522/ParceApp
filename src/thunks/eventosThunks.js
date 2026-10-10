import {listEvents} from '../services/activities';
export const fetchEventos = () => async dispatch => {
  dispatch({type: 'eventos/loading'});
  try {
    dispatch({type: 'eventos/setEventos', payload: await listEvents()});
  } catch (error) {
    dispatch({
      type: 'eventos/error',
      payload: 'No se pudieron cargar los eventos. Intenta nuevamente.',
    });
  }
};
