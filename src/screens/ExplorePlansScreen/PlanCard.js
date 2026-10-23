import React, {useState, useEffect} from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {PILOT_CITIES} from '../../models/activity';
import {PLAN_CATEGORIES, planDate} from '../../models/partnerPlan';
import styles from './styles';
export function PlanImage({url}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? (
    <Image
      source={{uri: url}}
      style={styles.image}
      onError={() => setFailed(true)}
      accessibilityLabel="Imagen de la actividad"
    />
  ) : (
    <View style={styles.placeholder}>
      <Text style={styles.muted}>Imagen no disponible</Text>
    </View>
  );
}
export default function PlanCard({plan, onPress}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.card}
      onPress={onPress}>
      <PlanImage url={plan.imageUrl} />
      {plan.sponsored && <Text style={styles.badge}>Patrocinado</Text>}
      <Text style={styles.cardTitle}>{plan.title}</Text>
      <Text style={styles.text}>{plan.ally}</Text>
      <Text style={styles.muted}>
        {PILOT_CITIES[plan.city].name} · {PLAN_CATEGORIES[plan.category]}
      </Text>
      <Text style={styles.muted}>{planDate(plan)}</Text>
    </TouchableOpacity>
  );
}
