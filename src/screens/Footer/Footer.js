import React from 'react';
import {SafeAreaView, Text, TouchableOpacity} from 'react-native';
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
        onPress={() => navigation.navigate('ProfileScreen')}>
        <Text style={styles.buttonText}>👤</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Chat')}>
        <Text style={styles.buttonText}>💬</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Appointment')}>
        <Text style={styles.buttonText}>📅</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={async () => close()}>
        <Text style={styles.buttonText}>🚪</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Footer;
