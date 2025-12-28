import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {parseCedulaPDF417} from '../utils/parseCedula';

export default function CameraScanner({onScan, onClose}) {
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const device = useCameraDevice('back');

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (device && hasPermission) setCameraActive(true);
  }, [device, hasPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['pdf-417'],
    onCodeScanned: codes => {
      if (codes.length > 0) {
        const parsed = parseCedulaPDF417(codes[0].value);
        onScan(parsed); // Devuelve los datos a RegistrationScreen
        onClose();
      }
    },
  });

  if (!device)
    return <Text style={styles.loadingText}>Cargando cámara...</Text>;
  if (!hasPermission)
    return (
      <Text style={styles.loadingText}>No hay permiso para usar la cámara</Text>
    );

  return (
    <View style={styles.container}>
      {cameraActive && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          codeScanner={codeScanner}
        />
      )}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'black'},
  loadingText: {
    flex: 1,
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
