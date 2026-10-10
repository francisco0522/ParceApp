import EncryptedStorage from 'react-native-encrypted-storage';

export const encryptedSessionStorage = {
  getItem: key => EncryptedStorage.getItem(key),
  setItem: (key, value) => EncryptedStorage.setItem(key, value),
  removeItem: async key => {
    // iOS rejects removal of a missing Keychain entry. Missing is already clean.
    try {
      if ((await EncryptedStorage.getItem(key)) != null) {
        await EncryptedStorage.removeItem(key);
      }
    } catch (error) {
      if (Number(error.code) !== -25300) {
        throw error;
      }
    }
  },
};
