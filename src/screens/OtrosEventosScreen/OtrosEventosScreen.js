import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
import {useDispatch, useSelector} from 'react-redux';
import Footer from '../Footer/Footer';
import styles from './styles';
import {
  createEvent,
  isActivityAdministrator,
  reserveActivity,
} from '../../services/activities';
import {
  activityError,
  formatActivityDate,
  PILOT_CITIES,
  selectedStartsAt,
} from '../../models/activity';
import {fetchEventos} from '../../thunks/eventosThunks';

const OtrosEventosScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {list, loading, error: loadError} = useSelector(state => state.eventos);
  const uid = useSelector(state => state.user.id);
  const name = useSelector(state => state.user.name);
  const [admin, setAdmin] = useState(false);
  const [roleError, setRoleError] = useState(null);
  const [city, setCity] = useState(null);
  const [selected, setSelected] = useState([]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  const currentUid = useRef(uid);
  currentUid.current = uid;
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [direction, setDirection] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [newCity, setNewCity] = useState(null);
  const [date, setDate] = useState(new Date());
  const [hour, setHour] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [openHour, setOpenHour] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setAdmin(false);
    setRoleError(null);
    setSelected([]);
    setResults([]);
    dispatch(fetchEventos());
    isActivityAdministrator()
      .then(value => {
        if (active) {
          setAdmin(value);
        }
      })
      .catch(() => {
        if (active) {
          setRoleError('No pudimos comprobar permisos administrativos.');
        }
      });
    return () => {
      active = false;
    };
  }, [dispatch, uid]);
  useEffect(
    () => navigation.addListener?.('focus', () => dispatch(fetchEventos())),
    [navigation, dispatch],
  );
  const create = async () => {
    if (pending.current) {
      return;
    }
    if (!newCity || !title.trim() || !direction.trim()) {
      Alert.alert('Revisa el evento', 'Completa título, ciudad y dirección.');
      return;
    }
    const places =
      capacity.trim() === '' || Number(capacity) === 0
        ? null
        : Number(capacity);
    if (
      places !== null &&
      (!Number.isInteger(places) || places < 1 || places > 10000)
    ) {
      Alert.alert(
        'Revisa los cupos',
        'Usa un entero de 1 a 10000; vacío o 0 significa sin límite.',
      );
      return;
    }
    const sessionUid = uid;
    pending.current = true;
    setBusy(true);
    try {
      await createEvent(uid, {
        title,
        direction,
        description,
        capacity: places,
        city: newCity,
        startsAt: selectedStartsAt(date, hour, newCity),
      });
      if (alive.current && currentUid.current === sessionUid) {
        Alert.alert('Evento creado', 'Tu reserva también quedó registrada.');
        setCreateModal(false);
        setTitle('');
        setDirection('');
        setDescription('');
        setCapacity('');
        setNewCity(null);
        dispatch(fetchEventos());
      }
    } catch (failure) {
      if (alive.current && currentUid.current === sessionUid) {
        Alert.alert('Evento no creado', activityError(failure));
      }
    } finally {
      pending.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  };
  const reserve = async () => {
    if (pending.current || !selected.length) {
      return;
    }
    const sessionUid = uid;
    const requested = [...selected];
    pending.current = true;
    setBusy(true);
    const outcomes = [];
    for (const id of requested) {
      if (!alive.current || currentUid.current !== sessionUid) {
        break;
      }
      try {
        await reserveActivity(sessionUid, id);
        outcomes.push({id, ok: true, message: 'Reserva confirmada'});
      } catch (failure) {
        // An existing membership is an achieved outcome, not a retry target.
        outcomes.push({
          id,
          ok: failure.message === 'ALREADY_REGISTERED',
          message: activityError(failure),
        });
      }
    }
    pending.current = false;
    if (alive.current) {
      setBusy(false);
    }
    if (alive.current && currentUid.current === sessionUid) {
      setResults(outcomes);
      setSelected(
        outcomes.filter(result => !result.ok).map(result => result.id),
      );
      setBusy(false);
      dispatch(fetchEventos());
      const confirmed = outcomes.filter(result => result.ok).length;
      Alert.alert(
        'Resultado de reservas',
        `${confirmed} confirmadas o ya reservadas; ${outcomes.length - confirmed} no realizadas. Reintentar procesa únicamente las pendientes.`,
      );
    }
  };
  const events = list
    .filter(
      item =>
        item.status === 'open' &&
        new Date(item.startsAt).getTime() > Date.now() &&
        (!city || item.city === city),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#2b2b2b'}}>
      <View style={styles.container}>
        <Text style={styles.titleText}>Hola {name}</Text>
        <Text style={styles.subtitleText}>Reserva tu próximo evento</Text>
        <View style={{flexDirection: 'row'}}>
          {[
            ['all', 'Todas'],
            ...Object.entries(PILOT_CITIES).map(([id, info]) => [
              id,
              info.name,
            ]),
          ].map(([id, label]) => (
            <TouchableOpacity
              key={id}
              disabled={busy}
              onPress={() => {
                setCity(id === 'all' ? null : id);
              }}
              style={styles.card}>
              <Text style={styles.cardTimeText}>
                {label}
                {(city || 'all') === id ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {roleError && <Text style={styles.cardTimeText}>{roleError}</Text>}
        {admin && (
          <TouchableOpacity
            style={styles.cardNuevoEvento}
            disabled={busy}
            onPress={() => setCreateModal(true)}>
            <Text style={styles.titleNuevoEvento}>Crear nuevo evento</Text>
          </TouchableOpacity>
        )}
        {loadError && (
          <TouchableOpacity onPress={() => dispatch(fetchEventos())}>
            <Text style={styles.cardTimeText}>{loadError} Reintentar</Text>
          </TouchableOpacity>
        )}
        {loading && <Text style={styles.cardTimeText}>Cargando eventos…</Text>}
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            !loading && !loadError ? (
              <Text style={styles.cardTimeText}>
                No hay eventos próximos disponibles.
              </Text>
            ) : null
          }
          renderItem={({item}) => {
            const full =
              item.capacity !== null && item.participantCount >= item.capacity;
            return (
              <View
                style={
                  selected.includes(item.id) ? styles.cardSelected : styles.card
                }>
                <TouchableOpacity
                  disabled={busy || full}
                  onPress={() =>
                    setSelected(previous =>
                      previous.includes(item.id)
                        ? previous.filter(id => id !== item.id)
                        : [...previous, item.id],
                    )
                  }>
                  <Text style={styles.cardDateText}>
                    {item.title}
                    {selected.includes(item.id) ? ' ✓' : ''}
                  </Text>
                  <Text style={styles.cardTimeText}>
                    {PILOT_CITIES[item.city]?.name} · {formatActivityDate(item)}
                  </Text>
                  <Text style={styles.cardTimeText}>{item.direction}</Text>
                  <Text style={styles.cardTimeText}>
                    {item.participantCount}/{item.capacity ?? 'Sin límite'} ·{' '}
                    {full ? 'Sin cupos' : 'Abierto'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ActivityDetailScreen', {
                      activityId: item.id,
                    })
                  }>
                  <Text style={styles.cardTimeText}>Ver detalles</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
        {results.map(result => (
          <Text key={result.id} style={styles.cardTimeText}>
            {list.find(item => item.id === result.id)?.title || result.id}:{' '}
            {result.message}
          </Text>
        ))}
        {selected.length > 0 && (
          <TouchableOpacity
            style={styles.confirmButton}
            disabled={busy}
            onPress={reserve}>
            <Text style={styles.confirmButtonText}>
              {busy
                ? 'Reservando…'
                : `${results.length ? 'Reintentar pendientes' : 'Reservar'} (${selected.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Footer navigation={navigation} />
      <Modal
        visible={createModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) {
            setCreateModal(false);
          }
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: '#0008',
          }}>
          <ScrollView
            style={{maxHeight: '90%', backgroundColor: '#eee'}}
            contentContainerStyle={{padding: 20}}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.cardTitles}>Crear evento (administración)</Text>
            <Text style={styles.cardTitles}>Ciudad y zona horaria</Text>
            {Object.entries(PILOT_CITIES).map(([id, info]) => (
              <TouchableOpacity
                key={id}
                disabled={busy}
                onPress={() => setNewCity(id)}>
                <Text style={styles.cardTitles}>
                  {info.name} (UTC{info.offset}){newCity === id ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              editable={!busy}
              accessibilityLabel="Título del evento"
              placeholder="Título del evento"
              maxLength={160}
              value={title}
              onChangeText={setTitle}
              style={styles.cardInputs}
            />
            <TouchableOpacity disabled={busy} onPress={() => setOpenDate(true)}>
              <Text style={styles.cardTitles}>
                Fecha: {date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={() => setOpenHour(true)}>
              <Text style={styles.cardTitles}>
                Hora de la ciudad seleccionada: {hour.getHours()}:
                {String(hour.getMinutes()).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            <TextInput
              editable={!busy}
              accessibilityLabel="Dirección"
              placeholder="Dirección"
              maxLength={500}
              value={direction}
              onChangeText={setDirection}
              style={styles.cardInputs}
            />
            <TextInput
              editable={!busy}
              accessibilityLabel="Descripción"
              placeholder="Descripción"
              multiline
              maxLength={4000}
              value={description}
              onChangeText={setDescription}
              style={styles.cardInputs}
            />
            <TextInput
              editable={!busy}
              accessibilityLabel="Capacidad"
              placeholder="Cupos (vacío o 0: sin límite)"
              keyboardType="numeric"
              value={capacity}
              onChangeText={setCapacity}
              style={styles.cardInputs}
            />
            <TouchableOpacity
              disabled={busy}
              onPress={create}
              style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>
                {busy ? 'Creando…' : 'Crear evento'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              onPress={() => setCreateModal(false)}>
              <Text style={styles.cardTitles}>Volver</Text>
            </TouchableOpacity>
          </ScrollView>
          <DatePicker
            modal
            mode="date"
            minimumDate={new Date()}
            open={openDate}
            date={date}
            onConfirm={value => {
              setOpenDate(false);
              setDate(value);
            }}
            onCancel={() => setOpenDate(false)}
          />
          <DatePicker
            modal
            mode="time"
            open={openHour}
            date={hour}
            onConfirm={value => {
              setOpenHour(false);
              setHour(value);
            }}
            onCancel={() => setOpenHour(false)}
          />
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};
export default OtrosEventosScreen;
