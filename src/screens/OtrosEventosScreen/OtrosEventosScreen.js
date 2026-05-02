import React, {useState, useEffect} from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  View,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import moment from 'moment';
import 'moment/locale/es';

import Footer from '../Footer/Footer';
import styles from './styles';
import {
  getFirestore,
  collection,
  doc,
  runTransaction,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import {useDispatch, useSelector} from 'react-redux';
import {fetchEventos} from '../../thunks/eventosThunks';
import {firebaseApp} from '../../firebase/config';
import DatePicker from 'react-native-date-picker';

moment.locale('es');

const OtrosEventosScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {list, loading} = useSelector(state => state.eventos);

  const fullName = useSelector(state => state.user.name);
  const userId = useSelector(state => state.user.id);
 
  /* ---------------- ESTADOS ---------------- */

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [eventModal, setEventModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState(null);
  const [newEventDate, setNewEventDate] = useState(new Date());
  const [newEventHour, setNewEventHour] = useState(new Date());
  const [newEventDescription, setNewEventDescription] = useState(null);
  const [newEventDirection, setNewEventDirection] = useState(null);
  const [newEventCapacity, setNewEventCapacity] = useState(null);
  const [openNewEventDate, setOpenNewEventDate] = useState(false);
  const [openNewEventHour, setOpenNewEventHour] = useState(false);

  useEffect(() => {
    if (!list.length) {
      dispatch(fetchEventos());
    } else {
      console.log(list);
    }
  }, []);

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: '#fff'}}>Cargando...</Text>
      </View>
    );
  }

  /* ---------------- EVENTOS ---------------- */

  const crearEvento = async () => {
    try {
      if (!userId || !fullName) {
        Alert.alert('Error', 'Usuario no válido');
        return;
      }

      if (
        !newEventTitle ||
        !newEventDate ||
        !newEventHour ||
        !newEventDirection
      ) {
        Alert.alert('Error', 'Completa todos los campos obligatorios');
        return;
      }

      const db = getFirestore(firebaseApp);

      // 🔑 CLAVE ÚNICA DEL EVENTO
      const normalize = text =>
        text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '')
          .toLowerCase();

      const eventKey = `${normalize(newEventTitle)}_${moment(
        newEventDate,
      ).format('YYYY-MM-DD')}_${moment(newEventHour).format(
        'HH:mm',
      )}_${normalize(newEventDirection)}`;

      // 📌 usar eventKey como ID
      const eventoRef = doc(db, 'eventos', eventKey);

      const userData = {
        id: userId,
        fullName,
      };

      await runTransaction(db, async transaction => {
        const snap = await transaction.get(eventoRef);

        // ⛔ EVENTO DUPLICADO
        if (snap.exists()) {
          throw new Error('DUPLICATE');
        }

        // ✅ CREAR EVENTO
        transaction.set(eventoRef, {
          title: newEventTitle.trim(),
          date: Timestamp.fromDate(newEventDate),
          hour: Timestamp.fromDate(newEventHour),
          direction: newEventDirection.trim(),
          description: newEventDescription || '',
          capacity: Number(newEventCapacity) || 0,
          users: [userData], // creador ya queda inscrito
          createdBy: userData,
          eventKey,
          createdAt: Timestamp.now(),
        });
      });

      Alert.alert('Evento creado', 'Evento creado con éxito');
      dispatch(fetchEventos());
      setCreateModal(false);
    } catch (error) {
      if (error.message === 'DUPLICATE') {
        Alert.alert(
          'Evento duplicado',
          'Ya existe un evento con el mismo título, fecha, hora y dirección',
        );
      } else {
        console.error(error);
        Alert.alert('Error', 'No se pudo crear el evento');
      }
    }
  };

  const reservarEvento = async () => {
    try {
      if (!userId || !fullName) {
        Alert.alert('Error', 'Usuario no válido');
        return;
      }

      if (!selectedEvents.length) {
        Alert.alert('Error', 'No hay eventos seleccionados');
        return;
      }

      const db = getFirestore(firebaseApp);
      const userRef = doc(db, 'users', userId);

      for (const eventId of selectedEvents) {
        const eventoRef = doc(db, 'eventos', eventId);

        await runTransaction(db, async transaction => {
          const eventoSnap = await transaction.get(eventoRef);
          const userSnap = await transaction.get(userRef);

          if (!eventoSnap.exists()) {
            throw new Error('EVENT_NOT_FOUND');
          }

          if (!userSnap.exists()) {
            throw new Error('USER_NOT_FOUND');
          }

          const evento = eventoSnap.data();
          const users = evento.users || [];

          // ⛔ ya inscrito
          if (users.some(u => u.uid === userId)) {
            throw new Error('ALREADY_REGISTERED');
          }

          // ⛔ capacidad llena
          if (evento.capacity && users.length >= evento.capacity) {
            throw new Error('EVENT_FULL');
          }

          const userData = {
            uid: userId,
            fullName,
          };

          /* ---------- ACTUALIZAR EVENTO ---------- */
          transaction.update(eventoRef, {
            users: [...users, userData],
          });

          /* ---------- ACTUALIZAR USUARIO ---------- */
          const reservas = userSnap.data().reservas || [];

          if (!reservas.some(r => r.eventId === eventId)) {
            transaction.update(userRef, {
              reservas: [
                ...reservas,
                {
                  eventId,
                  title: evento.title,
                  date: evento.date,
                  reservedAt: Timestamp.now(),
                },
              ],
            });
          }
        });
      }

      Alert.alert('Reserva exitosa', 'Te uniste a los eventos');
      setSelectedEvents([]);
      dispatch(fetchEventos());
    } catch (error) {
      console.error(error);

      const map = {
        USER_NOT_FOUND: 'Usuario no encontrado',
        EVENT_NOT_FOUND: 'Evento no encontrado',
        EVENT_FULL: 'Evento lleno',
        ALREADY_REGISTERED: 'Ya estás inscrito',
      };

      Alert.alert('Error', map[error.message] || 'Error inesperado');
    }
  };

  /* ---------------- UTIL ---------------- */

  const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

  /* ---------------- SEMICALENDARIO ---------------- */

  const weekDays = Array.from({length: 7}).map((_, index) =>
    moment().add(index, 'day'),
  );

  const onSelectDay = day => {
    if (selectedDate && day.isSame(selectedDate, 'day')) {
      setSelectedDate(null);
      setNewEventDate(new Date());
    } else {
      setNewEventDate(new Date(day));
      setSelectedDate(day);
    }
  };

  /* ---------------- EVENTOS ORDENADOS ---------------- */

  const eventosOrdenados = [...list].sort((a, b) =>
    moment(a.date?.toDate?.() || a.date).diff(
      moment(b.date?.toDate?.() || b.date),
    ),
  );

  const eventosFinales = selectedDate
    ? eventosOrdenados.filter(e => moment(e.date).isSame(selectedDate, 'day'))
    : eventosOrdenados;

  /* ---------------- SELECT EVENTO ---------------- */

  const toggleEvent = id => {
    setSelectedEvents(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id],
    );
  };

  /* ---------------- RENDER EVENTO ---------------- */

  const renderEvento = ({item}) => {
    const isSelected = selectedEvents.includes(item.id);

    return (
      <TouchableOpacity
        style={isSelected ? styles.cardSelected : styles.card}
        onPress={() => toggleEvent(item.id)}
        onLongPress={() => setEventModal(item)}>
        <TouchableOpacity
          style={{position: 'absolute', right: 10, top: 10}}
          onPress={() => setEventModal(item)}>
          <Image
            style={{
              height: 15,
              width: 15,
            }}
            source={require('/Users/wolfcore/Documents/ParceApp/assets/informacion.png')}
          />
        </TouchableOpacity>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center',
          }}>
          <View
            style={{
              flexDirection: 'column',
            }}>
            <Text style={styles.cardDateText}>{item.title}</Text>
            <Text style={styles.cardTimeText}>
              {capitalize(moment(item.date).format('dddd'))},{' '}
              {moment(item.date).format('D')} de{' '}
              {capitalize(moment(item.date).format('MMMM'))}
            </Text>
            <Text style={styles.cardTimeText}>
              {moment(item.hour?.toDate?.() || item.hour).format('hh:mm A')}
            </Text>
          </View>
          {isSelected && (
            <Image
              style={{
                height: 35,
                width: 35,
              }}
              source={require('/Users/wolfcore/Documents/ParceApp/assets/controlar.png')}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- CARD CREAR EVENTO ---------------- */

  const renderCreateCard = () => (
    <TouchableOpacity
      style={[styles.cardNuevoEvento, {borderStyle: 'dashed', borderWidth: 2}]}
      onPress={() => setCreateModal(true)}>
      <Image
        style={{
          height: 20,
          width: 20,
          marginRight: 15,
        }}
        source={require('/Users/wolfcore/Documents/ParceApp/assets/anadir-invert.png')}
      />
      <Text style={styles.titleNuevoEvento}>Crear nuevo evento</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#2b2b2bff'}}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.titleText}>Hola {fullName}</Text>
        </View>

        <Text style={styles.subtitleText}>¡Reserva tu próximo evento!</Text>

        {/* ---------- SEMICALENDARIO ---------- */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
          {weekDays.map(day => {
            const isSelected = selectedDate && day.isSame(selectedDate, 'day');

            return (
              <TouchableOpacity
                key={day.format('YYYY-MM-DD')}
                onPress={() => onSelectDay(day)}
                style={{
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isSelected
                    ? 'rgba(255,255,255,0.15)'
                    : 'transparent',
                }}>
                <Text style={{color: isSelected ? '#fff' : '#aaa'}}>
                  {capitalize(day.format('dd'))}
                </Text>
                <Text
                  style={{
                    color: isSelected ? '#fff' : '#aaa',
                    fontSize: 16,
                  }}>
                  {day.format('D')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---------- LISTA ---------- */}
        <FlatList
          data={[{id: 'create'}, ...eventosFinales]}
          keyExtractor={item => item.id}
          renderItem={({item}) =>
            item.id === 'create' ? renderCreateCard() : renderEvento({item})
          }
          style={{height: selectedEvents.length > 0 ? '55%' : '65%'}}
        />

        {/* ---------- BOTÓN RESERVAR ---------- */}
        {selectedEvents.length > 0 && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => reservarEvento()}>
            <Text style={styles.confirmButtonText}>
              Reservar ({selectedEvents.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Footer navigation={navigation} />

      {/* ---------- MODAL INFO EVENTO ---------- */}

      {eventModal && (
        <Modal transparent animationType="slide">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setEventModal(null)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}>
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                marginTop: 'auto',
              }}>
              <View
                style={{
                  width: 40,
                  height: 5,
                  backgroundColor: '#ccc',
                  borderRadius: 5,
                  alignSelf: 'center',
                  marginBottom: 10,
                }}
              />

              <Text style={{fontSize: 20, fontWeight: 'bold'}}>
                {eventModal.title}
              </Text>

              <Text style={{marginTop: 5, color: '#555'}}>
                {capitalize(moment(eventModal.date).format('dddd'))},{' '}
                {moment(eventModal.date).format('D')} de{' '}
                {capitalize(moment(eventModal.date).format('MMMM'))}
              </Text>

              <Text style={{marginTop: 5, color: '#555'}}>
                {moment(eventModal.hour).format('HH:MM A')}
              </Text>

              <Text style={{marginTop: 15, color: '#333'}}>
                {eventModal.description}
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#000',
                  padding: 15,
                  borderRadius: 25,
                  marginTop: 20,
                  alignItems: 'center',
                }}
                onPress={() => {
                  toggleEvent(eventModal.id);
                  setEventModal(null);
                }}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>
                  Unirme a este evento
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ---------- MODAL CREAR EVENTO ---------- */}
      <Modal visible={createModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{flex: 1}}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setCreateModal(false)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: '#eaeaeaff',
                marginTop: 'auto',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '90%',
              }}>
              <ScrollView
                contentContainerStyle={{padding: 20}}
                keyboardShouldPersistTaps="handled">
                {/* CLOSE */}
                <TouchableOpacity
                  onPress={() => setCreateModal(false)}
                  style={{
                    position: 'absolute',
                    right: 15,
                    top: 15,
                    zIndex: 10,
                  }}>
                  <Image
                    style={{height: 20, width: 20}}
                    source={require('/Users/wolfcore/Documents/ParceApp/assets/x.png')}
                  />
                </TouchableOpacity>

                <Text style={[styles.cardDateText, {marginBottom: 15}]}>
                  Crear evento
                </Text>

                {/* TÍTULO */}
                <Text style={styles.cardTitles}>Título</Text>
                <TextInput
                  placeholder="Título del evento"
                  style={[styles.cardInputs, {marginBottom: 15}]}
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                />

                {/* FECHA */}
                <Text style={styles.cardTitles}>Fecha</Text>
                <TouchableOpacity
                  style={[styles.cardInputs, {marginBottom: 15}]}
                  onPress={() => setOpenNewEventDate(true)}>
                  <Text style={styles.cardValues}>
                    {capitalize(moment(newEventDate).format('MMMM, DD'))}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  modal
                  mode="date"
                  minimumDate={new Date()}
                  open={openNewEventDate}
                  date={newEventDate}
                  onConfirm={date => {
                    setOpenNewEventDate(false);
                    setNewEventDate(date);
                  }}
                  onCancel={() => setOpenNewEventDate(false)}
                />

                {/* HORA */}
                <Text style={styles.cardTitles}>Hora</Text>
                <TouchableOpacity
                  style={[styles.cardInputs, {marginBottom: 15}]}
                  onPress={() => setOpenNewEventHour(true)}>
                  <Text style={styles.cardValues}>
                    {moment(newEventHour).format('hh:mm A')}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  modal
                  mode="time"
                  open={openNewEventHour}
                  date={newEventHour}
                  onConfirm={hour => {
                    setOpenNewEventHour(false);
                    setNewEventHour(hour);
                  }}
                  onCancel={() => setOpenNewEventHour(false)}
                />

                {/* DESCRIPCIÓN */}
                <Text style={styles.cardTitles}>Descripción</Text>
                <TextInput
                  placeholder="¿Una descripción sobre el evento?"
                  style={[styles.cardInputs, {marginBottom: 15, height: 80}]}
                  multiline
                  value={newEventDescription}
                  onChangeText={setNewEventDescription}
                />

                {/* DIRECCIÓN */}
                <Text style={styles.cardTitles}>Dirección</Text>
                <TextInput
                  placeholder="¿Dónde será el evento?"
                  style={[styles.cardInputs, {marginBottom: 15}]}
                  value={newEventDirection}
                  onChangeText={setNewEventDirection}
                />

                {/* CAPACIDAD */}
                <Text style={styles.cardTitles}>Capacidad</Text>
                <TextInput
                  placeholder="Límite de personas"
                  style={[styles.cardInputs, {marginBottom: 25}]}
                  keyboardType="numeric"
                  value={newEventCapacity}
                  onChangeText={setNewEventCapacity}
                />

                {/* BOTÓN */}
                <TouchableOpacity
                  onPress={() => {
                    crearEvento();
                  }}
                  style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Crear evento</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default OtrosEventosScreen;
