import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {Card, Avatar, Button} from 'react-native-paper';
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

  return (
    <SafeAreaView style={styles.container}>
      <Button
        mode="contained"
        style={styles.buttonReturn}
        onPress={() => navigation.navigate('HomeScreen')}>
        Volver
      </Button>
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
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: '#78a28c',
  },
  buttonReturn: {
    width: 100,
    marginLeft: 10,
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
    marginTop: 100,
    width: 'auto',
    marginLeft: 10,
  },
});

export default ProfileScreen;
