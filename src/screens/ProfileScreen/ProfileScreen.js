import React from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import {Card, Avatar} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector, useDispatch} from 'react-redux';

const ProfileScreen = ({navigation}) => {
  const name = useSelector(state => state.user.name);
  const birthDate = useSelector(state => state.user.birthDate);
  const phone = useSelector(state => state.user.phone);
  const email = useSelector(state => state.user.email);

  const user = {
    name: name,
    birthDate: birthDate,
    email: email,
    phone: phone,
    profilePic: 'https://randomuser.me/api/portraits/men/1.jpg',
  };
  console.log(user);
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.buttonReturn}
        onPress={() => navigation.navigate('HomeScreen')}>
        <Text style={styles.buttonText}>Volver</Text>
      </TouchableOpacity>
      <View style={styles.cardContainer}>
        <View style={styles.profileHeader}>
          <Avatar.Image size={80} source={{uri: user.profilePic}} />
          <Text style={styles.name}>{user.name}</Text>
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.info}>🎂 {user.birthDate}</Text>
            <Text style={styles.info}>📧 {user.email}</Text>
            <Text style={styles.info}>📱 {user.phone}</Text>
          </Card.Content>
        </Card>
        <TouchableOpacity
          style={styles.buttonProfileCreation}
          onPress={() => navigation.navigate('ProfileCreationScreen')}>
          <Text style={styles.buttonText}>Formulario</Text>
          Formulario
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b39c8b',
  },
  cardContainer: {
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: '#b39c8b',
  },
  buttonReturn: {
    width: 100,
    marginLeft: 10,
    marginTop: 50,
    height: 50,
    borderRadius: 20,
    borderColor: 'white',
    backgroundColor: '#3293a8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '90%',
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
    margin: 2,
  },
  buttonProfileCreation: {
    marginTop: 50,
    width: '60%',
    height: 50,
    borderRadius: 20,
    borderColor: 'white',
    backgroundColor: '#3293a8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {color: 'white', fontSize: 15, fontWeight: 600},
});

export default ProfileScreen;
