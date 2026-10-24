import {parseCedulaPDF417} from '../src/utils/parseCedula';

describe('Colombian PubDSK_1 fixed-width layout (synthetic only)', () => {
  const document = ({names = ['PEÑA', 'GOMEZ', 'ANA MARIA', ''], sex = 'F', date = '19900102', padding = '\u0000'} = {}) =>
    '1234567890' + padding.repeat(14) + 'PubDSK_1' + padding.repeat(8) +
    '123456' + padding.repeat(2) + '0000000123' +
    names.map(name => name.padEnd(23, padding)).join('') +
    `0${sex}${date}123456O+\u0000\u00ff@BINARY`;

  test('reads the missing-middle-name layout without using metadata as identity', () => {
    const result = parseCedulaPDF417(document());
    expect(result).toMatchObject({fullName: 'ANA MARIA PEÑA GOMEZ', year: '1990', month: '01', day: '02', gender: 'Mujer'});
    expect(result).not.toHaveProperty('idNumber');
  });
  test('allows absent second surname and middle name at their own positions', () => {
    expect(parseCedulaPDF417(document({names: ['PEREZ', '', 'JUAN', ''], sex: 'M'}))).toMatchObject({fullName: 'JUAN PEREZ', gender: 'Hombre'});
  });
  test('preserves compound names, punctuation and all four fields', () => {
    expect(parseCedulaPDF417(document({names: ['DE LA PEÑA', "O'NEILL", 'JOSÉ-LUIS', 'ANDRÉS']}))).toMatchObject({fullName: "JOSÉ-LUIS ANDRÉS DE LA PEÑA O'NEILL"});
  });
  test('accepts space padding without shifting fixed positions', () => {
    expect(parseCedulaPDF417(document({padding: ' '}))).toMatchObject({fullName: 'ANA MARIA PEÑA GOMEZ'});
  });
  test('preserves a missing second surname independently from a present middle name', () => {
    expect(parseCedulaPDF417(document({names: ['PEREZ', '', 'JUAN', 'CARLOS']}))).toMatchObject({fullName: 'JUAN CARLOS PEREZ', lastName2: '', middleName: 'CARLOS'});
  });
  test.each([0, 10, 32, 40, 46, 48, 150, 160])('rejects invalid metadata or padding at fixed position %s', position => {
    const value = document();
    expect(parseCedulaPDF417(value.slice(0, position) + '!' + value.slice(position + 1))).toBeNull();
  });
  test.each(['', '29990101', '19990229', '19901301', '19900431'])('rejects invalid birth date %s', date => {
    expect(parseCedulaPDF417(document({date}))).toBeNull();
  });
  test('accepts a valid leap date', () => {
    expect(parseCedulaPDF417(document({date: '20000229'}))).toMatchObject({day: '29', month: '02'});
  });
  test.each([
    value => value.replace('PubDSK_1', 'PubDSK_2'),
    value => value.slice(1),
    value => value.replace('0F19900102', '0X19900102'),
    value => value.replace('19900102123456O+', '19900102O+'),
    value => value.replace('O+', 'INVALID'),
    value => value.slice(0, 155),
  ])('rejects incompatible headers or incomplete payloads %#', change => {
    expect(parseCedulaPDF417(change(document()))).toBeNull();
  });
  test.each([
    ['', 'GOMEZ', 'ANA', ''],
    ['PEREZ', 'GOMEZ', '', ''],
    ['PEREZ', 'GOMEZ', 'ANA123', ''],
    ['PEREZ', 'GOMEZ123', 'ANA', ''],
    ['PEREZ', 'GOMEZ', 'ANA', '123'],
  ])('rejects missing required fields or non-name text %#', (...names) => {
    expect(parseCedulaPDF417(document({names}))).toBeNull();
  });
});

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
  test.each(['', ' ', null, undefined, 123, {}, 'unknown PDF417', 'A'.repeat(200)])('rejects unsupported or malformed input %p', value => {
    expect(parseCedulaPDF417(value)).toBeNull();
  });
  test('impossible birth dates are rejected', () => {
    expect(
      parseCedulaPDF417(barcode().replace('19900102', '19901399')),
    ).toBeNull();
  });
  test.each(['0000000123PEREZ GOMEZ JUAN0M19900102', '0000000123PEREZ\u0000GOMEZ\u0000JUAN0M19900102', 'PubDSK_10000000123PEREZ0GOMEZ0JUAN0M19900102', 'PubDSK_1 0000000123PEREZ0GOMEZ0JUAN0M19900102'])(
    'accepts Colombian zero, whitespace, NUL or PubDSK layout without requiring blood type', value => {
      expect(parseCedulaPDF417(value)).toMatchObject({idNumber: '123', fullName: 'JUAN PEREZ GOMEZ', year: '1990', month: '01', day: '02'});
    },
  );
  test.each(['19990229', '29990101', '19900001', '19900431'])(
    'rejects invalid or future Colombian birth date %s', date => {
      expect(parseCedulaPDF417(barcode().replace('19900102', date))).toBeNull();
    },
  );
  test('accepts a real leap day', () => {
    expect(parseCedulaPDF417(barcode().replace('19900102', '20000229'))).toMatchObject({day: '29', month: '02', year: '2000'});
  });
  test.each(['PEREZ0JUAN', 'UNO0DOS0TRES0CUATRO0CINCO', 'perez0GOMEZ0JUAN'])(
    'rejects unknown Colombian name structure %s', names => {
      expect(parseCedulaPDF417(barcode('M', names))).toBeNull();
    },
  );
  test('rejects unknown Colombian gender and missing numeric identifier', () => {
    expect(parseCedulaPDF417(barcode('X'))).toBeNull();
    expect(parseCedulaPDF417(barcode().replace('0000000123', '123'))).toBeNull();
  });
  test.each(['00000000123', '0000000000'])('rejects oversized or zero-only Colombian identifiers %s', identifier => {
    expect(parseCedulaPDF417(barcode().replace('0000000123', identifier))).toBeNull();
  });
});

