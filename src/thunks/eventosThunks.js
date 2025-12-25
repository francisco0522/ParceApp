import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import {firebaseApp} from '../firebase/config';

export const fetchEventos = () => async dispatch => {
  try {
    dispatch({type: 'eventos/loading'});

    const db = getFirestore(firebaseApp);
    const eventosRef = collection(db, 'eventos');
    const q = query(eventosRef, orderBy('date', 'asc'));

    const snapshot = await getDocs(q);

    const eventos = snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,

        // 🔥 CONVERTIMOS Firestore Timestamp → string
        date: data.date?.toDate().toISOString(),
        hour: data.hour?.toDate().toISOString(),
        createdAt: data.createdAt?.toDate().toISOString(),
      };
    });

    dispatch({
      type: 'eventos/setEventos',
      payload: eventos,
    });
  } catch (error) {
    console.error(error);
    dispatch({
      type: 'eventos/error',
      payload: 'Error cargando eventos',
    });
  }
};
