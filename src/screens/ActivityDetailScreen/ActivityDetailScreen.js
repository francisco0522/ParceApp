import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {
  cancelReservation,
  reserveActivity,
  watchActivity,
  watchReservation,
} from '../../services/activities';
import {
  activityError,
  formatActivityDate,
  PILOT_CITIES,
} from '../../models/activity';

const ActivityDetailScreen = ({route, navigation}) => {
  const activityId = route.params?.activityId;
  const uid = useSelector(state => state.user.id);
  const [activity, setActivity] = useState(null);
  const [reserved, setReserved] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const alive = useRef(true);
  const currentUid = useRef(uid);
  currentUid.current = uid;
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    let active = true;
    let stopActivity;
    let stopReservations;
    setActivity(null);
    setReserved(null);
    setError(null);
    const fail = failure => {
      if (active) {
        setError(activityError(failure));
      }
    };
    try {
      stopActivity = watchActivity(
        activityId,
        data => {
          if (active) {
            setActivity(data);
            setNow(Date.now());
          }
        },
        fail,
      );
      stopReservations = watchReservation(
        uid,
        activityId,
        data => {
          if (active) {
            setReserved(data);
          }
        },
        fail,
      );
    } catch (failure) {
      fail(failure);
    }
    return () => {
      active = false;
      stopActivity?.();
      stopReservations?.();
    };
  }, [activityId, uid, retry]);
  useEffect(() => {
    if (activity && reserved !== null) {
      setError(null);
      return;
    }
    const timer = setTimeout(
      () =>
        setError(
          'No pudimos cargar la actividad a tiempo. Revisa la conexión.',
        ),
      20000,
    );
    return () => clearTimeout(timer);
  }, [activity, reserved, retry]);
  const perform = async action => {
    if (pending.current) {
      return;
    }
    const sessionUid = uid;
    pending.current = true;
    setBusy(true);
    try {
      await action(sessionUid, activityId);
      if (alive.current && currentUid.current === sessionUid) {
        Alert.alert(
          action === cancelReservation
            ? 'Reserva cancelada'
            : 'Reserva confirmada',
          action === cancelReservation
            ? 'Tu cupo quedó liberado.'
            : 'La actividad ya aparece en tu agenda.',
        );
      }
    } catch (failure) {
      if (alive.current && currentUid.current === sessionUid) {
        Alert.alert('Operación no realizada', activityError(failure));
      }
    } finally {
      pending.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  };
  const future = activity && new Date(activity.startsAt).getTime() > now;
  const full =
    activity &&
    activity.capacity !== null &&
    activity.participantCount >= activity.capacity;
  const statusText = {
    open: 'Abierta',
    cancelled: 'Actividad cancelada',
    completed: 'Finalizada',
  };
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.button}>Volver</Text>
        </TouchableOpacity>
        {error ? (
          <TouchableOpacity onPress={() => setRetry(value => value + 1)}>
            <Text style={styles.text}>{error} Reintentar</Text>
          </TouchableOpacity>
        ) : !activity || reserved === null ? (
          <Text style={styles.text}>Cargando actividad…</Text>
        ) : (
          <>
            <Text style={styles.title}>{activity.title}</Text>
            <Text style={styles.text}>
              {activity.kind === 'dinner' ? 'Cena' : 'Evento'} ·{' '}
              {PILOT_CITIES[activity.city]?.name}
            </Text>
            <Text style={styles.text}>{formatActivityDate(activity)}</Text>
            <Text style={styles.text}>{statusText[activity.status]}</Text>
            <Text style={styles.text}>
              {activity.venueName ||
                (activity.kind === 'dinner'
                  ? 'Restaurante pendiente de asignación'
                  : 'Lugar del evento')}
            </Text>
            <Text style={styles.text}>
              {activity.direction || 'Dirección pendiente de asignación'}
            </Text>
            {activity.groupId && (
              <Text style={styles.text}>Grupo: {activity.groupId}</Text>
            )}
            <Text style={styles.text}>{activity.description}</Text>
            <Text style={styles.text}>
              Cupos: {activity.participantCount}/
              {activity.capacity ?? 'Sin límite'}
            </Text>
            {reserved && (
              <Text style={styles.text}>
                Tienes una reserva en esta actividad.
              </Text>
            )}
            {reserved && future ? (
              <TouchableOpacity
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    'Cancelar tu reserva',
                    'Se liberará tu cupo. Puedes volver a reservar si quedan plazas.',
                    [
                      {text: 'Volver', style: 'cancel'},
                      {
                        text: 'Cancelar reserva',
                        style: 'destructive',
                        onPress: () => perform(cancelReservation),
                      },
                    ],
                  )
                }>
                <Text style={styles.button}>
                  {busy ? 'Procesando…' : 'Cancelar reserva'}
                </Text>
              </TouchableOpacity>
            ) : !reserved && future && activity.status === 'open' && !full ? (
              <TouchableOpacity
                disabled={busy}
                onPress={() => perform(reserveActivity)}>
                <Text style={styles.button}>
                  {busy ? 'Procesando…' : 'Reservar'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.text}>
                {!future
                  ? 'Esta actividad está en el historial.'
                  : full && !reserved
                    ? 'No hay cupos disponibles.'
                    : ''}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#2b2b2b'},
  content: {padding: 24},
  title: {color: '#fff', fontSize: 25, fontWeight: 'bold', marginVertical: 12},
  text: {color: '#fff', fontSize: 16, marginVertical: 8},
  button: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    paddingVertical: 15,
  },
});
export default ActivityDetailScreen;
