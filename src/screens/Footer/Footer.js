import React, {useRef, useState} from 'react';
import {SafeAreaView, Text, TouchableOpacity, Image, Alert} from 'react-native';
import styles from './styles';
import {clearEventos} from '../../slices/eventosSlice';
import {logout, sessionError} from '../../services/session';
import {auth} from '../../firebase/config';
import {clearUser} from '../../slices/userSlice';
import {useDispatch} from 'react-redux';

const Footer = ({navigation}) => {
  const dispatch = useDispatch();
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  async function close() {
    if (pending.current) {
      return;
    }
    pending.current = true;
    setSubmitting(true);
    try {
      await logout();
      dispatch(clearUser());
      dispatch(clearEventos());
      navigation.reset({index: 0, routes: [{name: 'LoginScreen'}]});
    } catch (error) {
      if (!auth.currentUser) {
        dispatch(clearUser());
        dispatch(clearEventos());
        navigation.reset({index: 0, routes: [{name: 'LoginScreen'}]});
      }
      Alert.alert('Error', sessionError(error));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }
  return (
    <SafeAreaView style={styles.footer}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('HomeScreen')}>
        <Image
          style={{
            height: 20,
            width: 20,
          }}
          source={require('../../../assets/casa-invert.png')}
        />
        <Text style={styles.textButton}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('MyAgendaScreen')}>
        <Image
          style={{
            height: 30,
            width: 30,
          }}
          source={require('../../../assets/calendario-invert.png')}
        />
        <Text style={styles.textButton}>Mis Reservas</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ProfileScreen')}>
        <Image
          style={{
            height: 30,
            width: 30,
          }}
          source={require('../../../assets/perfil-invert.png')}
        />
        <Text style={styles.textButton}>Mi perfil</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        disabled={submitting}
        onPress={close}>
        <Text style={styles.textButton}>Salir</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Footer;
