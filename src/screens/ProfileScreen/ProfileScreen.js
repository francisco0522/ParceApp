import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Avatar, Card} from 'react-native-paper';
import {getAuth} from 'firebase/auth';
import {getFirestore, doc, onSnapshot} from 'firebase/firestore';
import {firebaseApp} from '../../firebase/config';
import styles from './styles';

export default function ProfileScreen({navigation}) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const user = auth.currentUser;
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setUserData(snap.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = timestamp => {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderItem = (icon, label, value) => (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '—'}</Text>
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

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No se pudo cargar el perfil</Text>
      </SafeAreaView>
    );
  }

  const prefs = userData.profileAnswers || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Avatar.Image
            size={90}
            source={{uri: 'https://randomuser.me/api/portraits/men/1.jpg'}}
          />
          <Text style={styles.name}>{userData.fullName}</Text>
          <Text style={styles.email}>{userData.emailText}</Text>
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
              prefs.comfortableMixedGroup ? 'Sí' : 'No',
            )}
            {renderItem(
              '⚥',
              'Grupo de un solo género',
              prefs.comfortableSingleGenderGroup ? 'Sí' : 'No',
            )}
            {renderItem('🗣', 'Idiomas', prefs.preferredLanguage?.join(', '))}
            {renderItem(
              '🎭',
              'Personalidad',
              prefs.dinnerPersonality?.join(', '),
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
