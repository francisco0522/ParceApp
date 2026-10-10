jest.mock('react-native-encrypted-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
import storage from 'react-native-encrypted-storage';
import {encryptedSessionStorage as adapter} from '../src/services/sessionStorage';
describe('encrypted persistence adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.removeItem.mockResolvedValue(undefined);
  });
  test('forwards stored values', async () => {
    storage.getItem.mockResolvedValue('value');
    expect(await adapter.getItem('key')).toBe('value');
    await adapter.setItem('key', 'value');
    expect(storage.setItem).toHaveBeenCalledWith('key', 'value');
  });
  test('missing key requires no native removal', async () => {
    await adapter.removeItem('key');
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
  test('existing key is removed', async () => {
    storage.getItem.mockResolvedValue('value');
    await adapter.removeItem('key');
    expect(storage.removeItem).toHaveBeenCalledWith('key');
  });
  test.each([-25300, '-25300'])(
    'iOS missing key error %s is harmless',
    async code => {
      storage.getItem.mockRejectedValue({code});
      await expect(adapter.removeItem('key')).resolves.toBeUndefined();
    },
  );
  test('real storage failure rejects', async () => {
    storage.getItem.mockRejectedValue({code: -34018});
    await expect(adapter.removeItem('key')).rejects.toEqual({code: -34018});
  });
});
