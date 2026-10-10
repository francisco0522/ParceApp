import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {useSelector} from 'react-redux';
import {watchPublishedPlans} from '../../services/partnerPlans';
import {visiblePlans} from '../../models/partnerPlan';

// Refresh the reference for scheduled publications and the visibility for expiry.
export function usePlanClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return now;
}
export default function usePartnerPlans(city) {
  const uid = useSelector(state => state.user.id);
  const now = usePlanClock();
  const reference = Math.floor(now / 30000) * 30000;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    setLoading(true);
    const failed = failure => {
      if (active) {
        setError(failure);
        setLoading(false);
        setPlans([]);
      }
    };
    const timeout = setTimeout(() => failed(new Error('LOAD_TIMEOUT')), 20000);
    let stop;
    try {
      stop = watchPublishedPlans(
        uid,
        reference,
        entries => {
          if (active) {
            clearTimeout(timeout);
            setError(null);
            setPlans(entries);
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
  }, [uid, reference, attempt]);
  return {
    plans: visiblePlans(plans, city, now),
    loading,
    error,
    retry: () => setAttempt(value => value + 1),
  };
}
