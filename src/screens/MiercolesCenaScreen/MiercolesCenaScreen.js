import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, Image, View, Alert} from 'react-native';
import Footer from '../Footer/Footer';
import styles from './styles';
import {FlatList} from 'react-native-gesture-handler';
import moment from 'moment';
import {SafeAreaView} from 'react-native-safe-area-context';

import 'moment/locale/es';
moment.locale('es');
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import {useSelector} from 'react-redux';
import {firebaseApp} from '../../firebase/config';

const MiercolesCenaScreen = ({navigation}) => {
  const [selected, setSelected] = useState('');
  const [dates, setDates] = useState([]);
  const userId = useSelector(state => state.user.id);
  const fullName = useSelector(state => state.user.name);
  const toggleSelect = id => {
    setSelected(id);
  };

  useEffect(() => {
    const dates = getNextWednesdays();
    setDates(dates);
  }, []);

  const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

  const getNextWednesdays = () => {
    const results = [];
    const startDate = moment().add(2, 'days');

    let current = startDate.clone();
    const targetDay = 3; // miércoles

    if (current.day() !== targetDay) {
      current = current.day(targetDay);
      if (current.isBefore(startDate)) {
        current.add(1, 'week');
      }
    }

    for (let i = 0; i < 3; i++) {
      let dateToUse = current.clone();

      // 🔥 Regla especial: si cae 24 o 31 diciembre → mover al día anterior (martes)
      const isChristmasEve =
        dateToUse.date() === 24 && dateToUse.month() === 11; // diciembre = 11
      const isNYE = dateToUse.date() === 31 && dateToUse.month() === 11; // diciembre = 11

      if (isChristmasEve || isNYE) {
        dateToUse.subtract(1, 'day'); // lo mueve al martes 23 o 30
      }

      results.push({
        id: `${i}`,
        day: capitalize(dateToUse.format('dddd')),
        date: dateToUse.format('D'),
        month: capitalize(dateToUse.format('MMMM')),
        time: '7:00 PM',
      });

      current = current.clone().add(1, 'week'); // siguiente miércoles
    }

    return results;
  };

  const reservar = async selectedDate => {
    console.log(userId);
    console.log(fullName);
    try {
      const db = getFirestore(firebaseApp);
      const reservasRef = collection(db, 'reservas');

      if (!userId || !fullName) {
        Alert.alert('Error', 'Usuario no válido');
        return;
      }

      const userData = {id: userId, fullName};

      // 🔍 buscar documento del día
      const q = query(
        reservasRef,
        where('day', '==', selectedDate.date),
        where('month', '==', selectedDate.month),
      );

      const querySnapshot = await getDocs(q);

      let reservaRef;

      if (!querySnapshot.empty) {
        reservaRef = doc(db, 'reservas', querySnapshot.docs[0].id);
      } else {
        // crear ref manual para la transacción
        reservaRef = doc(reservasRef);
      }

      await runTransaction(db, async transaction => {
        const reservaSnap = await transaction.get(reservaRef);

        // 🆕 no existe → crear
        if (!reservaSnap.exists()) {
          transaction.set(reservaRef, {
            dayNumber: selectedDate.day,
            day: selectedDate.date,
            month: selectedDate.month,
            users: [userData],
            maxUsers: 6,
          });
          return;
        }

        const reserva = reservaSnap.data();

        // ⛔ cupos llenos
        if (reserva.users.length >= reserva.maxUsers) {
          throw new Error('FULL');
        }

        // ⛔ duplicado
        const alreadyExists = reserva.users.some(user => user.id === userId);

        if (alreadyExists) {
          throw new Error('DUPLICATE');
        }

        // ✅ agregar usuario
        transaction.update(reservaRef, {
          users: [...reserva.users, userData],
        });
      });

      Alert.alert('Reserva confirmada', 'Reserva realizada con éxito');
    } catch (error) {
      if (error.message === 'FULL') {
        Alert.alert('Cupos llenos', 'Esta cena ya no tiene cupos');
      } else if (error.message === 'DUPLICATE') {
        Alert.alert('Ya registrado', 'Ya tienes una reserva este día');
      } else {
        console.error(error);
        Alert.alert('Error', 'No se pudo realizar la reserva');
      }
    }
  };

  const renderCard = ({item}) => {
    const isSelected = selected.includes(item.id);
    console.log(isSelected);
    return (
      <TouchableOpacity
        style={isSelected ? styles.cardSelected : styles.card}
        onPress={() => toggleSelect(item.id)}>
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
            <Text
              style={
                isSelected ? styles.cardDateTextSelected : styles.cardDateText
              }>
              {item.day}, {item.date} de {item.month}
            </Text>
            <Text
              style={
                isSelected ? styles.cardTimeTextSelected : styles.cardTimeText
              }>
              {item.time}
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

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#2b2b2bff'}}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titleText}>Hola {fullName}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton}>
              <Image
                style={{height: 30, width: 30}}
                source={require('/Users/wolfcore/Documents/ParceApp/assets/pregunta.png')}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Image
                style={{height: 20, width: 20}}
                source={require('/Users/wolfcore/Documents/ParceApp/assets/notificacion.png')}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subtitleText}>¡Reserva tu próxima cena!</Text>

        <View style={styles.cardsContainer}>
          <FlatList
            scrollEnabled={false}
            data={dates}
            keyExtractor={item => item.id}
            renderItem={renderCard}
          />
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() =>
            Alert.alert(
              'Confirmar Reserva',
              `Quieres reservar para 'el dia' \n\n ${
                dates[selected].day +
                ' ' +
                dates[selected].date +
                ' de ' +
                dates[selected].month
              } 
               `,
              [
                {
                  text: 'Cancel',
                  onPress: () => console.log('Cancel Pressed'),
                  style: 'cancel',
                },
                {text: 'OK', onPress: () => reservar(dates[selected])},
              ],
            )
          }>
          <Text style={styles.confirmButtonText}>Reservar</Text>
        </TouchableOpacity>
      </View>

      <Footer navigation={navigation} />
    </SafeAreaView>
  );
};

export default MiercolesCenaScreen;
