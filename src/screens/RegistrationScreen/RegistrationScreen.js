import React, {useRef, useState} from 'react';
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import styles from './styles';
import {register, resetToSession, sessionError} from '../../services/session';
import {useDispatch} from 'react-redux';
import {setUser} from '../../slices/userSlice';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import Logo from '../../../assets/logo.png';
import CameraScanner from '../../utils/CameraScanner';
import {Dropdown} from 'react-native-element-dropdown';

moment.locale('es');

// Validación de complejidad de contraseña (OWASP M3)
const validatePassword = pwd => {
  if (pwd.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!/[0-9]/.test(pwd)) {
    return 'La contraseña debe contener al menos un número';
  }
  if (!/[a-zA-Z]/.test(pwd)) {
    return 'La contraseña debe contener al menos una letra';
  }
  return null;
};

export default function RegistrationScreen({navigation}) {
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailText, setEmailText] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDateInfo] = useState(null);
  const [openBirthDate, setOpenBirthDate] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [genero, setGenero] = useState('');
  const [verificado, setVerificado] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  const generos = [
    {label: 'Hombre', value: 'Hombre'},
    {label: 'Mujer', value: 'Mujer'},
    {label: 'No binario', value: 'No binario'},
    {label: 'Otro', value: 'Otro'},
    {label: 'Prefiero no decirlo', value: 'Prefiero no decirlo'},
  ];

  const dispatch = useDispatch();

  /* ---------------- SCANNER VIEW ---------------- */
  if (showScanner) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: 'black'}}>
        <CameraScanner
          onScan={data => {
            setFullName(data.fullName);
            const {year, month, day} = data;
            const date = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
            );
            setGenero(data.gender);
            setBirthDateInfo(date);
            setVerificado(true);
            // No guardamos el idNumber (número de cédula) — minimización de datos (OWASP M6)
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      </SafeAreaView>
    );
  }

  /* ---------------- UTILS ---------------- */
  const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

  const today = new Date();
  const minAdultDate = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );

  /* ---------------- REGISTER ---------------- */
  const onRegisterPress = async () => {
    if (pending.current) {
      return;
    }
    if (!fullName.trim() || !emailText.trim() || !password || !birthDate) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    // Validar complejidad de contraseña (OWASP M3)
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Contraseña insegura', passwordError);
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText.trim()) ||
      Number.isNaN(birthDate.getTime()) ||
      birthDate > minAdultDate
    ) {
      Alert.alert(
        'Error',
        'Ingresa un correo válido y confirma que eres mayor de edad',
      );
      return;
    }
    pending.current = true;
    setSubmitting(true);
    try {
      const profile = await register({
        fullName,
        email: emailText,
        password,
        birthDate,
      });
      dispatch(setUser(profile));
      resetToSession(navigation, profile);
    } catch (error) {
      Alert.alert('Error', sessionError(error));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1, width: '100%'}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Image style={styles.logo} source={Logo} />
        <ScrollView>
          <Text style={styles.label}>Nombre de Usuario</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={emailText}
            onChangeText={setEmailText}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Text
            style={{
              fontSize: 12,
              color: '#888',
              marginBottom: 8,
              marginTop: -4,
            }}>
            Mínimo 8 caracteres, una letra y un número.
          </Text>

          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setOpenBirthDate(true)}>
            <Text>
              {birthDate
                ? capitalize(moment(birthDate).format('MMMM DD, YYYY'))
                : 'Selecciona tu fecha'}
            </Text>
          </TouchableOpacity>

          <DatePicker
            mode="date"
            modal
            open={openBirthDate}
            date={birthDate || minAdultDate}
            maximumDate={minAdultDate}
            onConfirm={date => {
              setOpenBirthDate(false);
              setBirthDateInfo(date);
            }}
            onCancel={() => setOpenBirthDate(false)}
          />

          <Text style={styles.label}>Genero</Text>
          <Dropdown
            style={[styles.input, isFocus && {borderColor: 'blue'}]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={generos}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder={!isFocus ? 'Selecciona tu genero' : '...'}
            value={genero}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={item => {
              setGenero(item.value);
              setIsFocus(false);
            }}
          />

          <TouchableOpacity
            style={{
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E5EA',
            }}
            onPress={() => setShowScanner(true)}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '600',
                color: verificado ? '#1A7F37' : '#E5E5EA',
              }}>
              {verificado ? '✓ Identidad verificada' : 'Verifica tu identidad'}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              marginTop: 5,
              marginBottom: 30,
              fontSize: 12,
              color: '#E5E5EA',
            }}>
            Escanea tu cédula para autocompletar tu información y acceder a
            beneficios dentro de la App. Podrás usar el nombre que prefieras en
            tu perfil, aunque te recomendamos utilizar tu nombre real para
            generar más confianza y evitar inconvenientes. Tus datos reales
            nunca serán visibles para otros usuarios.
          </Text>

          <TouchableOpacity
            style={styles.button}
            disabled={submitting}
            onPress={onRegisterPress}>
            <Text style={styles.buttonText}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
