import React, {useState} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Footer from '../Footer/Footer';
import {PILOT_CITIES} from '../../models/activity';
import {planError} from '../../models/partnerPlan';
import usePartnerPlans from './usePartnerPlans';
import PlanCard from './PlanCard';
import styles from './styles';
export default function ExplorePlansScreen({navigation}) {
  const [city, setCity] = useState(null);
  const {plans, loading, error, retry} = usePartnerPlans(city);
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={plans}
        keyExtractor={plan => plan.id}
        refreshing={loading}
        onRefresh={retry}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Explorar planes</Text>
            <Text style={styles.muted}>
              Museos, cafés, teatros y más actividades de nuestros aliados.
            </Text>
            <View style={styles.row}>
              {[
                [null, 'Todas'],
                ...Object.entries(PILOT_CITIES).map(([id, value]) => [
                  id,
                  value.name,
                ]),
              ].map(([id, name]) => (
                <TouchableOpacity
                  key={id || 'all'}
                  accessibilityRole="button"
                  accessibilityState={{selected: city === id}}
                  style={[styles.chip, city === id && styles.selected]}
                  onPress={() => setCity(id)}>
                  <Text style={styles.text}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#fff" />
          ) : error ? (
            <TouchableOpacity style={styles.button} onPress={retry}>
              <Text style={styles.text}>{planError(error)} Reintentar</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.text}>
              Todavía no hay planes publicados vigentes para esta ciudad.
            </Text>
          )
        }
        renderItem={({item}) => (
          <PlanCard
            plan={item}
            onPress={() =>
              navigation.navigate('PlanDetailScreen', {planId: item.id})
            }
          />
        )}
      />
      <Footer navigation={navigation} />
    </SafeAreaView>
  );
}
