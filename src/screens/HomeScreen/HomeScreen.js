import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

const HomeScreen = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text style={styles.title}>Juan Pérez</Text>
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
            onPress={() => navigation.navigate('LoginScreen')}>
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
