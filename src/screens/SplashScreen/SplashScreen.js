import React, {useEffect, useState} from 'react';
import {
  Image,
  Text,
  Button,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {auth} from '../../firebase/config';
import {
  clearLegacySession,
  loadSessionProfile,
  resetToSession,
  logout,
  sessionError,
} from '../../services/session';
import {setUser, clearUser} from '../../slices/userSlice';
import styles from './styles';
import {clearEventos} from '../../slices/eventosSlice';

export default function SplashScreen({navigation}) {
  const dispatch = useDispatch();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    let active = true;
    setError(null);
    async function restore() {
      try {
        await auth.authStateReady();
        await clearLegacySession();
        const user = auth.currentUser;
        const profile = user ? await loadSessionProfile(user) : null;
        if (!active) {
          return;
        }
        if (profile) {
          dispatch(setUser(profile));
          resetToSession(navigation, profile);
        } else {
          dispatch(clearUser());
          dispatch(clearEventos());
          navigation.reset({index: 0, routes: [{name: 'LoginScreen'}]});
        }
      } catch (failure) {
        if (active) {
          setError(sessionError(failure));
        }
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, [attempt, dispatch, navigation]);
  const leave = async () => {
    setLeaving(true);
    try {
      await logout();
      dispatch(clearUser());
      dispatch(clearEventos());
      navigation.reset({index: 0, routes: [{name: 'LoginScreen'}]});
    } catch (failure) {
      if (!auth.currentUser) {
        dispatch(clearUser());
        dispatch(clearEventos());
        navigation.reset({index: 0, routes: [{name: 'LoginScreen'}]});
      }
      setError(sessionError(failure));
    } finally {
      setLeaving(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} />
      {error ? (
        <>
          <Text>{error}</Text>
          <Button
            title="Reintentar"
            disabled={leaving}
            onPress={() => setAttempt(attempt + 1)}
          />
          <Button
            title="Ir a iniciar sesión"
            disabled={leaving}
            onPress={leave}
          />
        </>
      ) : (
        <ActivityIndicator />
      )}
    </SafeAreaView>
  );
}
