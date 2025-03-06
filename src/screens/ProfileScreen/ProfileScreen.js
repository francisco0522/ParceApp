import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {Card, Avatar, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

const ProfileScreen = ({navigation}) => {
  const user = {
    name: 'Juan Pérez',
    birthDate: '15 de Marzo de 1995',
    email: 'juanperez@email.com',
    phone: '+57 300 123 4567',
    profilePic: 'https://randomuser.me/api/portraits/men/1.jpg',
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button
        mode="contained"
        style={styles.buttonReturn}
        onPress={() => navigation.navigate('HomeScreen')}>
        Volver
      </Button>
      <View style={styles.cardContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Image size={80} source={{uri: user.profilePic}} />
              <Text style={styles.name}>{user.name}</Text>
            </View>
            <Text style={styles.info}>🎂 {user.birthDate}</Text>
            <Text style={styles.info}>📧 {user.email}</Text>
            <Text style={styles.info}>📱 {user.phone}</Text>
          </Card.Content>
        </Card>
        <Button
          mode="contained"
          style={styles.buttonProfileCreation}
          onPress={() => navigation.navigate('ProfileCreationScreen')}>
          Formulario
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#78a28c',
  },
  cardContainer: {
    paddingTop: 100,
    alignItems: 'center',
    backgroundColor: '#78a28c',
  },
  buttonReturn: {
    width: 100,
    marginLeft: 10,
  },
  card: {
    width: '90%',
    padding: 20,
    borderRadius: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  info: {
    fontSize: 16,
    marginTop: 5,
  },
  buttonProfileCreation: {
    marginTop: 100,
    width: 'auto',
    marginLeft: 10,
  },
});

export default ProfileScreen;
