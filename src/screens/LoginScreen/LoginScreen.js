import React, {useEffect, useState} from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
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
import {setId, setName, setEmail} from '../../slices/userSlice';
import {useSelector, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({navigation}) {
  const [emailText, setEmailText] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const onFooterLinkPress = () => {
    navigation.navigate('RegistrationScreen');
  };

  useEffect(() => {}, []);

  const onLoginPress = async () => {
    const auth = getAuth(firebaseApp);

    signInWithEmailAndPassword(auth, emailText, password)
      .then(async response => {
        const uid = response.user.uid;
        const db = getFirestore(firebaseApp);
        const q = query(collection(db, 'users'), where('id', '==', uid));

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async document => {
          const docID = document.id;
          const docRef = doc(db, 'users', docID);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            dispatch(setName(data.fullName));
            dispatch(setEmail(data.emailText));
            dispatch(setId(data.id));
            await AsyncStorage.setItem('fullName', data.fullName);
            //await AsyncStorage.setItem('email', data.email);
            await AsyncStorage.setItem('id', data.id);
            await AsyncStorage.setItem('userStatus', 'Login');
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
        <Image
          style={styles.logo}
          source={require('../../../assets/logo.png')}
        />
        <TextInput
          style={styles.input}
          placeholder="Correo Electronico"
          placeholderTextColor="#aaaaaa"
          onChangeText={text => setEmailText(text)}
          value={emailText}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
        />
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
        <TouchableOpacity style={styles.button} onPress={() => onLoginPress()}>
          <Text style={styles.buttonTitle}>Iniciar Sesión</Text>
        </TouchableOpacity>
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
