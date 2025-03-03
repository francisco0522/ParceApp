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
  const [fullName, setFullName] = useState('');
  const [emailText, setEmailText] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();

  const onFooterLinkPress = () => {
    navigation.navigate('LoginScreen');
  };

  const onRegisterPress = async () => {
    if (password !== confirmPassword) {
      alert("Passwords don't match.");
    }

    const auth = getAuth(firebaseApp);
    createUserWithEmailAndPassword(auth, emailText, password)
      .then(async userCredential => {
        // Signed up
        // const user = userCredential.user;
        const uid = userCredential.user.uid;
        alert(emailText + ' Created!');

        // Add a new document in collection "cities" with ID 'LA'
        try {
          const db = getFirestore(firebaseApp);
          const userCollectionRef = collection(db, 'users'); // Replace with your desired collection name

          // Replace hardcoded data with user-provided or dynamic values
          const userData = {
            id: uid,
            emailText,
            fullName,
            password,
          };

          const docRef = await addDoc(userCollectionRef, userData);
          dispatch(setId(uid));
          dispatch(setName(fullName));
          dispatch(setEmail(emailText));
          await AsyncStorage.setItem('fullName', fullName);
          await AsyncStorage.setItem('email', emailText);
          await AsyncStorage.setItem('id', uid);
          await AsyncStorage.setItem('userStatus', 'Login');
          navigation.replace('ProfileCreationScreen');
        } catch (error) {
          console.error('Error adding document:', error);
          // Handle errors appropriately, e.g., display an error message to the user
        }
      })
      .catch(error => {
        console.log(error);
        const errorCode = error.code;
        const errorMessage = error.message;
        // ..
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1, width: '100%'}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Image style={styles.logo} source={Logo} />
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="#aaaaaa"
          onChangeText={text => setFullName(text)}
          value={fullName}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
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
        <TextInput
          style={styles.input}
          placeholderTextColor="#aaaaaa"
          secureTextEntry
          placeholder="Confirmar Contraseña"
          onChangeText={text => setConfirmPassword(text)}
          value={confirmPassword}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => onRegisterPress()}>
          <Text style={styles.buttonTitle}>Crear Cuenta</Text>
        </TouchableOpacity>
        <View style={styles.footerView}>
          <Text style={styles.footerText}>
            Ya tienes cuenta?{' '}
            <Text onPress={onFooterLinkPress} style={styles.footerLink}>
              Ingresar
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
