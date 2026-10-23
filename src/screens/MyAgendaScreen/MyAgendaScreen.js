import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Avatar} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {watchUserActivities} from '../../services/activities';
import {formatActivityDate, PILOT_CITIES} from '../../models/activity';
import styles from './styles';
import Footer from '../Footer/Footer';

const MyAgendaScreen = ({navigation}) => {
  const uid = useSelector(state => state.user.id);
  const name = useSelector(state => state.user.name);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [section, setSection] = useState('upcoming');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setEvents([]);
    setLoading(Boolean(uid));
    setError(null);
    if (!uid) {
      return;
    }
    const failed = () => {
      if (active) {
        setError('No se pudieron cargar tus reservas');
        setLoading(false);
      }
    };
    const deadline = setTimeout(failed, 20000);
    let stop;
    try {
      stop = watchUserActivities(
        uid,
        data => {
          if (active) {
            clearTimeout(deadline);
            setError(null);
            setEvents(data);
            setLoading(false);
            setNow(Date.now());
          }
        },
        failed,
      );
    } catch (failure) {
      failed();
    }
    return () => {
      active = false;
      clearTimeout(deadline);
      stop?.();
    };
  }, [uid, retry]);
  const visible = events.filter(item =>
    section === 'upcoming'
      ? new Date(item.startsAt).getTime() > now
      : new Date(item.startsAt).getTime() <= now,
  );
  const statusText = {
    open: 'Abierta',
    cancelled: 'Actividad cancelada',
    completed: 'Finalizada',
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola</Text>
          <Text style={styles.welcome}>{name}, estos son tus planes</Text>
        </View>
        <Avatar.Text size={44} label={(name || '?').charAt(0).toUpperCase()} />
      </View>
      <View style={{flexDirection: 'row'}}>
        <TouchableOpacity
          onPress={() => {
            setNow(Date.now());
            setSection('upcoming');
          }}>
          <Text style={styles.emptyText}>
            Próximas{section === 'upcoming' ? ' ✓' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setNow(Date.now());
            setSection('past');
          }}>
          <Text style={styles.emptyText}>
            Pasadas{section === 'past' ? ' ✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <TouchableOpacity onPress={() => setRetry(value => value + 1)}>
          <Text style={styles.emptyText}>{error}. Reintentar</Text>
        </TouchableOpacity>
      ) : loading ? (
        <Text style={styles.emptyText}>Cargando tus reservas…</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {section === 'upcoming'
                ? 'Aún no tienes próximas reservas.'
                : 'No tienes reservas pasadas.'}
            </Text>
          }
          contentContainerStyle={{paddingBottom: 110}}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('ActivityDetailScreen', {
                  activityId: item.id,
                })
              }>
              <View style={styles.cardHeader}>
                <Text style={styles.date}>{formatActivityDate(item)}</Text>
                <View
                  style={[
                    styles.badge,
                    item.kind === 'dinner' ? styles.dinner : styles.event,
                  ]}>
                  <Text style={styles.badgeText}>
                    {item.kind === 'dinner' ? 'Cena' : 'Evento'}
                  </Text>
                </View>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>
                {PILOT_CITIES[item.city]?.name} · {statusText[item.status]}
              </Text>
              <Text style={styles.subtitle}>
                {item.venueName ||
                  (item.kind === 'dinner'
                    ? 'Restaurante pendiente de asignación'
                    : item.direction)}
              </Text>
              <Text style={styles.subtitle}>
                {item.participantCount}/{item.capacity ?? 'Sin límite'} · Ver
                detalles
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
      <Footer navigation={navigation} />
    </SafeAreaView>
  );
};
export default MyAgendaScreen;
