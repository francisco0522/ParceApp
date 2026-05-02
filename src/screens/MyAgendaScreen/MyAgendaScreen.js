import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Avatar} from 'react-native-paper';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getFirestore,
} from 'firebase/firestore';
import {useSelector} from 'react-redux';
import {firebaseApp} from '../../firebase/config';
import styles from './styles';

const MyAgendaScreen = ({navigation}) => {
  const uid = useSelector(state => state.user.uid);
  const name = useSelector(state => state.user.name);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(firebaseApp);
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'events'),
      where('participants', 'array-contains', uid),
      orderBy('date', 'asc'),
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>
          {item.date} · {item.time}
        </Text>
        <View
          style={[
            styles.badge,
            item.type === 'dinner' ? styles.dinner : styles.event,
          ]}>
          <Text style={styles.badgeText}>
            {item.type === 'dinner' ? '🍽 Cena' : '🎉 Evento'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.city}</Text>

      <View style={styles.infoRow}>
        {item.budget && <Text>💰 {item.budget}</Text>}
        {item.foodType && <Text>🍝 {item.foodType}</Text>}
        <Text>
          👥 {item.participants.length}/{item.maxParticipants}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate('EventDetailScreen', {eventId: item.id})
        }>
        <Text style={styles.primaryText}>Ver detalles</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola 👋</Text>
          <Text style={styles.welcome}>{name}, estos son tus planes</Text>
        </View>
        <Avatar.Image
          size={44}
          source={{uri: 'https://randomuser.me/api/portraits/men/32.jpg'}}
        />
      </View>

      {/* CONTENT */}
      {loading ? (
        <Text style={styles.emptyText}>Cargando tus eventos…</Text>
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>
          Aún no tienes cenas o eventos agendados 🍷
        </Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 40}}
        />
      )}
    </SafeAreaView>
  );
};

export default MyAgendaScreen;
