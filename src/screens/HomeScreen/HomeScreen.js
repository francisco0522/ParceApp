import React, {useState} from 'react';
import {
  TouchableOpacity,
  Text,
  SafeAreaView,
  Image,
  View,
  Alert,
} from 'react-native';
import Footer from '../Footer/Footer';
import styles from './styles';
import {FlatList} from 'react-native-gesture-handler';
import {useSelector} from 'react-redux';

const HomeScreen = ({navigation}) => {
  const name = useSelector(state => state.user.name);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titleText}>Bienvenido {name}</Text>
      <View style={styles.gridOptions}>
        <View style={styles.rowGrid}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('MiercolesCenaScreen')}>
            <Text style={styles.iconButton}>🍴</Text>
            <Text style={styles.textButton}>Miercoles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ViernesCasualScreen')}>
            <Text style={styles.iconButton}>🍻</Text>
            <Text style={styles.textButton}>Viernes</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rowGrid}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('SabadoBrunchScreen')}>
            <Text style={styles.iconButton}>🥐</Text>
            <Text style={styles.textButton}>Sábado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('SabadoFiestaScreen')}>
            <Text style={styles.iconButton}>🎉</Text>
            <Text style={styles.textButton}>Sábado</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Footer navigation={navigation} />
    </SafeAreaView>
  );
};

export default HomeScreen;
