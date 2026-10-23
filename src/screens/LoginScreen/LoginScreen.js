import React, {useRef, useState} from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import styles from './styles';
import {login, resetToSession, sessionError} from '../../services/session';
import {setUser} from '../../slices/userSlice';
import {useDispatch} from 'react-redux';

export default function LoginScreen({navigation}) {
  const [emailText, setEmailText] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();

  const onFooterLinkPress = () => {
    navigation.navigate('RegistrationScreen');
  };

  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const onLoginPress = async () => {
    if (pending.current) {
      return;
    }
    if (!emailText.trim() || !password) {
      Alert.alert('Error', 'Ingresa tu correo y contraseña');
      return;
    }
    pending.current = true;
    setSubmitting(true);
    try {
      const profile = await login(emailText, password);
      dispatch(setUser(profile));
      resetToSession(navigation, profile);
    } catch (error) {
      Alert.alert('Error', sessionError(error));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
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
          keyboardType="email-address"
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
        <TouchableOpacity
          style={styles.button}
          disabled={submitting}
          onPress={onLoginPress}>
          <Text style={styles.buttonTitle}>
            {submitting ? 'Ingresando…' : 'Iniciar Sesión'}
          </Text>
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
