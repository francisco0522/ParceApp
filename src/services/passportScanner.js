import {NativeModules} from 'react-native';

const getReader = () => {
  const reader = NativeModules.PassportTextRecognition;
  if (!reader?.recognize || !reader?.deleteTemporaryFile) {
    const error = new Error(
      'El lector de pasaportes no está disponible. Recompila e instala la app.',
    );
    error.code = 'OCR_UNAVAILABLE';
    throw error;
  }
  return reader;
};

export const assertPassportScannerAvailable = () => {
  getReader();
};

export const discardPassportPhoto = async path => {
  const reader = getReader();
  const removed = await reader.deleteTemporaryFile(path);
  if (removed !== true) {
    const error = new Error('No pudimos eliminar la foto temporal.');
    error.code = 'PHOTO_CLEANUP_FAILED';
    throw error;
  }
};

export const recognizePassportPhoto = async path => {
  const reader = getReader();
  let recognitionFailed = false;
  try {
    return await reader.recognize(path);
  } catch (error) {
    recognitionFailed = true;
    throw error;
  } finally {
    try {
      await discardPassportPhoto(path);
    } catch (error) {
      // Keep the original OCR failure; never expose or log the document data.
      if (!recognitionFailed) {
        throw error;
      }
    }
  }
};
