import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Button,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {auth} from '../../firebase/config';
import {setUser} from '../../slices/userSlice';
import {
  fetchProfileForm,
  saveProfileAnswers,
  questionError,
  profileError,
} from '../../services/profile';
import styles from './styles';

export default function ProfileCreationScreen({navigation}) {
  const uid = useSelector(state => state.user.id);
  const dispatch = useDispatch();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(false);
  const pending = useRef(false);
  const currentUid = useRef(uid);
  currentUid.current = uid;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSaving(false);
    pending.current = false;
    setLoadError(null);
    setError(null);
    setCurrentIndex(0);
    fetchProfileForm(uid)
      .then(result => {
        if (cancelled || auth.currentUser?.uid !== uid) {
          return;
        }
        setQuestions(result.questions);
        setAnswers(result.answers);
      })
      .catch(failure => {
        if (!cancelled) {
          setLoadError(profileError(failure));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const next = async nextAnswers => {
    if (pending.current) {
      return;
    }
    const candidate = nextAnswers || answers;
    const invalid = questionError(
      questions[currentIndex],
      candidate[questions[currentIndex].key],
    );
    setAnswers(candidate);
    setError(invalid);
    if (invalid) {
      return;
    }
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      await saveProfileAnswers(uid, questions, candidate);
      if (
        !active.current ||
        currentUid.current !== uid ||
        auth.currentUser?.uid !== uid
      ) {
        return;
      }
      dispatch(setUser({profileCompleted: true}));
      navigation.reset({index: 0, routes: [{name: 'HomeScreen'}]});
    } catch (failure) {
      if (active.current && currentUid.current === uid) {
        if (Number.isInteger(failure.questionIndex)) {
          setCurrentIndex(failure.questionIndex);
        }
        setError(profileError(failure));
      }
    } finally {
      if (active.current && currentUid.current === uid) {
        pending.current = false;
        setSaving(false);
      }
    }
  };
  const select = value =>
    next({...answers, [questions[currentIndex].key]: value});
  const toggle = value => {
    const question = questions[currentIndex];
    const selected = Array.isArray(answers[question.key])
      ? answers[question.key]
      : [];
    const values = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    if (values.length > (question.maxSelections ?? question.options.length)) {
      setError(`Selecciona máximo ${question.maxSelections} opciones.`);
      return;
    }
    setAnswers({...answers, [question.key]: values});
    setError(null);
  };
  const skip = () => {
    const candidate = {...answers};
    delete candidate[questions[currentIndex].key];
    next(candidate);
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }
  if (loadError || !questions.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.question}>
          {loadError || 'No hay preguntas disponibles.'}
        </Text>
        <Button title="Reintentar" onPress={() => setAttempt(attempt + 1)} />
      </SafeAreaView>
    );
  }
  const question = questions[currentIndex];
  const selected = answers[question.key];
  const options =
    question.type === 'boolean'
      ? [
          {label: 'Sí', value: true},
          {label: 'No', value: false},
        ]
      : question.options;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.containerTitle}>
          <Text style={styles.title}>Cuéntanos un poco sobre ti</Text>
          <Text style={styles.subtitle}>
            Pregunta {currentIndex + 1} de {questions.length}
          </Text>
        </View>
        <View style={styles.containerPregunta}>
          <Text style={styles.question}>{question.question}</Text>
          {options.map(option => {
            const checked =
              question.type === 'multi'
                ? Array.isArray(selected) && selected.includes(option.value)
                : selected === option.value;
            return (
              <TouchableOpacity
                key={`${typeof option.value}:${String(option.value)}`}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{selected: checked, disabled: saving}}
                style={[styles.button, checked && styles.buttonSelected]}
                onPress={() =>
                  question.type === 'multi'
                    ? toggle(option.value)
                    : select(option.value)
                }>
                <Text style={styles.buttonTitle}>
                  {checked ? '✓ ' : ''}
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {error && (
            <Text style={styles.question} accessibilityRole="alert">
              {error}
            </Text>
          )}
          {saving && <ActivityIndicator />}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={styles.back}
              disabled={saving}
              onPress={() => next(answers)}>
              <Text style={styles.backText}>
                {currentIndex === questions.length - 1
                  ? 'Guardar preferencias'
                  : 'Continuar'}
              </Text>
            </TouchableOpacity>
            {question.required === false && (
              <TouchableOpacity
                style={styles.back}
                disabled={saving}
                onPress={skip}>
                <Text style={styles.backText}>Omitir respuesta</Text>
              </TouchableOpacity>
            )}
            {currentIndex > 0 && (
              <TouchableOpacity
                style={styles.back}
                disabled={saving}
                onPress={() => {
                  setCurrentIndex(currentIndex - 1);
                  setError(null);
                }}>
                <Text style={styles.backText}>Atrás</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
