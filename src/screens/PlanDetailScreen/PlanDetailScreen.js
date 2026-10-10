import React, {useEffect, useState} from 'react';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {watchPartnerPlan} from '../../services/partnerPlans';
import {
  isPlanVisible,
  planError,
  planDate,
  safeHttpsUrl,
  PLAN_CATEGORIES,
} from '../../models/partnerPlan';
import {PILOT_CITIES} from '../../models/activity';
import {usePlanClock} from '../ExplorePlansScreen/usePartnerPlans';
import {PlanImage} from '../ExplorePlansScreen/PlanCard';
import styles from '../ExplorePlansScreen/styles';
export default function PlanDetailScreen({route, navigation}) {
  const uid = useSelector(state => state.user.id);
  const id = route.params?.planId;
  const now = usePlanClock();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPlan(null);
    setError(null);
    const failed = failure => {
      if (active) {
        setError(failure);
        setPlan(null);
        setLoading(false);
      }
    };
    const timeout = setTimeout(() => failed(new Error('LOAD_TIMEOUT')), 20000);
    let stop;
    try {
      stop = watchPartnerPlan(
        uid,
        id,
        entry => {
          if (active) {
            clearTimeout(timeout);
            setError(null);
            setPlan(entry);
            setLoading(false);
          }
        },
        failed,
      );
    } catch (failure) {
      failed(failure);
    }
    return () => {
      active = false;
      clearTimeout(timeout);
      stop?.();
    };
  }, [uid, id, attempt]);
  const openPartner = async () => {
    if (!isPlanVisible(plan, Date.now()) || !safeHttpsUrl(plan.externalUrl)) {
      Alert.alert('Plan no disponible');
      return;
    }
    try {
      await Linking.openURL(plan.externalUrl);
    } catch (failure) {
      Alert.alert(
        'No se pudo abrir el enlace',
        'Intenta nuevamente más tarde.',
      );
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}>
          <Text style={styles.text}>Volver</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : error ? (
          <TouchableOpacity onPress={() => setAttempt(value => value + 1)}>
            <Text style={styles.text}>{planError(error)} Reintentar</Text>
          </TouchableOpacity>
        ) : !isPlanVisible(plan, now) ? (
          <Text style={styles.text}>Este plan ya no está disponible.</Text>
        ) : (
          <>
            <PlanImage url={plan.imageUrl} />
            {plan.sponsored && <Text style={styles.badge}>Patrocinado</Text>}
            <Text style={styles.title}>{plan.title}</Text>
            <Text style={styles.text}>{plan.ally}</Text>
            <Text style={styles.muted}>
              {PILOT_CITIES[plan.city].name} · {PLAN_CATEGORIES[plan.category]}
            </Text>
            <Text style={styles.text}>{plan.description}</Text>
            <Text style={styles.text}>{plan.address}</Text>
            <Text style={styles.text}>Inicio: {planDate(plan)}</Text>
            <Text style={styles.text}>Fin: {planDate(plan, 'endsAt')}</Text>
            <TouchableOpacity style={styles.button} onPress={openPartner}>
              <Text style={styles.text}>
                Ver información o comprar con el aliado
              </Text>
            </TouchableOpacity>
            <Text style={styles.muted}>
              La inscripción o compra se realiza en el sitio del aliado.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
