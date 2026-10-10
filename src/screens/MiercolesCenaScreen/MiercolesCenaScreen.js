import React, {useEffect, useRef, useState} from 'react';
import {Alert, FlatList, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import Footer from '../Footer/Footer';
import styles from './styles';
import {listDinners, reserveActivity} from '../../services/activities';
import {
  activityError,
  formatActivityDate,
  PILOT_CITIES,
} from '../../models/activity';

const MiercolesCenaScreen = ({navigation}) => {
  const uid = useSelector(state => state.user.id);
  const name = useSelector(state => state.user.name);
  const [city, setCity] = useState(null);
  const [dinners, setDinners] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  const currentUid = useRef(uid);
  currentUid.current = uid;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    listDinners()
      .then(data => {
        if (active) {
          setDinners(data);
          setLoading(false);
        }
      })
      .catch(failure => {
        if (active) {
          setError(activityError(failure));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [retry, uid]);
  useEffect(
    () => navigation.addListener?.('focus', () => setRetry(value => value + 1)),
    [navigation],
  );
  const reserve = async () => {
    if (pending.current || !selected || !city) {
      return;
    }
    const sessionUid = uid;
    pending.current = true;
    setBusy(true);
    try {
      await reserveActivity(uid, selected.id);
      if (alive.current && currentUid.current === sessionUid) {
        Alert.alert(
          'Reserva confirmada',
          `${selected.title}\n${PILOT_CITIES[selected.city].name}\n${formatActivityDate(selected)}\n${selected.venueName || 'Restaurante pendiente de asignación'}`,
        );
        setRetry(value => value + 1);
      }
    } catch (failure) {
      if (alive.current && currentUid.current === sessionUid) {
        Alert.alert('Reserva no realizada', activityError(failure));
      }
    } finally {
      pending.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  };
  const dates = dinners.filter(
    item =>
      item.city === city &&
      item.status === 'open' &&
      new Date(item.startsAt).getTime() > Date.now(),
  );
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#2b2b2b'}}>
      <View style={styles.container}>
        <Text style={styles.titleText}>Hola {name}</Text>
        <Text style={styles.subtitleText}>Reserva tu próxima cena</Text>
        <Text style={styles.cardTimeText}>Selecciona tu ciudad</Text>
        <View style={{flexDirection: 'row'}}>
          {Object.entries(PILOT_CITIES).map(([id, info]) => (
            <TouchableOpacity
              key={id}
              disabled={busy}
              style={city === id ? styles.cardSelected : styles.card}
              onPress={() => {
                setCity(id);
                setSelected(null);
              }}>
              <Text style={styles.cardDateText}>
                {info.name}
                {city === id ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? (
          <Text style={styles.cardTimeText}>Cargando cenas…</Text>
        ) : error ? (
          <TouchableOpacity onPress={() => setRetry(value => value + 1)}>
            <Text style={styles.cardTimeText}>{error} Reintentar</Text>
          </TouchableOpacity>
        ) : !city ? (
          <Text style={styles.cardTimeText}>
            Elige Cali o Formosa para ver las cenas programadas.
          </Text>
        ) : (
          <FlatList
            data={dates}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={styles.cardTimeText}>
                No hay cenas programadas para esta ciudad.
              </Text>
            }
            renderItem={({item}) => {
              const full =
                item.capacity !== null &&
                item.participantCount >= item.capacity;
              return (
                <TouchableOpacity
                  disabled={busy || full}
                  style={
                    selected?.id === item.id ? styles.cardSelected : styles.card
                  }
                  onPress={() => setSelected(item)}>
                  <Text style={styles.cardDateText}>{item.title}</Text>
                  <Text style={styles.cardTimeText}>
                    {formatActivityDate(item)}
                  </Text>
                  <Text style={styles.cardTimeText}>
                    {item.venueName || 'Restaurante pendiente de asignación'}
                  </Text>
                  <Text style={styles.cardTimeText}>
                    {item.direction || 'Dirección pendiente'} · Grupo{' '}
                    {item.groupId}
                  </Text>
                  <Text style={styles.cardTimeText}>
                    {item.participantCount}/{item.capacity} ·{' '}
                    {full ? 'Sin cupos' : 'Abierta'}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ActivityDetailScreen', {
                        activityId: item.id,
                      })
                    }>
                    <Text style={styles.cardTimeText}>Ver detalles</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}
        <TouchableOpacity
          disabled={!selected || busy || loading}
          style={styles.confirmButton}
          onPress={() =>
            Alert.alert(
              'Confirmar reserva',
              `${selected.title}\n${PILOT_CITIES[selected.city].name}\n${formatActivityDate(selected)}`,
              [
                {text: 'Volver', style: 'cancel'},
                {text: 'Reservar', onPress: reserve},
              ],
            )
          }>
          <Text style={styles.confirmButtonText}>
            {busy ? 'Reservando…' : 'Reservar'}
          </Text>
        </TouchableOpacity>
      </View>
      <Footer navigation={navigation} />
    </SafeAreaView>
  );
};
export default MiercolesCenaScreen;
