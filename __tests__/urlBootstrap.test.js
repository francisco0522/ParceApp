jest.mock('../App', () => {
  // Firestore's REST transport reads host while sending transactions. Requiring
  // App must already have a complete URL implementation, not RN's stub.
  const bootstrapHost = new URL(
    'http://127.0.0.1:8080/v1/projects/demo-parceapp/databases/(default)/documents:batchGet',
  ).host;
  return {__esModule: true, default: () => null, bootstrapHost};
});

test('boot installs real URL polyfill before App and supports native transaction endpoints', () => {
  jest.resetModules();
  const originalUrl = Object.getOwnPropertyDescriptor(global, 'URL');
  const originalParams = Object.getOwnPropertyDescriptor(
    global,
    'URLSearchParams',
  );
  const originalMarker = Object.getOwnPropertyDescriptor(
    global,
    'REACT_NATIVE_URL_POLYFILL',
  );
  const {URL: NativeURL} = require('react-native/Libraries/Blob/URL');
  const {AppRegistry} = require('react-native');
  const register = jest
    .spyOn(AppRegistry, 'registerComponent')
    .mockImplementation(() => {});
  Object.defineProperty(global, 'URL', {
    configurable: true,
    writable: true,
    value: NativeURL,
  });
  try {
    expect(() => new URL('http://127.0.0.1:8080').host).toThrow(
      'URL.host is not implemented',
    );
    require('../index');
    expect(require('../App').bootstrapHost).toBe('127.0.0.1:8080');
    expect(global.REACT_NATIVE_URL_POLYFILL).toBe(
      'react-native-url-polyfill@3.0.0',
    );
    expect(register).toHaveBeenCalledWith('ParceApp', expect.any(Function));
    for (const host of [
      '127.0.0.1:8080',
      '10.0.2.2:8080',
      'firestore.googleapis.com',
    ]) {
      const address = new URL(
        `http://${host}/v1/projects/demo-parceapp/databases/(default)/documents:commit`,
      );
      expect(address.host).toBe(host);
      expect(address.pathname).toContain('documents:commit');
    }
    expect(new URLSearchParams('mode=qa&city=formosa').get('city')).toBe(
      'formosa',
    );
  } finally {
    register.mockRestore();
    for (const [name, descriptor] of [
      ['URL', originalUrl],
      ['URLSearchParams', originalParams],
      ['REACT_NATIVE_URL_POLYFILL', originalMarker],
    ]) {
      if (descriptor) {
        Object.defineProperty(global, name, descriptor);
      } else {
        delete global[name];
      }
    }
  }
});
