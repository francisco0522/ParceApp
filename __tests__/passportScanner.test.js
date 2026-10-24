import {NativeModules} from 'react-native';
import {recognizePassportPhoto, discardPassportPhoto, assertPassportScannerAvailable} from '../src/services/passportScanner';

describe('passport OCR native service and temporary-photo cleanup', () => {
  const path = '/synthetic-cache/passport-test.jpg';
  let previous, reader;
  beforeEach(() => {
    previous = NativeModules.PassportTextRecognition;
    reader = {recognize: jest.fn().mockResolvedValue('SYNTHETIC MRZ'), deleteTemporaryFile: jest.fn().mockResolvedValue(true)};
    NativeModules.PassportTextRecognition = reader;
  });
  afterEach(() => { NativeModules.PassportTextRecognition = previous; });
  test('preflight checks native availability before taking a photograph', () => {
    expect(() => assertPassportScannerAvailable()).not.toThrow();
    expect(reader.recognize).not.toHaveBeenCalled();
    expect(reader.deleteTemporaryFile).not.toHaveBeenCalled();
  });
  test.each([undefined, {}, {recognize: jest.fn()}])('fails clearly for unavailable or incomplete native modules', async module => {
    NativeModules.PassportTextRecognition = module;
    expect(() => assertPassportScannerAvailable()).toThrow();
    await expect(recognizePassportPhoto(path)).rejects.toMatchObject({code: 'OCR_UNAVAILABLE'});
  });
  test('returns recognized text only after deleting the temporary photograph', async () => {
    await expect(recognizePassportPhoto(path)).resolves.toBe('SYNTHETIC MRZ');
    expect(reader.recognize).toHaveBeenCalledWith(path);
    expect(reader.deleteTemporaryFile).toHaveBeenCalledWith(path);
    expect(reader.recognize.mock.invocationCallOrder[0]).toBeLessThan(reader.deleteTemporaryFile.mock.invocationCallOrder[0]);
  });
  test('OCR errors still clean up and preserve the original error', async () => {
    const error = new Error('synthetic OCR error');
    reader.recognize.mockRejectedValue(error);
    reader.deleteTemporaryFile.mockRejectedValue(new Error('cleanup error'));
    await expect(recognizePassportPhoto(path)).rejects.toBe(error);
    expect(reader.deleteTemporaryFile).toHaveBeenCalledWith(path);
  });
  test.each([false, undefined, null])('rejects an unconfirmed cleanup result %p even if OCR succeeded', async result => {
    reader.deleteTemporaryFile.mockResolvedValue(result);
    await expect(recognizePassportPhoto(path)).rejects.toMatchObject({code: 'PHOTO_CLEANUP_FAILED'});
  });
  test('propagates cleanup rejection after successful OCR', async () => {
    const error = new Error('synthetic cleanup failure');
    reader.deleteTemporaryFile.mockRejectedValue(error);
    await expect(recognizePassportPhoto(path)).rejects.toBe(error);
  });
  test('discard requires confirmation and never runs OCR', async () => {
    await expect(discardPassportPhoto(path)).resolves.toBeUndefined();
    expect(reader.recognize).not.toHaveBeenCalled();
    reader.deleteTemporaryFile.mockResolvedValue(false);
    await expect(discardPassportPhoto(path)).rejects.toMatchObject({code: 'PHOTO_CLEANUP_FAILED'});
  });
});
