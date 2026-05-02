import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {getAuth} from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {firebaseApp} from '../../firebase/config';
import styles from './styles';

export default function ProfileCreationScreen({navigation}) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // 🔐 CLAVE

  const db = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);
  const user = auth.currentUser;

  /* ---------------- FETCH QUESTIONS ---------------- */
  useEffect(() => {
    const fetchQuestions = async () => {
      const snapshot = await getDocs(collection(db, 'formularioPerfil'));
      const list = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => a.order - b.order);

      setQuestions(list);
      setLoading(false);
    };

    fetchQuestions();
  }, []);

  /* ---------------- ANSWER HANDLERS ---------------- */
  const handleSingleAnswer = value => {
    const key = questions[currentIndex].key;
    setAnswers(prev => ({...prev, [key]: value}));
    next();
  };

  const handleBooleanAnswer = value => {
    const key = questions[currentIndex].key;
    setAnswers(prev => ({...prev, [key]: value}));
    next();
  };

  const handleMultiAnswer = value => {
    const key = questions[currentIndex].key;
    const current = answers[key] || [];

    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];

    setAnswers(prev => ({...prev, [key]: updated}));
  };

  /* ---------------- NAVIGATION ---------------- */
  const next = async () => {
    // 🛑 PROTECCIÓN
    if (saving) return;

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      await saveProfile();
    }
  };

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  /* ---------------- SAVE TO FIRESTORE ---------------- */
  const saveProfile = async () => {
    if (!user) return;

    setSaving(true); // 🔐 BLOQUEA RENDER

    const userRef = doc(db, 'users', user.uid);

    await updateDoc(userRef, {
      profileAnswers: answers,
      profileCompleted: true,
      updatedAt: new Date(),
    });

    navigation.replace('HomeScreen');
  };

  /* ---------------- RENDER GUARDS ---------------- */
  if (loading || saving) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const question = questions[currentIndex];

  // 🛑 SI NO HAY PREGUNTA, NO RENDERICES
  if (!question) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.containerTitle}>
        <Text style={styles.title}>Cuéntanos un poco sobre ti</Text>
        <Text style={styles.subtitle}>
          Pregunta {currentIndex + 1} de {questions.length}
        </Text>
      </View>

      <View style={styles.containerPregunta}>
        <Text style={styles.question}>{String(question.question)}</Text>

        {/* SINGLE */}
        {question.type === 'single' &&
          question.options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={styles.button}
              onPress={() => handleSingleAnswer(option.value)}>
              <Text style={styles.buttonTitle}>{String(option.label)}</Text>
            </TouchableOpacity>
          ))}

        {/* BOOLEAN */}
        {question.type === 'boolean' && (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleBooleanAnswer(true)}>
              <Text style={styles.buttonTitle}>Sí</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleBooleanAnswer(false)}>
              <Text style={styles.buttonTitle}>No</Text>
            </TouchableOpacity>
          </>
        )}

        {/* MULTI */}
        {question.type === 'multi' &&
          question.options.map(option => {
            const selected = answers[question.key]?.includes(option.value);

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.button, selected && styles.buttonSelected]}
                onPress={() => handleMultiAnswer(option.value)}>
                <Text style={styles.buttonTitle}>{String(option.label)}</Text>
              </TouchableOpacity>
            );
          })}

        {/* MULTI CONFIRM */}
        {question.type === 'multi' && (
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.back} onPress={next}>
              <Text style={styles.backText}>Seleccionar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BACK */}
        <View style={styles.navigation}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.back} onPress={prev}>
              <Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
