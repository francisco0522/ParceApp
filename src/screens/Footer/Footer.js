import React from 'react';
import {SafeAreaView, Text, TouchableOpacity, Image} from 'react-native';
import styles from './styles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Footer = ({navigation}) => {
  async function close() {
    try {
      // Clear sensitive data from AsyncStorage
      const keysToRemove = ['userStatus', 'id', 'fullName', 'email'];
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));

      navigation.navigate('LoginScreen');
    } catch (error) {
      console.error('Error during logout:', error);

      Alert.alert(
        'Error',
        'An error occurred during logout. Please try again.',
      );
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
          source={require('/Users/wolfcore/Documents/ParceApp/assets/casa-invert.png')}
        />
        <Text style={styles.textButton}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ProfileScreen')}>
        <Image
          style={{
            height: 20,
            width: 20,
          }}
          source={require('/Users/wolfcore/Documents/ParceApp/assets/mensajero-invert.png')}
        />
        <Text style={styles.textButton}>Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ProfileScreen')}>
        <Image
          style={{
            height: 30,
            width: 30,
          }}
          source={require('/Users/wolfcore/Documents/ParceApp/assets/calendario-invert.png')}
        />
        <Text style={styles.textButton}>Mis Reservas</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          //navigation.navigate('ProfileScreen')
          close()
        }>
        <Image
          style={{
            height: 30,
            width: 30,
          }}
          source={require('/Users/wolfcore/Documents/ParceApp/assets/perfil-invert.png')}
        />
        <Text style={styles.textButton}>Mi perfil</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Footer;
