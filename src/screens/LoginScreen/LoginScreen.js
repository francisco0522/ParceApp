import React, {useEffect, useState} from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import styles from './styles';
import {getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import {firebaseApp} from '../../firebase/config';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from 'firebase/firestore';
import {
  setId,
  setName,
  setEmail,
  setBirthDate,
  setPhone,
} from '../../slices/userSlice';
import {useSelector, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({navigation}) {
  // Estado local para los campos del formulario de acceso.
  const [emailText, setEmailText] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  // Navega a la pantalla de registro cuando el usuario no tiene cuenta.

  const onFooterLinkPress = () => {
    navigation.navigate('RegistrationScreen');
  };

  useEffect(() => {}, []);

  const onLoginPress = async () => {
    // Inicializa autenticación con Firebase para validar credenciales.
    const auth = getAuth(firebaseApp);

    signInWithEmailAndPassword(auth, emailText, password)
      .then(async response => {
        // Obtiene el UID autenticado para buscar el perfil en Firestore.
        const uid = response.user.uid;
        const db = getFirestore(firebaseApp);
        const q = query(collection(db, 'users'), where('id', '==', uid));

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async document => {
          // Carga documento completo del usuario para poblar estado global y almacenamiento local.
          const docID = document.id;
          const docRef = doc(db, 'users', docID);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            // Guarda datos del usuario en Redux para uso en toda la aplicación.
            dispatch(setName(data.fullName));
            dispatch(setEmail(data.emailText));
            dispatch(setBirthDate(data.birthDate));
            dispatch(setPhone(data.phone));
            dispatch(setId(data.id));
            // Persiste datos mínimos en AsyncStorage para mantener sesión entre reinicios.
            await AsyncStorage.setItem('fullName', data.fullName);
            await AsyncStorage.setItem('email', data.emailText);
            await AsyncStorage.setItem('id', data.id);
            await AsyncStorage.setItem('phone', data.phone);
            await AsyncStorage.setItem('birthDate', data.birthDate);
            await AsyncStorage.setItem('userStatus', 'Login');
            console.log('aqui');
            // Reemplaza la pantalla actual para evitar volver al login con botón atrás.
            navigation.replace('HomeScreen');
          } else {
            // docSnap.data() will be undefined in this case
          }
        });
      })
      .catch(error => {
        alert('No se encontro el usuario con correo ' + emailText);
        // ..
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1, width: '100%'}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Identidad visual de la app en el acceso */}
        <Image
          style={styles.logo}
          source={require('../../../assets/logo.png')}
        />
        {/* Campo de correo */}
        <TextInput
          style={styles.input}
          placeholder="Correo Electronico"
          placeholderTextColor="#aaaaaa"
          onChangeText={text => setEmailText(text)}
          value={emailText}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
        />
        {/* Campo de contraseña */}
        <TextInput
          style={styles.input}
          placeholderTextColor="#aaaaaa"
          secureTextEntry
          placeholder="Contraseña"
          onChangeText={text => setPassword(text)}
          value={password}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
        />
        {/* Acción principal para iniciar sesión */}
        <TouchableOpacity style={styles.button} onPress={() => onLoginPress()}>
          <Text style={styles.buttonTitle}>Iniciar Sesión</Text>
        </TouchableOpacity>
        {/* Acceso secundario para registro */}
        <View style={styles.footerView}>
          <Text style={styles.footerText}>
            No tienes cuenta?{' '}
            <Text onPress={onFooterLinkPress} style={styles.footerLink}>
              Registrarse
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
