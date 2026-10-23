import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Button,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Avatar, Card} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {profileDate, profileError} from '../../services/profile';
import {getFirestore, doc, onSnapshot} from 'firebase/firestore';
import {auth, firebaseApp} from '../../firebase/config';
import styles from './styles';

export default function ProfileScreen({navigation}) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const uid = useSelector(state => state.user.id);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setUserData(null);
    if (!uid || auth.currentUser?.uid !== uid) {
      setError('La sesión cambió. Vuelve a iniciar sesión.');
      setLoading(false);
      return () => {
        active = false;
      };
    }
    const timer = setTimeout(() => {
      if (active) {
        setError(
          'No pudimos cargar el perfil a tiempo. Revisa tu conexión y reintenta.',
        );
        setLoading(false);
      }
    }, 20000);
    const ref = doc(getFirestore(firebaseApp), 'users', uid);
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        if (!active || auth.currentUser?.uid !== uid) {
          return;
        }
        clearTimeout(timer);
        setError(null);
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          setError('No encontramos tu perfil. Contacta al equipo.');
        }
        setLoading(false);
      },
      failure => {
        if (active && auth.currentUser?.uid === uid) {
          clearTimeout(timer);
          setError(profileError(failure));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [uid, attempt]);

  const formatDate = value =>
    profileDate(value)?.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) || '';
  const formatBoolean = value =>
    value === true ? 'Sí' : value === false ? 'No' : '—';
  const formatList = value =>
    Array.isArray(value)
      ? value
          .filter(item => typeof item === 'string' || typeof item === 'number')
          .join(', ')
      : '';
  const formatValue = value =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '—';

  const renderItem = (icon, label, value) => (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{formatValue(value) || '—'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.rowValue}>
          {error || 'No se pudo cargar el perfil'}
        </Text>
        <Button title="Reintentar" onPress={() => setAttempt(attempt + 1)} />
      </SafeAreaView>
    );
  }

  const prefs = userData.profileAnswers || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Avatar.Text size={90} label="P" />
          <Text style={styles.name}>{formatValue(userData.fullName)}</Text>
          <Text style={styles.email}>{formatValue(userData.emailText)}</Text>
        </View>

        {/* BASIC INFO */}
        <Card style={styles.card}>
          <Card.Content>
            {renderItem(
              '🎂',
              'Fecha de nacimiento',
              formatDate(userData.birthDate),
            )}
            {renderItem(
              '✅',
              'Perfil',
              userData.profileCompleted ? 'Completado' : 'Incompleto',
            )}
          </Card.Content>
        </Card>

        {/* DINNER PREFERENCES */}
        <Text style={styles.sectionTitle}>Preferencias de cena</Text>

        <Card style={styles.card}>
          <Card.Content>
            {renderItem('🍽', 'Alimentación', prefs.foodType)}
            {renderItem('💰', 'Presupuesto', prefs.budget)}
            {renderItem(
              '👥',
              'Grupo mixto',
              formatBoolean(prefs.comfortableMixedGroup),
            )}
            {renderItem(
              '⚥',
              'Grupo de un solo género',
              formatBoolean(prefs.comfortableSingleGenderGroup),
            )}
            {renderItem('🗣', 'Idiomas', formatList(prefs.preferredLanguage))}
            {renderItem(
              '🎭',
              'Personalidad',
              formatList(prefs.dinnerPersonality),
            )}
          </Card.Content>
        </Card>

        {/* ACTION */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('ProfileCreationScreen')}>
          <Text style={styles.editButtonText}>Editar preferencias</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
