import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {AppState, Linking, Text, TouchableOpacity} from 'react-native';

jest.mock('react-native-vision-camera', () => ({
  Camera: Object.assign(
    require('react').forwardRef((props, ref) => require('react').createElement('MockCamera', {...props, ref})),
    {
      requestCameraPermission: jest.fn(),
      getCameraPermissionStatus: jest.fn(),
    },
  ),
  useCameraDevice: jest.fn(),
  useCodeScanner: jest.fn(config => config),
}));
jest.mock('../src/utils/parseCedula', () => ({parseCedulaPDF417: jest.fn()}));
jest.mock('../src/services/passportScanner', () => ({
  recognizePassportPhoto: jest.fn(), discardPassportPhoto: jest.fn(), assertPassportScannerAvailable: jest.fn(),
}));
import {recognizePassportPhoto, discardPassportPhoto, assertPassportScannerAvailable} from '../src/services/passportScanner';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {parseCedulaPDF417} from '../src/utils/parseCedula';
import CameraScanner from '../src/utils/CameraScanner';

describe('existing camera scanner', () => {
  test('Android declares camera permission so the native runtime can prompt', () => {
    const manifest = require('fs').readFileSync(
      require('path').join(__dirname, '../android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    expect(manifest).toMatch(/<uses-permission\s+android:name="android\.permission\.CAMERA"\s*\/>/);
  });
  let tree;
  let stateListener;
  let removeListener;
  let previousAppState;
  let takePhoto;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    parseCedulaPDF417.mockReset();
    recognizePassportPhoto.mockReset();
    discardPassportPhoto.mockReset().mockResolvedValue(undefined);
    assertPassportScannerAvailable.mockReset();
    takePhoto = jest.fn().mockResolvedValue({path: '/synthetic-cache/passport.jpg'});
    previousAppState = AppState.currentState;
    AppState.currentState = 'active';
    useCameraDevice.mockReturnValue({id: 'back'});
    Camera.requestCameraPermission.mockResolvedValue('granted');
    Camera.getCameraPermissionStatus.mockReturnValue('not-determined');
    removeListener = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
      stateListener = listener;
      return {remove: removeListener};
    });
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = undefined;
    }
    jest.restoreAllMocks();
    jest.useRealTimers();
    AppState.currentState = previousAppState;
  });
  const messages = () => tree.root.findAllByType(Text).map(node => node.props.children);
  const button = label => tree.root.findAllByType(TouchableOpacity).find(node =>
    node.findAllByType(Text).some(text => text.props.children === label),
  );
  async function render(props = {}) {
    await act(async () => {
      tree = renderer.create(
        <CameraScanner onScan={jest.fn()} onClose={jest.fn()} {...props} />,
        {createNodeMock: element => element.type === 'MockCamera' ? {takePhoto} : null},
      );
    });
  }
  test('activates the camera only after permission is granted', async () => {
    await render();
    expect(Camera.requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType('MockCamera').props.isActive).toBe(true);
    expect(useCodeScanner).toHaveBeenLastCalledWith(
      expect.objectContaining({codeTypes: ['pdf-417']}),
    );
  });
  test('explains a missing camera while retaining an exit control', async () => {
    useCameraDevice.mockReturnValue(undefined);
    await render();
    expect(messages().join(' ')).toMatch(/cámara/i);
    expect(button('Cerrar')).toBeDefined();
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
  });
  test('does not mount a camera with permission denied', async () => {
    Camera.requestCameraPermission.mockResolvedValue('denied');
    await render();
    expect(messages().join(' ')).toMatch(/No hay permiso para usar la cámara/);
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
  });
  test('an empty callback does not parse or close', async () => {
    const onClose = jest.fn();
    await render({onClose});
    useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([]);
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
  test('passes the first decoded document to registration then closes', async () => {
    const onScan = jest.fn();
    const onClose = jest.fn();
    const document = {fullName: 'Persona ficticia'};
    parseCedulaPDF417.mockReturnValue(document);
    await render({onScan, onClose});
    act(() => useCodeScanner.mock.calls
      .at(-1)[0]
      .onCodeScanned([{value: 'synthetic'}, {value: 'ignored'}]));
    expect(parseCedulaPDF417).toHaveBeenCalledWith('synthetic');
    expect(onScan).toHaveBeenCalledWith(document);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onScan.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
  });
  test('close button closes without scanning', async () => {
    const onClose = jest.fn();
    await render({onClose});
    act(() => button('Cerrar').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
  });
  test('denied permission retains an exit control and opens settings only on demand', async () => {
    const onClose = jest.fn();
    Camera.requestCameraPermission.mockResolvedValue('denied');
    await render({onClose});
    expect(Linking.openSettings).not.toHaveBeenCalled();
    await act(async () => button('Abrir ajustes').props.onPress());
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    act(() => button('Cerrar').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  test('a pending permission request shows progress, not denial, and can be closed', async () => {
    let resolve;
    const onClose = jest.fn();
    Camera.requestCameraPermission.mockReturnValue(new Promise(done => { resolve = done; }));
    await render({onClose});
    expect(messages()).toContain('Solicitando acceso a la cámara…');
    expect(messages().join(' ')).not.toMatch(/No hay permiso/);
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    act(() => button('Cerrar').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => resolve('granted'));
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(1);
  });
  test('permission request errors allow closing and retrying', async () => {
    const onClose = jest.fn();
    Camera.requestCameraPermission.mockRejectedValueOnce(new Error('native permission failure'));
    await render({onClose});
    expect(messages()).toContain('No pudimos solicitar acceso a la cámara.');
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    act(() => button('Cerrar').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => button('Reintentar').props.onPress());
    expect(Camera.requestCameraPermission).toHaveBeenCalledTimes(2);
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(1);
  });
  test('returning from settings rechecks permission and revocation removes the camera', async () => {
    Camera.requestCameraPermission.mockResolvedValue('denied');
    await render();
    Camera.getCameraPermissionStatus.mockReturnValue('granted');
    await act(async () => stateListener('active'));
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(1);
    await act(async () => stateListener('background'));
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    Camera.getCameraPermissionStatus.mockReturnValue('denied');
    await act(async () => stateListener('active'));
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    expect(messages().join(' ')).toMatch(/No hay permiso/);
    expect(Camera.requestCameraPermission).toHaveBeenCalledTimes(1);
  });
  test('restricted permission explains the restriction and retains close', async () => {
    Camera.requestCameraPermission.mockResolvedValue('restricted');
    await render();
    expect(messages()).toContain('El acceso a la cámara está restringido en este dispositivo.');
    expect(button('Cerrar')).toBeDefined();
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
  });
  test('failure to open settings leaves a useful recovery message', async () => {
    Camera.requestCameraPermission.mockResolvedValue('denied');
    Linking.openSettings.mockRejectedValue(new Error('native settings failure'));
    await render();
    await act(async () => button('Abrir ajustes').props.onPress());
    expect(messages().join(' ')).toMatch(/No pudimos abrir los ajustes/);
    expect(button('Cerrar')).toBeDefined();
  });
  test('a background mount waits for foreground before requesting camera access', async () => {
    AppState.currentState = 'background';
    await render();
    expect(Camera.requestCameraPermission).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    await act(async () => stateListener('active'));
    expect(Camera.requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(1);
  });
  test('failure checking permissions on foreground is recoverable', async () => {
    await render();
    Camera.getCameraPermissionStatus.mockImplementationOnce(() => { throw new Error('native status failure'); });
    await act(async () => stateListener('active'));
    expect(messages()).toContain('No pudimos solicitar acceso a la cámara.');
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    await act(async () => button('Reintentar').props.onPress());
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(1);
  });
  test('unmount removes the listener while a permission request is pending', async () => {
    let resolve;
    Camera.requestCameraPermission.mockReturnValue(new Promise(done => { resolve = done; }));
    await render();
    act(() => tree.unmount());
    tree = undefined;
    expect(removeListener).toHaveBeenCalledTimes(1);
    await act(async () => resolve('granted'));
  });
  test('invalid scans display an error without throwing, delivering data or closing', async () => {
    const onScan = jest.fn();
    const onClose = jest.fn();
    parseCedulaPDF417.mockImplementation(() => {
      throw new Error('invalid');
    });
    await render({onScan, onClose});
    expect(() => act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: 'invalid'}]))).not.toThrow();
    expect(messages().join(' ')).toMatch(/Formato no reconocido/);
    expect(onScan).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
  test('unrecognized content can be retried and a valid scan is delivered only once across frames', async () => {
    const onScan = jest.fn();
    const onClose = jest.fn();
    const document = {fullName: 'PERSONA FICTICIA'};
    await render({onScan, onClose});
    act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: 'unknown'}]));
    expect(messages().join(' ')).toMatch(/Formato no reconocido/);
    act(() => button('Reintentar lectura').props.onPress());
    expect(messages().join(' ')).not.toMatch(/Formato no reconocido/);
    parseCedulaPDF417.mockReturnValue(document);
    const callback = useCodeScanner.mock.calls.at(-1)[0].onCodeScanned;
    act(() => { callback([{value: 'valid'}]); callback([{value: 'valid'}]); });
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith(document);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  test('a batch skips an invalid entry and accepts the next valid document', async () => {
    const onScan = jest.fn();
    const document = {fullName: 'PERSONA FICTICIA'};
    parseCedulaPDF417.mockReturnValueOnce(null).mockReturnValueOnce(document);
    await render({onScan});
    act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: 'unknown'}, {value: 'valid'}]));
    expect(onScan).toHaveBeenCalledWith(document);
    expect(parseCedulaPDF417).toHaveBeenCalledTimes(2);
  });
  test.each([undefined, null, {}, {value: ''}, {value: ' '}])('missing decoded value %p reports unreadable content safely', async code => {
    const onScan = jest.fn();
    await render({onScan});
    act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([code]));
    expect(onScan).not.toHaveBeenCalled();
    expect(messages().join(' ')).toMatch(/Código detectado, pero el lector no pudo recuperar su contenido/);
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
  });
  test.each([null, undefined, {}, []])('ignores absent or malformed frame collections %p', async codes => {
    await render();
    act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned(codes));
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
    expect(messages().join(' ')).not.toMatch(/Formato no reconocido/);
  });
  test('ignores a stale callback while backgrounded or after unmount', async () => {
    const onScan = jest.fn();
    parseCedulaPDF417.mockReturnValue({fullName: 'PERSONA FICTICIA'});
    await render({onScan});
    const callback = useCodeScanner.mock.calls.at(-1)[0].onCodeScanned;
    AppState.currentState = 'background';
    act(() => callback([{value: 'valid'}]));
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    act(() => tree.unmount());
    tree = undefined;
    act(() => callback([{value: 'valid'}]));
    expect(onScan).not.toHaveBeenCalled();
  });
  test('permission denied prevents decoded frames from reaching registration', async () => {
    Camera.requestCameraPermission.mockResolvedValue('denied');
    await render();
    act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: 'ignored'}]));
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
  });
  const camera = () => tree.root.findByType('MockCamera');
  const start = () => act(() => camera().props.onStarted());
  const advance = duration => act(() => jest.advanceTimersByTime(duration));
  test('detection guidance starts ten seconds after native camera starts, not permission grant', async () => {
    await render();
    advance(20000);
    expect(messages().join(' ')).not.toMatch(/No se ha detectado/);
    start();
    advance(9999);
    expect(messages().join(' ')).toMatch(/Buscando código/);
    advance(1);
    expect(messages().join(' ')).toMatch(/No se ha detectado un código/);
  });
  test.each(['empty', 'invalid', 'throw'])('a detected %s result keeps its explanation after the detection timeout', async outcome => {
    await render();
    start();
    if (outcome === 'throw') {
      parseCedulaPDF417.mockImplementation(() => { throw new Error('synthetic invalid'); });
    } else {
      parseCedulaPDF417.mockReturnValue(null);
    }
    act(() => useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: outcome === 'empty' ? undefined : 'synthetic'}]));
    advance(20000);
    expect(messages().join(' ')).toMatch(outcome === 'empty' ? /Código detectado, pero el lector no pudo recuperar/ : /Formato no reconocido/);
    expect(messages().join(' ')).not.toMatch(/No se ha detectado/);
    expect(jest.getTimerCount()).toBe(0);
  });
  test('retry reading restarts the detection window from the retry', async () => {
    await render();
    start();
    advance(10000);
    act(() => button('Reintentar lectura').props.onPress());
    expect(messages().join(' ')).toMatch(/Buscando código/);
    advance(9999);
    expect(messages().join(' ')).not.toMatch(/No se ha detectado/);
    advance(1);
    expect(messages().join(' ')).toMatch(/No se ha detectado/);
  });
  test.each(['close', 'unmount', 'background', 'success', 'error', 'stop'])('clears the detection timer on %s', async action => {
    await render();
    start();
    expect(jest.getTimerCount()).toBe(1);
    act(() => {
      if (action === 'close') { button('Cerrar').props.onPress(); }
      if (action === 'unmount') { tree.unmount(); tree = undefined; }
      if (action === 'background') { AppState.currentState = 'background'; stateListener('background'); }
      if (action === 'success') {
        parseCedulaPDF417.mockReturnValue({fullName: 'PERSONA FICTICIA'});
        useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: 'synthetic'}]);
      }
      if (action === 'error') { camera().props.onError({message: 'private native detail'}); }
      if (action === 'stop') { camera().props.onStopped(); }
    });
    expect(jest.getTimerCount()).toBe(0);
    advance(20000);
  });
  test('torch is optional, toggles on demand, and resets when backgrounded; zoom uses neutral value', async () => {
    useCameraDevice.mockReturnValue({id: 'back', hasTorch: true, neutralZoom: 2});
    await render();
    expect(camera().props.enableZoomGesture).toBe(true);
    expect(camera().props.zoom).toBe(2);
    expect(camera().props.torch).toBe('off');
    act(() => button('Encender linterna').props.onPress());
    expect(camera().props.torch).toBe('on');
    act(() => button('Apagar linterna').props.onPress());
    expect(camera().props.torch).toBe('off');
    act(() => button('Encender linterna').props.onPress());
    act(() => { AppState.currentState = 'background'; stateListener('background'); });
    Camera.getCameraPermissionStatus.mockReturnValue('granted');
    act(() => { AppState.currentState = 'active'; stateListener('active'); });
    expect(camera().props.torch).toBe('off');
  });
  test('devices without a torch have no torch action', async () => {
    useCameraDevice.mockReturnValue({id: 'back', hasTorch: false, neutralZoom: 1});
    await render();
    expect(button('Encender linterna')).toBeUndefined();
    expect(camera().props.torch).toBe('off');
  });
  test('native camera errors hide the camera and expose only generic recovery until explicit retry', async () => {
    await render();
    start();
    act(() => camera().props.onError({message: 'synthetic private detail'}));
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    expect(messages().join(' ')).toMatch(/No pudimos iniciar la cámara/);
    expect(messages().join(' ')).not.toMatch(/synthetic private detail/);
    advance(30000);
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
    act(() => button('Reintentar cámara').props.onPress());
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(1);
    expect(messages().join(' ')).toMatch(/Buscando código/);
    expect(jest.getTimerCount()).toBe(0);
    start();
    expect(jest.getTimerCount()).toBe(1);
  });
  test('close ignores late scan, start and native error callbacks', async () => {
    const onScan = jest.fn();
    const onClose = jest.fn();
    await render({onScan, onClose});
    const callbacks = camera().props;
    const scan = useCodeScanner.mock.calls.at(-1)[0].onCodeScanned;
    act(() => button('Cerrar').props.onPress());
    act(() => { callbacks.onStarted(); callbacks.onError({message: 'late'}); scan([{value: 'synthetic'}]); });
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
    expect(onScan).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    expect(messages().join(' ')).not.toMatch(/No pudimos iniciar/);
  });
  const specimen = 'P<UTOERIKSSON<<ANNA<MARIA'.padEnd(44, '<') + '\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
  const passportMode = () => act(() => button('Pasaporte').props.onPress());
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
  test('defaults to PDF417 and enables passport photos only after the native camera starts', async () => {
    const timeout = jest.spyOn(global, 'setTimeout');
    await render();
    expect(camera().props.photo).toBe(false);
    expect(camera().props.codeScanner).toBeDefined();
    passportMode();
    expect(camera().props.photo).toBe(true);
    expect(camera().props.codeScanner).toBeUndefined();
    expect(button('Leer pasaporte').props.disabled).toBe(true);
    await act(async () => button('Leer pasaporte').props.onPress());
    expect(takePhoto).not.toHaveBeenCalled();
    start();
    expect(button('Leer pasaporte').props.disabled).toBe(false);
    expect(timeout.mock.calls.some(([, delay]) => delay === 10000)).toBe(false);
  });
  test('preflight runs before capture, then OCR passes one parsed passport and closes', async () => {
    const onScan = jest.fn(), onClose = jest.fn();
    recognizePassportPhoto.mockResolvedValue(specimen);
    await render({onScan, onClose}); passportMode(); start();
    await act(async () => button('Leer pasaporte').props.onPress());
    expect(assertPassportScannerAvailable.mock.invocationCallOrder[0]).toBeLessThan(takePhoto.mock.invocationCallOrder[0]);
    expect(recognizePassportPhoto).toHaveBeenCalledWith('/synthetic-cache/passport.jpg');
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith(expect.objectContaining({fullName: 'ANNA MARIA ERIKSSON', documentType: 'passport'}));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(discardPassportPhoto).not.toHaveBeenCalled();
  });
  test('unavailable OCR fails before capturing a photo and offers a clear message', async () => {
    assertPassportScannerAvailable.mockImplementation(() => { const error = new Error('unavailable'); error.code = 'OCR_UNAVAILABLE'; throw error; });
    await render(); passportMode(); start();
    await act(async () => button('Leer pasaporte').props.onPress());
    expect(takePhoto).not.toHaveBeenCalled();
    expect(messages().join(' ')).toMatch(/lector de pasaportes no está disponible/);
  });
  test.each(['invalid', 'OCR error', 'capture error'])('a failed %s can be retried without closing or leaking paths', async failure => {
    const onScan = jest.fn(), onClose = jest.fn();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    if (failure === 'invalid') { recognizePassportPhoto.mockResolvedValueOnce('invalid'); }
    if (failure === 'OCR error') { recognizePassportPhoto.mockRejectedValueOnce(new Error('/synthetic-cache/private-path')); }
    if (failure === 'capture error') { takePhoto.mockRejectedValueOnce(new Error('/synthetic-cache/private-path')); }
    await render({onScan, onClose}); passportMode(); start();
    await act(async () => button('Leer pasaporte').props.onPress());
    expect(onScan).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
    expect(messages().join(' ')).toMatch(/No pudimos leer un pasaporte válido/);
    expect(messages().join(' ')).not.toMatch(/synthetic-cache/);
    expect(log).not.toHaveBeenCalled();
    recognizePassportPhoto.mockResolvedValue(specimen);
    await act(async () => button('Leer pasaporte').props.onPress());
    expect(onScan).toHaveBeenCalledTimes(1);
  });
  test('duplicate capture presses share one in-flight operation', async () => {
    const capture = deferred(); takePhoto.mockReturnValue(capture.promise);
    recognizePassportPhoto.mockResolvedValue(specimen);
    const onScan = jest.fn(); await render({onScan}); passportMode(); start();
    const press = button('Leer pasaporte').props.onPress;
    act(() => { press(); press(); });
    expect(takePhoto).toHaveBeenCalledTimes(1);
    expect(button('Leyendo pasaporte…').props.disabled).toBe(true);
    await act(async () => capture.resolve({path: '/synthetic-cache/passport.jpg'}));
    expect(onScan).toHaveBeenCalledTimes(1);
  });
  const interrupt = action => act(() => {
    if (action === 'mode') { button('DNI / Cédula').props.onPress(); }
    if (action === 'background') { AppState.currentState = 'background'; stateListener('background'); }
    if (action === 'close') { button('Cerrar').props.onPress(); }
    if (action === 'unmount') { tree.unmount(); tree = undefined; }
  });
  test.each(['mode', 'background', 'close', 'unmount'])('a %s during capture discards the photograph and suppresses callbacks', async action => {
    const capture = deferred(); takePhoto.mockReturnValue(capture.promise);
    const onScan = jest.fn(), onClose = jest.fn();
    await render({onScan, onClose}); passportMode(); start();
    act(() => { button('Leer pasaporte').props.onPress(); });
    interrupt(action);
    await act(async () => capture.resolve({path: '/synthetic-cache/passport.jpg'}));
    expect(discardPassportPhoto).toHaveBeenCalledWith('/synthetic-cache/passport.jpg');
    expect(recognizePassportPhoto).not.toHaveBeenCalled(); expect(onScan).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(action === 'close' ? 1 : 0);
  });
  test.each(['mode', 'background', 'close', 'unmount'])('a %s during OCR suppresses callbacks and leaves cleanup to the service', async action => {
    const ocr = deferred(); recognizePassportPhoto.mockReturnValue(ocr.promise);
    const onScan = jest.fn(), onClose = jest.fn();
    await render({onScan, onClose}); passportMode(); start();
    await act(async () => { button('Leer pasaporte').props.onPress(); });
    interrupt(action);
    await act(async () => ocr.resolve(specimen));
    expect(discardPassportPhoto).not.toHaveBeenCalled(); expect(onScan).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(action === 'close' ? 1 : 0);
  });
  test('native events from the old barcode camera cannot reset passport readiness', async () => {
    const timeout = jest.spyOn(global, 'setTimeout');
    await render(); const old = camera().props;
    passportMode(); start();
    act(() => { old.onStopped(); old.onError({message: 'late'}); old.onStarted(); old.codeScanner.onCodeScanned([{value: 'stale'}]); });
    expect(button('Leer pasaporte').props.disabled).toBe(false);
    expect(messages().join(' ')).not.toMatch(/No pudimos iniciar/);
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
    expect(timeout.mock.calls.some(([, delay]) => delay === 10000)).toBe(false);
  });
});
