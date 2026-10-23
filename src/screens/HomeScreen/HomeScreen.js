import React, {useEffect, useState} from 'react';
import {watchUserActivities} from '../../services/activities';
import {
  TouchableOpacity,
  Text,
  SafeAreaView,
  Image,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Footer from '../Footer/Footer';
import styles from './styles';
import usePartnerPlans from '../ExplorePlansScreen/usePartnerPlans';
import PlanCard from '../ExplorePlansScreen/PlanCard';
import {isPlanAdministrator} from '../../services/partnerPlans';
import {planError} from '../../models/partnerPlan';
import {useSelector} from 'react-redux';

const HomeScreen = ({navigation}) => {
  const name = useSelector(state => state.user.name);
  const id = useSelector(state => state.user.id);
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    retry: retryPlans,
  } = usePartnerPlans(null);
  const [admin, setAdmin] = useState(false);
  const [userReservation, setUserReservation] = useState(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    try {
      return watchUserActivities(
        id,
        activities => {
          setUserReservation(
            activities.find(
              activity =>
                activity.kind === 'dinner' &&
                activity.status === 'open' &&
                new Date(activity.startsAt) > new Date(),
            ) || null,
          );
        },
        () => setUserReservation(null),
      );
    } catch (error) {
      setUserReservation(null);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    setAdmin(false);
    isPlanAdministrator(id)
      .then(value => {
        if (active) {
          setAdmin(value);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titleText}>Bienvenido {name},</Text>
        <Text style={styles.subtitleText}>¿A que plan quieres asistir?</Text>

        <View style={styles.gridOptions}>
          <View style={styles.rowGrid}>
            {!userReservation ? (
              <TouchableOpacity
                style={styles.button1}
                onPress={() => navigation.navigate('MiercolesCenaScreen')}>
                <Image
                  style={{
                    height: 40,
                    width: 40,
                  }}
                  source={require('../../../assets/comer.png')}
                />
                <Text style={styles.textButton}>Reservar cena</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.button1}
                onPress={() => navigation.navigate('MiercolesCenaScreen')}>
                <Image
                  style={{
                    height: 40,
                    width: 40,
                  }}
                  source={require('../../../assets/comer.png')}
                />
                <Text style={styles.textButton}>Proxima cena</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.button2}
              onPress={() => navigation.navigate('OtrosEventosScreen')}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                }}
                source={require('../../../assets/evento.png')}
              />
              <Text style={styles.textButton}>Otros Eventos</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rowGrid}>
            <TouchableOpacity
              style={styles.button3}
              onPress={() => navigation.navigate('MyAgendaScreen')}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                }}
                source={require('../../../assets/calendario.png')}
              />
              <Text style={styles.textButton}>Mis Reservas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button4}
              onPress={() => navigation.navigate('ProfileScreen')}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                }}
                source={require('../../../assets/perfil.png')}
              />
              <Text style={styles.textButton}>Mi perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.plansSection}>
          <Text style={styles.plansTitle}>Explorar planes</Text>
          <Text style={styles.plansText}>
            Actividades próximas de nuestros aliados en Cali y Formosa.
          </Text>
          {plansLoading && !plans.length ? (
            <ActivityIndicator />
          ) : plansError ? (
            <TouchableOpacity onPress={retryPlans}>
              <Text style={styles.plansText}>
                {planError(plansError)} Reintentar
              </Text>
            </TouchableOpacity>
          ) : !plans.length ? (
            <Text style={styles.plansText}>
              Pronto encontrarás nuevos planes aquí.
            </Text>
          ) : (
            plans
              .slice(0, 2)
              .map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onPress={() =>
                    navigation.navigate('PlanDetailScreen', {planId: plan.id})
                  }
                />
              ))
          )}
          <TouchableOpacity
            style={styles.plansButton}
            onPress={() => navigation.navigate('ExplorePlansScreen')}>
            <Text style={styles.plansButtonText}>Ver todos los planes</Text>
          </TouchableOpacity>
          {admin && (
            <TouchableOpacity
              style={styles.plansButton}
              onPress={() => navigation.navigate('PartnerPlanAdminScreen')}>
              <Text style={styles.plansButtonText}>
                Administrar publicaciones
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <Footer navigation={navigation} />
    </SafeAreaView>
  );
};

export default HomeScreen;
