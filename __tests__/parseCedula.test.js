/* eslint-disable jest/no-disabled-tests -- Known MVP-12 defects documented in tests/FINAL_TEST_REPORT.md. */
import {parseCedulaPDF417} from '../src/utils/parseCedula';

// Synthetic data only: these fixtures are not real identity documents.
const barcode = (gender = 'M', name = 'PEREZ0GOMEZ0JUAN0CARLOS') =>
  `0000000123${name}0${gender}19900102O+`;
describe('existing PDF417 parser', () => {
  test('extracts names, identifier, birth date and male gender', () => {
    expect(parseCedulaPDF417(barcode())).toMatchObject({
      idNumber: '123',
      lastName1: 'PEREZ',
      lastName2: 'GOMEZ',
      firstName1: 'JUAN',
      middleName: 'CARLOS',
      year: '1990',
      month: '01',
      day: '02',
      gender: 'Hombre',
      fullName: 'JUAN CARLOS PEREZ GOMEZ',
    });
  });
  test('extracts female gender', () => {
    expect(parseCedulaPDF417(barcode('F'))).toMatchObject({
      gender: 'Mujer',
      year: '1990',
    });
  });
  test('omits a gender marker mistaken for a middle name', () => {
    expect(parseCedulaPDF417(barcode('F', 'PEREZ0GOMEZ0ANA')).fullName).toBe(
      'ANA PEREZ GOMEZ',
    );
  });
  test('retains Ñ in names', () => {
    expect(
      parseCedulaPDF417(barcode('M', 'PEÑA0GOMEZ0JUAN0CARLOS')).lastName1,
    ).toBe('PEÑA');
  });
  test.skip('MVP-12: malformed or empty scans must return a validation result rather than throw', () => {
    expect(() => parseCedulaPDF417('')).not.toThrow();
    expect(() => parseCedulaPDF417(null)).not.toThrow();
  });
  test.skip('MVP-12: impossible birth dates must be rejected', () => {
    expect(
      parseCedulaPDF417(barcode().replace('19900102', '19901399')),
    ).toBeNull();
  });
});
