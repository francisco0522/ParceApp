import React, {useState} from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
} from 'react-native';
import styles from './styles';
import {getAuth, createUserWithEmailAndPassword} from 'firebase/auth';
import {firebaseApp} from '../../firebase/config';
import {getFirestore, collection, addDoc} from 'firebase/firestore';
import {useDispatch} from 'react-redux';
//SLICES
import {setId, setName, setEmail} from '../../slices/userSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../../../assets/logo.png';
import {useNavigation} from '@react-navigation/native';
export default function RegistrationScreen({navigation}) {
  const [numero, setNumero] = useState(1);
  const dispatch = useDispatch();

  const onFooterLinkPress = () => {
    navigation.navigate('LoginScreen');
  };

  const next = () => {
    if (numero == 10) {
      navigation.replace('ProfileScreen');
    }
    setNumero(numero + 1);
  };

  const prev = () => {
    setNumero(numero - 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1, width: '100%'}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.containerTitle}>
          <Text style={styles.title}>Cuentanos un poco sobre ti</Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.title}>Pregunta {numero}</Text>

          <TouchableOpacity style={styles.button} onPress={() => next()}>
            <Text style={styles.buttonTitle}>Opcion 1</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => next()}>
            <Text style={styles.buttonTitle}>Opcion 2</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
