/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from 'react';
import {Image, Text, Animated, View, Button, SafeAreaView} from 'react-native';
import styles from './styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch} from 'react-redux';
import {setId, setName, setEmail} from '../../slices/userSlice';

export default function SplashScreen({navigation}) {
  const dispatch = useDispatch();

  const wait = timeout => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  };
  useEffect(() => {
    wait(1000).then(async () => [
      fadeIn(),
      wait(5000).then(() => [
        fadeOut(),
        wait(1000).then(() => continueScreen()),
      ]),
    ]);
  }, []);

  const continueScreen = async () => {
    const userStatus = await AsyncStorage.getItem('userStatus');
    const id = await AsyncStorage.getItem('id');
    const fullName = await AsyncStorage.getItem('fullName');
    const email = await AsyncStorage.getItem('email');

    dispatch(setId(id));
    dispatch(setName(fullName));
    dispatch(setEmail(email));
    if (userStatus == null || userStatus == 'Logout') {
      navigation.replace('LoginScreen');
    } else {
      navigation.replace('HomeScreen');
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    // Will change fadeAnim value to 1 in 5 seconds
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.timing();
  };

  const fadeOut = () => {
    // Will change fadeAnim value to 0 in 3 seconds
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.Image
        source={require('../../../assets/logo.png')}
        style={[
          styles.logo,
          {
            // Bind opacity to animated value
            opacity: fadeAnim,
          },
        ]}
      />
    </SafeAreaView>
  );
}
