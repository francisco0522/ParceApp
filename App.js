import 'react-native-gesture-handler';
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {
  LoginScreen,
  RegistrationScreen,
  SplashScreen,
  ProfileCreationScreen,
  ProfileScreen,
  HomeScreen,
  Footer,
  MiercolesCenaScreen,
  OtrosEventosScreen,
  MyAgendaScreen,
} from './src/screens/index.js';
import {decode, encode} from 'base-64';
import rootReducer from './src/app/rooReducer.js';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';

if (!global.btoa) {
  global.btoa = encode;
}
if (!global.atob) {
  global.atob = decode;
}
const store = configureStore({reducer: rootReducer});

const Stack = createStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen name="SplashScreen" component={SplashScreen} />
          <Stack.Screen name="Footer" component={Footer} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen
            name="RegistrationScreen"
            component={RegistrationScreen}
          />
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen
            name="MiercolesCenaScreen"
            component={MiercolesCenaScreen}
          />

          <Stack.Screen
            name="OtrosEventosScreen"
            component={OtrosEventosScreen}
          />
          <Stack.Screen name="MyAgendaScreen" component={MyAgendaScreen} />
          <Stack.Screen
            name="ProfileCreationScreen"
            component={ProfileCreationScreen}
          />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
