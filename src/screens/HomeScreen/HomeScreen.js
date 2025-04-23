import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({navigation}) => {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text style={styles.title}>Tu próxima cita te espera</Text>
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.navigate('ProfileScreen')}>
            Perfil
          </Button>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.navigate('Chat')}>
            Chat
          </Button>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.navigate('Appointment')}>
            Próxima Cita
          </Button>

          <Button
            mode="contained"
            style={styles.button}
            onPress={async () => close()}>
            Salir
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '80%',
  },
  button: {
    marginVertical: 10,
  },
});

export default HomeScreen;