const argentina = (changes = {}, nineFields = false) => {
  const fields = ['SYNTHETIC', 'PEÑA', 'ANA MARÍA', 'F', '12345678', 'A', '29/02/2000', '01/03/2020'];
  Object.entries(changes).forEach(([index, value]) => { fields[index] = value; });
  if (nineFields) { fields.push('SYNTHETIC-EXTRA'); }
  return fields.join('@');
};
describe('synthetic Argentine DNI supported layouts', () => {
  test.each([false, true])('reads eight or nine fields (extra=%s)', extra => {
    expect(parseCedulaPDF417(argentina({}, extra))).toEqual({idNumber: '12345678', fullName: 'ANA MARÍA PEÑA', gender: 'Mujer', year: '2000', month: '02', day: '29'});
  });
  test.each([['M', 'Hombre'], ['F', 'Mujer'], ['X', '']])('maps gender %s without guessing X', (sex, gender) => {
    expect(parseCedulaPDF417(argentina({3: sex, 4: '1234567'}))).toMatchObject({gender, idNumber: '1234567'});
  });
  test('preserves apostrophes, hyphens and accents in names', () => {
    expect(parseCedulaPDF417(argentina({1: "O'NEILL", 2: 'ANA-MARÍA'})).fullName).toBe("ANA-MARÍA O'NEILL");
  });
  test.each([{3: 'U'}, {4: '123'}, {4: '1234567A'}, {1: ''}, {2: 'ANA123'}, {6: '29/02/1999'}, {6: '31/04/2000'}, {6: '01/01/2999'}, {7: '01/01/2999'}, {7: '01/01/1990'}, {7: '31/02/2020'}, {6: '2000-02-29'}])('rejects invalid Argentine fields %p', changes => {
    expect(parseCedulaPDF417(argentina(changes))).toBeNull();
  });
  test.each([7, 10, 16])('rejects unsupported %s-field layouts rather than guessing offsets', length => {
    expect(parseCedulaPDF417(Array(length).fill('SYNTHETIC').join('@'))).toBeNull();
  });
});

// Metadata is deliberately synthetic and must never become a document number.
const legacyHeader = '123456789012A' + ' '.repeat(9) +
  '123456789012' + ' '.repeat(6) + '123456789012345678';
const legacyColombian = (names = 'PEREZ  GOMEZ  JUAN CARLOS  ANDRES', sex = 'M', date = '19900102') =>
  `${legacyHeader}${names}  0${sex}${date}123456O+`;
describe('synthetic legacy Colombian metadata layout', () => {
  test('reads names and date without treating header metadata as a document number', () => {
    const result = parseCedulaPDF417(legacyColombian());
    expect(result).toEqual({lastName1: 'PEREZ', lastName2: 'GOMEZ', firstName1: 'JUAN CARLOS', middleName: 'ANDRES', fullName: 'JUAN CARLOS ANDRES PEREZ GOMEZ', year: '1990', month: '01', day: '02', gender: 'Hombre'});
    expect(result).not.toHaveProperty('idNumber');
  });
  test('reads female gender, Ñ and compound surnames and names', () => {
    expect(parseCedulaPDF417(legacyColombian('PEÑA  DE LA CRUZ  ANA MARIA  DEL PILAR', 'F'))).toMatchObject({fullName: 'ANA MARIA DEL PILAR PEÑA DE LA CRUZ', gender: 'Mujer'});
  });
  test('normalizes NUL padding in header and name field separators', () => {
    const padded = legacyColombian().replace(/ /g, '\u0000');
    expect(parseCedulaPDF417(padded)).toMatchObject({fullName: 'JUAN CARLOS ANDRES PEREZ GOMEZ'});
  });
  test.each(['@SYNTHETIC@TAIL', '\u0001\u0002\u00ff', '@'.repeat(8)])('ignores non-name trailing metadata without misclassifying as Argentine input', tail => {
    expect(parseCedulaPDF417(legacyColombian() + tail)).toMatchObject({fullName: 'JUAN CARLOS ANDRES PEREZ GOMEZ', gender: 'Hombre'});
  });
  test.each([
    value => value.replace('123456789012A', '123A'),
    value => value.replace(' '.repeat(9), ' '.repeat(8)),
    value => value.replace('123456789012345678', '12345678901234567'),
    value => value.replace('PEREZ  GOMEZ  JUAN CARLOS  ANDRES', 'PEREZ  GOMEZ  JUAN'),
    value => value.replace('0M19900102', '0X19900102'),
    value => value.replace('19900102', '29900102'),
    value => value.replace('19900102', '19990229'),
    value => value.replace('19900102', '19900431'),
    value => value.replace('123456O+', 'O+'),
    value => value.replace('O+', ''),
    value => value.replace('O+', 'UNKNOWN'),
  ])('rejects incomplete or invalid legacy content %#', change => {
    expect(parseCedulaPDF417(change(legacyColombian()))).toBeNull();
  });
  test('accepts a valid leap date in the legacy format', () => {
    expect(parseCedulaPDF417(legacyColombian(undefined, 'F', '20000229'))).toMatchObject({year: '2000', month: '02', day: '29', gender: 'Mujer'});
  });
});
