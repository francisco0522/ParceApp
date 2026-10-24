import {parsePassportMRZ} from '../src/utils/parsePassportMRZ';

// ICAO published specimen and synthetic variants only; never real documents.
const first = 'P<UTOERIKSSON<<ANNA<MARIA'.padEnd(44, '<');
const second = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
const reference = new Date('2026-10-23T00:00:00Z');
const digit = value => String([...value].reduce((sum, char, index) => sum +
  (char === '<' ? 0 : /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 55) * [7, 3, 1][index % 3], 0) % 10);
const build = ({birth = '740812', expiry = '120415', sex = 'F', optional = 'ZE184226B<<<<<', optionalDigit, document = 'L898902C3'} = {}) => {
  const fields = document + digit(document) + 'UTO' + birth + digit(birth) + sex + expiry + digit(expiry) + optional + (optionalDigit ?? digit(optional));
  return fields + digit(fields.slice(0, 10) + fields.slice(13, 20) + fields.slice(21, 43));
};
const parse = (line = second, name = first, date = reference) => parsePassportMRZ(`${name}\n${line}`, date);

describe('TD3 passport MRZ with synthetic data', () => {
  test('reads the ICAO specimen while returning no document number or MRZ', () => {
    expect(parse()).toEqual({fullName: 'ANNA MARIA ERIKSSON', year: '1974', month: '08', day: '12', gender: 'Mujer', documentType: 'passport'});
    expect(build()).toBe(second);
  });
  test('accepts expired documents for reading and OCR whitespace surrounding the MRZ', () => {
    expect(parsePassportMRZ(`OCR HEADER\n ${first.split('').join(' ')} \r\n\t${second}\nOCR FOOTER`, reference)).toEqual(parse());
  });
  test.each([9, 19, 27, 42, 43])('rejects a corrupted check digit at %s', index => {
    let changed = second.slice(0, index) + (second[index] === '0' ? '1' : '0') + second.slice(index + 1);
    if (index !== 43) {
      changed = changed.slice(0, 43) + digit(changed.slice(0, 10) + changed.slice(13, 20) + changed.slice(21, 43));
    }
    expect(parse(changed)).toBeNull();
  });
  test.each([null, undefined, 123, {}, '', first, `${first}\n${second.slice(1)}`])('rejects missing or malformed MRZ %p', value => {
    expect(parsePassportMRZ(value, reference)).toBeNull();
  });
  test('rejects two valid documents rather than selecting one ambiguously', () => {
    expect(parsePassportMRZ(`${first}\n${second}\n${first}\n${second}`, reference)).toBeNull();
  });
  test.each(['M', 'F', 'X', '<'])('maps supported sex marker %s', sex => {
    expect(parse(build({sex})).gender).toBe(({M: 'Hombre', F: 'Mujer', X: '', '<': ''})[sex]);
  });
  test.each([
    {birth: '990229'}, {birth: '740431'}, {birth: '741301'},
    {expiry: '120231'}, {expiry: '121301'}, {sex: 'U'}, {document: '<<<<<<<<<'},
  ])('rejects invalid checked fields %p', fields => {
    expect(parse(build(fields))).toBeNull();
  });
  test('accepts filler optional data with a filler check digit and valid composite', () => {
    expect(parse(build({optional: '<'.repeat(14), optionalDigit: '<'}))).toEqual(parse());
  });
  test.each(['P<UTO<<ANNA', 'P<UTOERIKSSON<<', 'P<UTOER1KSSON<<ANNA', 'I<UTOERIKSSON<<ANNA', 'P1UTOERIKSSON<<ANNA'])(
    'rejects unsupported document or invalid names %s', name => {
      expect(parse(second, name.padEnd(44, '<'))).toBeNull();
    },
  );
  test('preserves compound surnames and given names without filler characters', () => {
    expect(parse(second, 'P<UTODE<LA<CRUZ<<ANA<MARIA'.padEnd(44, '<')).fullName).toBe('ANA MARIA DE LA CRUZ');
  });
  test('resolves a birth date to the latest century not later than the reference', () => {
    expect(parse(build({birth: '261024'})).year).toBe('1926');
    expect(parse(build({birth: '261023'})).year).toBe('2026');
    expect(parse(build({birth: '000229'})).year).toBe('2000');
  });
  test('uses the supplied reference year rather than the machine date', () => {
    expect(parse(second, first, new Date('1980-01-01Z')).year).toBe('1974');
    expect(parse(second, first, 'invalid')).toBeNull();
  });
});
