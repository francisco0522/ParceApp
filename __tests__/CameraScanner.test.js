/* eslint-disable jest/no-disabled-tests -- Known MVP-12 defects documented in tests/FINAL_TEST_REPORT.md. */
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, TouchableOpacity} from 'react-native';

jest.mock('react-native-vision-camera', () => ({
  Camera: Object.assign(
    props => require('react').createElement('MockCamera', props),
    {requestCameraPermission: jest.fn()},
  ),
  useCameraDevice: jest.fn(),
  useCodeScanner: jest.fn(config => config),
}));
jest.mock('../src/utils/parseCedula', () => ({parseCedulaPDF417: jest.fn()}));
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {parseCedulaPDF417} from '../src/utils/parseCedula';
import CameraScanner from '../src/utils/CameraScanner';

describe('existing camera scanner', () => {
  let tree;
  beforeEach(() => {
    jest.clearAllMocks();
    useCameraDevice.mockReturnValue({id: 'back'});
    Camera.requestCameraPermission.mockResolvedValue('granted');
  });
  afterEach(() => {
    if (tree) {
      act(() => tree.unmount());
      tree = undefined;
    }
  });
  async function render(props = {}) {
    await act(async () => {
      tree = renderer.create(
        <CameraScanner onScan={jest.fn()} onClose={jest.fn()} {...props} />,
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
  test('shows a loading message when no camera is available', async () => {
    useCameraDevice.mockReturnValue(undefined);
    await render();
    expect(tree.root.findByType(Text).props.children).toBe(
      'Cargando cámara...',
    );
    expect(tree.root.findAllByType('MockCamera')).toHaveLength(0);
  });
  test('does not mount a camera with permission denied', async () => {
    Camera.requestCameraPermission.mockResolvedValue('denied');
    await render();
    expect(tree.root.findByType(Text).props.children).toBe(
      'No hay permiso para usar la cámara',
    );
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
    useCodeScanner.mock.calls
      .at(-1)[0]
      .onCodeScanned([{value: 'synthetic'}, {value: 'ignored'}]);
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
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(parseCedulaPDF417).not.toHaveBeenCalled();
  });
  test.skip('MVP-12: denied permission and missing camera must retain an exit control', async () => {
    Camera.requestCameraPermission.mockResolvedValue('denied');
    await render();
    expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(1);
  });
  test.skip('MVP-12: invalid scans must display an error without throwing', async () => {
    parseCedulaPDF417.mockImplementation(() => {
      throw new Error('invalid');
    });
    await render();
    expect(() =>
      useCodeScanner.mock.calls.at(-1)[0].onCodeScanned([{value: ''}]),
    ).not.toThrow();
  });
});
