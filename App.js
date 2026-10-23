import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from './src/firebase/config';
import {clearUser} from './src/slices/userSlice';
import {clearEventos} from './src/slices/eventosSlice';
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
import ActivityDetailScreen from './src/screens/ActivityDetailScreen/ActivityDetailScreen';
import {decode, encode} from 'base-64';
import rootReducer from './src/app/rooReducer.js';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';

if (!global.btoa) {
  global.btoa = encode;
}
if (!global.atob) {
  global.atob = decode;
}
const store = configureStore({reducer: rootReducer});

const Stack = createStackNavigator();

function SessionGuard({children}) {
  const dispatch = useDispatch();
  useEffect(
    () =>
      onAuthStateChanged(auth, user => {
        if (!user) {
          dispatch(clearUser());
          dispatch(clearEventos());
        }
      }),
    [dispatch],
  );
  return children;
}

function protect(Screen) {
  return function ProtectedScreen(props) {
    const id = useSelector(state => state.user.id);
    const allowed = !!id && auth.currentUser?.uid === id;
    useEffect(() => {
      if (!allowed) {
        props.navigation.reset({index: 0, routes: [{name: 'SplashScreen'}]});
      }
    }, [allowed, props.navigation]);
    return allowed ? <Screen {...props} /> : null;
  };
}
const protectedScreens = {
  ActivityDetailScreen: protect(ActivityDetailScreen),
  Footer: protect(Footer),
  HomeScreen: protect(HomeScreen),
  MiercolesCenaScreen: protect(MiercolesCenaScreen),
  OtrosEventosScreen: protect(OtrosEventosScreen),
  MyAgendaScreen: protect(MyAgendaScreen),
  ProfileCreationScreen: protect(ProfileCreationScreen),
  ProfileScreen: protect(ProfileScreen),
};

export default function App() {
  return (
    <Provider store={store}>
      <SessionGuard>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="SplashScreen"
            screenOptions={{
              headerShown: false,
            }}>
            <Stack.Screen
              name="ActivityDetailScreen"
              component={protectedScreens.ActivityDetailScreen}
            />
            <Stack.Screen name="SplashScreen" component={SplashScreen} />
            <Stack.Screen name="Footer" component={protectedScreens.Footer} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen
              name="RegistrationScreen"
              component={RegistrationScreen}
            />
            <Stack.Screen
              name="HomeScreen"
              component={protectedScreens.HomeScreen}
            />
            <Stack.Screen
              name="MiercolesCenaScreen"
              component={protectedScreens.MiercolesCenaScreen}
            />

            <Stack.Screen
              name="OtrosEventosScreen"
              component={protectedScreens.OtrosEventosScreen}
            />
            <Stack.Screen
              name="MyAgendaScreen"
              component={protectedScreens.MyAgendaScreen}
            />
            <Stack.Screen
              name="ProfileCreationScreen"
              component={protectedScreens.ProfileCreationScreen}
            />
            <Stack.Screen
              name="ProfileScreen"
              component={protectedScreens.ProfileScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SessionGuard>
    </Provider>
  );
}
