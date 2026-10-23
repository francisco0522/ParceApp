import React, {useEffect, useState, useRef} from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {auth} from '../../firebase/config';
import {
  isPlanAdministrator,
  watchAdminPlans,
  savePartnerPlan,
} from '../../services/partnerPlans';
import {PILOT_CITIES, isoDate} from '../../models/activity';
import {PLAN_CATEGORIES, planError, planDate} from '../../models/partnerPlan';
import styles from '../ExplorePlansScreen/styles';
const blank = {
  ally: '',
  title: '',
  description: '',
  address: '',
  imageUrl: '',
  externalUrl: '',
  category: 'other',
  city: 'cali',
  startsAt: '',
  endsAt: '',
  publishFrom: '',
  publishUntil: '',
  sponsored: true,
  status: 'draft',
};
const dateFields = ['startsAt', 'endsAt', 'publishFrom', 'publishUntil'];
const labels = {
  ally: 'Aliado',
  title: 'Título',
  description: 'Descripción',
  address: 'Dirección',
  imageUrl: 'Imagen HTTPS (opcional)',
  externalUrl: 'Enlace HTTPS del aliado',
  startsAt: 'Inicio de actividad',
  endsAt: 'Fin de actividad',
  publishFrom: 'Publicar desde',
  publishUntil: 'Publicar hasta',
};
function wallClock(value, city) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    throw new Error('INVALID_DATE');
  }
  const result = isoDate(
    `${value.replace(' ', 'T')}:00${PILOT_CITIES[city].offset}`,
  );
  const projected = new Date(
    new Date(result).getTime() +
      Number(PILOT_CITIES[city].offset.slice(0, 3)) * 3600000,
  )
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  if (projected !== value) {
    throw new Error('INVALID_DATE');
  }
  return result;
}
function editableDate(plan, field) {
  const offset = Number(PILOT_CITIES[plan.city].offset.slice(0, 3));
  return new Date(new Date(plan[field]).getTime() + offset * 3600000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
}
export default function PartnerPlanAdminScreen({navigation}) {
  const uid = useSelector(state => state.user.id);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState(null);
  const [form, setForm] = useState({...blank});
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    let stop;
    setChecking(true);
    setAllowed(false);
    setError(null);
    setPlans([]);
    const failed = failure => {
      if (active) {
        setError(failure);
        setChecking(false);
      }
    };
    const timeout = setTimeout(() => failed(new Error('LOAD_TIMEOUT')), 20000);
    isPlanAdministrator(uid)
      .then(admin => {
        if (!active) {
          return;
        }
        if (!admin) {
          clearTimeout(timeout);
        }
        setError(null);
        setAllowed(admin);
        setChecking(false);
        if (admin) {
          stop = watchAdminPlans(
            uid,
            entries => {
              if (active) {
                clearTimeout(timeout);
                setError(null);
                setPlans(entries);
              }
            },
            failed,
          );
        }
      })
      .catch(failed);
    return () => {
      active = false;
      clearTimeout(timeout);
      stop?.();
    };
  }, [uid, attempt]);
  const edit = plan => {
    setId(plan?.id || null);
    const next = plan ? {...plan, imageUrl: plan.imageUrl || ''} : {...blank};
    if (plan) {
      dateFields.forEach(field => {
        next[field] = editableDate(plan, field);
      });
    }
    setForm(next);
    setEditing(true);
  };
  const save = async status => {
    if (pending.current) {
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      const input = {...form, status, imageUrl: form.imageUrl.trim() || null};
      dateFields.forEach(field => {
        input[field] = wallClock(form[field], form.city);
      });
      await savePartnerPlan(uid, id, input);
      if (mounted.current && auth.currentUser?.uid === uid) {
        setEditing(false);
        Alert.alert('Publicación guardada');
      }
    } catch (failure) {
      if (mounted.current && auth.currentUser?.uid === uid) {
        Alert.alert('No se pudo guardar', planError(failure));
      }
    } finally {
      pending.current = false;
      if (mounted.current) {
        setSaving(false);
      }
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}>
          <Text style={styles.text}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Publicaciones de aliados</Text>
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : !allowed ? (
          <View>
            <Text style={styles.text}>
              Esta sección está disponible solo para administradores.
            </Text>
            {error && (
              <TouchableOpacity onPress={() => setAttempt(value => value + 1)}>
                <Text style={styles.text}>{planError(error)} Reintentar</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {error && (
              <TouchableOpacity onPress={() => setAttempt(value => value + 1)}>
                <Text style={styles.text}>{planError(error)} Reintentar</Text>
              </TouchableOpacity>
            )}
            {!editing ? (
              <>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => edit(null)}>
                  <Text style={styles.text}>Nueva publicación</Text>
                </TouchableOpacity>
                {plans.length === 0 && (
                  <Text style={styles.muted}>No hay publicaciones.</Text>
                )}
                {plans.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.card}
                    onPress={() => edit(plan)}>
                    <Text style={styles.cardTitle}>{plan.title}</Text>
                    <Text style={styles.muted}>
                      {plan.status} · {PILOT_CITIES[plan.city].name} ·{' '}
                      {planDate(plan)}
                    </Text>
                    <Text style={styles.text}>Editar, publicar o retirar</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.text}>
                  Las fechas corresponden a la hora local de la ciudad
                  seleccionada. Formato: AAAA-MM-DD HH:mm.
                </Text>
                <Text style={styles.label}>Ciudad</Text>
                <View style={styles.row}>
                  {Object.entries(PILOT_CITIES).map(([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      disabled={saving}
                      style={[
                        styles.chip,
                        form.city === key && styles.selected,
                      ]}
                      onPress={() =>
                        setForm(current => ({...current, city: key}))
                      }>
                      <Text style={styles.text}>{value.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Categoría</Text>
                <View style={styles.row}>
                  {Object.entries(PLAN_CATEGORIES).map(([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      disabled={saving}
                      style={[
                        styles.chip,
                        form.category === key && styles.selected,
                      ]}
                      onPress={() =>
                        setForm(current => ({...current, category: key}))
                      }>
                      <Text style={styles.text}>{value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {Object.entries(labels).map(([field, label]) => (
                  <View key={field}>
                    <Text style={styles.label}>{label}</Text>
                    <TextInput
                      accessibilityLabel={label}
                      style={styles.input}
                      value={form[field]}
                      editable={!saving}
                      multiline={field === 'description'}
                      autoCapitalize="none"
                      onChangeText={value =>
                        setForm(current => ({...current, [field]: value}))
                      }
                    />
                  </View>
                ))}
                <Text style={styles.label}>Patrocinado</Text>
                <Switch
                  value={form.sponsored}
                  disabled={saving}
                  onValueChange={value =>
                    setForm(current => ({...current, sponsored: value}))
                  }
                />
                {[
                  ['draft', 'Guardar borrador'],
                  ['published', 'Publicar'],
                  ['withdrawn', 'Retirar'],
                ].map(([status, label]) => (
                  <TouchableOpacity
                    key={status}
                    disabled={saving}
                    style={styles.button}
                    onPress={() => save(status)}>
                    <Text style={styles.text}>
                      {saving ? 'Guardando…' : label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  disabled={saving}
                  onPress={() => setEditing(false)}>
                  <Text style={styles.text}>Cerrar editor</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
