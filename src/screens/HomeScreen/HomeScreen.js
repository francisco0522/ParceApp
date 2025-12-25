import {useEffect, useState} from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {firebaseApp} from '../../firebase/config';
import {
  TouchableOpacity,
  Text,
  SafeAreaView,
  Image,
  View,
  Alert,
} from 'react-native';
import Footer from '../Footer/Footer';
import styles from './styles';
import {FlatList} from 'react-native-gesture-handler';
import {useSelector} from 'react-redux';

const HomeScreen = ({navigation}) => {
  const name = useSelector(state => state.user.name);
  const id = useSelector(state => state.user.id);
  const [userReservation, setUserReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserReservation = async () => {
      const db = getFirestore(firebaseApp);
      const reservasRef = collection(db, 'reservas');

      const snapshot = await getDocs(reservasRef);

      const reservation = snapshot.docs.find(doc =>
        doc.data().users.some(u => u.id === id),
      );

      if (reservation) {
        setUserReservation(reservation.data());
      }

      setLoading(false);
    };

    if (id) checkUserReservation();
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.headerButton}>
          <Image
            style={{height: 30, width: 30}}
            source={require('/Users/wolfcore/Documents/ParceApp/assets/pregunta.png')}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <Image
            style={styles.iconButton2}
            source={require('/Users/wolfcore/Documents/ParceApp/assets/notificacion.png')}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.titleText}>Bienvenido {name},</Text>
      <Text style={styles.subtitleText}>¿A que plan quieres asistir?</Text>

      <View style={styles.gridOptions}>
        <View style={styles.rowGrid}>
          {!userReservation ? (
            <TouchableOpacity
              style={styles.button1}
              onPress={() => navigation.navigate('MiercolesCenaScreen')}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                }}
                source={require('/Users/wolfcore/Documents/ParceApp/assets/comer.png')}
              />
              <Text style={styles.textButton}>Reservar cena</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.button1}
              onPress={() => navigation.navigate('MiercolesCenaScreen')}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                }}
                source={require('/Users/wolfcore/Documents/ParceApp/assets/comer.png')}
              />
              <Text style={styles.textButton}>Proxima cena</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.button2}
            onPress={() => navigation.navigate('OtrosEventosScreen')}>
            <Image
              style={{
                height: 40,
                width: 40,
              }}
              source={require('/Users/wolfcore/Documents/ParceApp/assets/evento.png')}
            />
            <Text style={styles.textButton}>Otros Eventos</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rowGrid}>
          <TouchableOpacity
            style={styles.button3}
            onPress={() => navigation.navigate('SabadoBrunchScreen')}>
            <Image
              style={{
                height: 40,
                width: 40,
              }}
              source={require('/Users/wolfcore/Documents/ParceApp/assets/calendario.png')}
            />
            <Text style={styles.textButton}>Mis Reservas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button4}
            onPress={() => navigation.navigate('ProfileScreen')}>
            <Image
              style={{
                height: 40,
                width: 40,
              }}
              source={require('/Users/wolfcore/Documents/ParceApp/assets/perfil.png')}
            />
            <Text style={styles.textButton}>Mi perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* <Footer navigation={navigation} /> */}
    </SafeAreaView>
  );
};

export default HomeScreen;
