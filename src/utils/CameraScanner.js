import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AppState,
  Linking,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {parseCedulaPDF417} from '../utils/parseCedula';
import {parsePassportMRZ} from './parsePassportMRZ';
import {
  recognizePassportPhoto,
  discardPassportPhoto,
  assertPassportScannerAvailable,
} from '../services/passportScanner';

export default function CameraScanner({onScan, onClose}) {
  const [permission, setPermission] = useState('checking');
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [settingsError, setSettingsError] = useState(false);
  const [scanState, setScanState] = useState('searching');
  const [cameraError, setCameraError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState('barcode');
  const [cameraReady, setCameraReady] = useState(false);
  const [passportBusy, setPassportBusy] = useState(false);
  const [passportError, setPassportError] = useState(false);
  const cameraRef = useRef(null);
  const modeRef = useRef('barcode');
  const passportOperation = useRef(0);
  const passportInFlight = useRef(false);
  const cameraGeneration = useRef(0);
  const delivered = useRef(false);
  const closed = useRef(false);
  const detectionTimer = useRef(null);
  const started = useRef(false);
  const detected = useRef(false);
  const mounted = useRef(false);
  const requesting = useRef(false);
  const requested = useRef(false);
  const device = useCameraDevice('back');
  const renderedGeneration = cameraGeneration.current;

  const invalidatePassport = useCallback(() => {
    passportOperation.current += 1;
    passportInFlight.current = false;
    if (mounted.current) {
      setPassportBusy(false);
      setCameraReady(false);
    }
  }, []);

  const stopDetectionTimer = useCallback(() => {
    clearTimeout(detectionTimer.current);
    detectionTimer.current = null;
  }, []);

  const startDetectionTimer = useCallback(() => {
    stopDetectionTimer();
    detectionTimer.current = setTimeout(() => {
      if (
        mounted.current &&
        !closed.current &&
        !delivered.current &&
        started.current &&
        !detected.current &&
        modeRef.current === 'barcode' &&
        AppState.currentState === 'active'
      ) {
        setScanState('none');
      }
    }, 10000);
  }, [stopDetectionTimer]);

  const requestPermission = useCallback(async () => {
    if (requesting.current || AppState.currentState !== 'active') {
      return;
    }
    requesting.current = true;
    requested.current = true;
    setPermission('checking');
    try {
      const status = await Camera.requestCameraPermission();
      if (mounted.current) {
        setPermission(status);
      }
    } catch {
      if (mounted.current) {
        setPermission('error');
      }
    } finally {
      requesting.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    requestPermission();
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        invalidatePassport();
        started.current = false;
        stopDetectionTimer();
        setTorch(false);
      }
      setForeground(state === 'active');
      if (state !== 'active' || requesting.current) {
        return;
      }
      if (!requested.current) {
        requestPermission();
        return;
      }
      try {
        setPermission(Camera.getCameraPermissionStatus());
      } catch {
        setPermission('error');
      }
    });
    return () => {
      mounted.current = false;
      invalidatePassport();
      stopDetectionTimer();
      subscription.remove();
    };
  }, [requestPermission, stopDetectionTimer, invalidatePassport]);

  const openSettings = async () => {
    setSettingsError(false);
    try {
      await Linking.openSettings();
    } catch {
      if (mounted.current) {
        setSettingsError(true);
      }
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['pdf-417'],
    onCodeScanned: codes => {
      if (
        !mounted.current ||
        modeRef.current !== 'barcode' ||
        cameraGeneration.current !== renderedGeneration ||
        !cameraActive ||
        AppState.currentState !== 'active' ||
        closed.current ||
        cameraError ||
        delivered.current ||
        !Array.isArray(codes) ||
        !codes.length
      ) {
        return;
      }
      detected.current = true;
      stopDetectionTimer();
      let hasContent = false;
      for (const code of codes) {
        if (typeof code?.value !== 'string' || !code.value.trim()) {
          continue;
        }
        hasContent = true;
        let parsed;
        try {
          parsed = parseCedulaPDF417(code?.value);
        } catch {
          // Unrecognized content is not registration data.
        }
        if (parsed) {
          delivered.current = true;
          stopDetectionTimer();
          onScan(parsed);
          onClose();
          return;
        }
      }
      setScanState(hasContent ? 'invalid' : 'empty');
    },
  });

  const scopedCodeScanner = useMemo(
    () => ({
      ...codeScanner,
      onCodeScanned: (...args) => {
        if (
          cameraGeneration.current === renderedGeneration &&
          modeRef.current === 'barcode'
        ) {
          codeScanner.onCodeScanned(...args);
        }
      },
    }),
    [codeScanner, renderedGeneration],
  );

  const cameraActive = foreground && permission === 'granted' && !!device;
  useEffect(() => {
    if (!cameraActive) {
      invalidatePassport();
      started.current = false;
      stopDetectionTimer();
    }
  }, [cameraActive, stopDetectionTimer, invalidatePassport]);

  const closeScanner = () => {
    closed.current = true;
    invalidatePassport();
    stopDetectionTimer();
    onClose();
  };

  const retryReading = () => {
    detected.current = false;
    setScanState('searching');
    if (started.current) {
      startDetectionTimer();
    }
  };

  const onCameraStarted = () => {
    if (
      !mounted.current ||
      !cameraActive ||
      modeRef.current !== mode ||
      cameraGeneration.current !== renderedGeneration ||
      cameraError ||
      closed.current ||
      delivered.current ||
      AppState.currentState !== 'active'
    ) {
      return;
    }
    started.current = true;
    setCameraReady(true);
    if (modeRef.current === 'barcode' && !detected.current) {
      setScanState('searching');
      startDetectionTimer();
    }
  };

  const onCameraError = () => {
    if (
      !mounted.current ||
      !cameraActive ||
      modeRef.current !== mode ||
      cameraGeneration.current !== renderedGeneration ||
      cameraError ||
      closed.current ||
      delivered.current ||
      AppState.currentState !== 'active'
    ) {
      return;
    }
    started.current = false;
    invalidatePassport();
    stopDetectionTimer();
    setTorch(false);
    setCameraError(true);
  };

  const retryCamera = () => {
    cameraGeneration.current += 1;
    invalidatePassport();
    detected.current = false;
    setScanState('searching');
    setCameraError(false);
    setCameraAttempt(attempt => attempt + 1);
  };

  const changeMode = nextMode => {
    if (nextMode === modeRef.current) {
      return;
    }
    invalidatePassport();
    cameraGeneration.current += 1;
    stopDetectionTimer();
    started.current = false;
    detected.current = false;
    modeRef.current = nextMode;
    setMode(nextMode);
    setPassportError(false);
    setCameraError(false);
    setTorch(false);
    setScanState('searching');
  };

  const readPassport = async () => {
    if (
      !mounted.current ||
      closed.current ||
      delivered.current ||
      modeRef.current !== 'passport' ||
      !cameraActive ||
      cameraError ||
      !started.current ||
      !cameraRef.current ||
      passportInFlight.current ||
      AppState.currentState !== 'active'
    ) {
      return;
    }
    const operation = ++passportOperation.current;
    passportInFlight.current = true;
    setPassportBusy(true);
    setPassportError(false);
    let photoPath;
    let handedToService = false;
    const current = () =>
      mounted.current &&
      !closed.current &&
      !delivered.current &&
      passportOperation.current === operation &&
      modeRef.current === 'passport' &&
      AppState.currentState === 'active';
    try {
      assertPassportScannerAvailable();
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      photoPath = photo?.path;
      if (typeof photoPath !== 'string' || !photoPath) {
        throw new Error('passport/photo-unavailable');
      }
      if (!current()) {
        return;
      }
      handedToService = true;
      const text = await recognizePassportPhoto(photoPath);
      if (!current()) {
        return;
      }
      const parsed = parsePassportMRZ(text);
      if (!parsed) {
        setPassportError(true);
        return;
      }
      delivered.current = true;
      onScan(parsed);
      onClose();
    } catch (error) {
      if (current()) {
        setPassportError(
          error?.code === 'OCR_UNAVAILABLE' ? 'unavailable' : true,
        );
      }
    } finally {
      if (photoPath && !handedToService) {
        try {
          await discardPassportPhoto(photoPath);
        } catch {
          /* No document content is logged. */
        }
      }
      if (mounted.current && passportOperation.current === operation) {
        passportInFlight.current = false;
        setPassportBusy(false);
      }
    }
  };
  let message;
  if (permission === 'checking') {
    message = 'Solicitando acceso a la cámara…';
  } else if (permission === 'error') {
    message = 'No pudimos solicitar acceso a la cámara.';
  } else if (permission === 'restricted') {
    message = 'El acceso a la cámara está restringido en este dispositivo.';
  } else if (permission !== 'granted') {
    message = 'No hay permiso para usar la cámara.';
  } else if (!device) {
    message = 'No hay una cámara disponible en este dispositivo.';
  }

  return (
    <View style={styles.container}>
      {message && (
        <View style={styles.messageContainer}>
          <Text style={styles.loadingText}>{message}</Text>
          {permission === 'denied' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openSettings}>
              <Text style={styles.closeText}>Abrir ajustes</Text>
            </TouchableOpacity>
          )}
          {permission === 'error' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={requestPermission}>
              <Text style={styles.closeText}>Reintentar</Text>
            </TouchableOpacity>
          )}
          {settingsError && (
            <Text style={styles.loadingText}>
              No pudimos abrir los ajustes. Abre los permisos de la app desde
              Ajustes.
            </Text>
          )}
        </View>
      )}
      {cameraActive && !cameraError && (
        <Camera
          key={`${mode}-${cameraAttempt}`}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          codeScanner={mode === 'barcode' ? scopedCodeScanner : undefined}
          photo={mode === 'passport'}
          torch={device.hasTorch && torch ? 'on' : 'off'}
          enableZoomGesture
          zoom={device.neutralZoom}
          onStarted={onCameraStarted}
          onStopped={() => {
            if (
              modeRef.current !== mode ||
              cameraGeneration.current !== renderedGeneration
            ) {
              return;
            }
            started.current = false;
            if (mounted.current) {
              setCameraReady(false);
            }
            stopDetectionTimer();
          }}
          onError={onCameraError}
        />
      )}
      {cameraActive && (
        <View style={styles.scanHelp} pointerEvents="box-none">
          <View style={styles.modeSelector} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityState={{selected: mode === 'barcode'}}
              onPress={() => changeMode('barcode')}>
              <Text style={styles.closeText}>DNI / Cédula</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityState={{selected: mode === 'passport'}}
              onPress={() => changeMode('passport')}>
              <Text style={styles.closeText}>Pasaporte</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.loadingText} pointerEvents="none">
            {mode === 'passport'
              ? 'Encuadra completas las dos líneas MRZ de la página de datos del pasaporte, sin reflejos. La lectura autocompleta datos; no verifica autenticidad.'
              : 'Apunta al código PDF417 de tu DNI argentino o cédula colombiana amarilla.'}
          </Text>
          {cameraError ? (
            <>
              <Text style={styles.loadingText} pointerEvents="none">
                No pudimos iniciar la cámara. Vuelve a intentarlo.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={retryCamera}>
                <Text style={styles.closeText}>Reintentar cámara</Text>
              </TouchableOpacity>
            </>
          ) : mode === 'passport' ? (
            <>
              {passportError && (
                <Text style={styles.loadingText} pointerEvents="none">
                  {passportError === 'unavailable'
                    ? 'El lector de pasaportes no está disponible. Recompila e instala la app.'
                    : 'No pudimos leer un pasaporte válido. Revisa que las dos líneas MRZ estén completas y nítidas e intenta de nuevo.'}
                </Text>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                disabled={!cameraReady || passportBusy}
                onPress={readPassport}>
                <Text style={styles.closeText}>
                  {passportBusy ? 'Leyendo pasaporte…' : 'Leer pasaporte'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.loadingText} pointerEvents="none">
                {scanState === 'searching'
                  ? 'Buscando código PDF417…'
                  : scanState === 'none'
                    ? 'No se ha detectado un código. Usa el reverso de la cédula, encuadra el código completo en horizontal, evita reflejos y ajusta la distancia y el enfoque.'
                    : scanState === 'empty'
                      ? 'Código detectado, pero el lector no pudo recuperar su contenido.'
                      : 'Formato no reconocido o datos incompletos. Revisa el código e intenta de nuevo.'}
              </Text>
              {scanState !== 'searching' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={retryReading}>
                  <Text style={styles.closeText}>Reintentar lectura</Text>
                </TouchableOpacity>
              )}
              {device.hasTorch && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setTorch(value => !value)}>
                  <Text style={styles.closeText}>
                    {torch ? 'Apagar linterna' : 'Encender linterna'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.closeButton} onPress={closeScanner}>
        <Text style={styles.closeText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'black'},
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  scanHelp: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    padding: 12,
    backgroundColor: '#000000BB',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  loadingText: {
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  closeButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
  },
  closeText: {color: 'black', fontWeight: 'bold'},
});
