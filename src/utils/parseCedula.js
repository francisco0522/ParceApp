import moment from 'moment';

const genderLabel = sex => ({M: 'Hombre', F: 'Mujer', X: ''})[sex];

function validBirthDate(value, format) {
  const date = moment(value, format, true);
  return date.isValid() && !date.isAfter(moment(), 'day');
}

// Only known PDF417 layouts are read; this does not verify document authenticity.
export function parseCedulaPDF417(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  // PubDSK_1 has fixed-width fields. Read them before removing NUL padding
  // or the marker, which would shift every subsequent field.
  if (value.slice(24, 32).toUpperCase() === 'PUBDSK_1') {
    const isPadding = text =>
      [...text].every(char => char === '\u0000' || char === ' ');
    const digits = (start, end) =>
      /^\d+$/.test(value.slice(start, end)) &&
      value.slice(start, end).length === end - start;
    const nameAt = (start, end) =>
      value
        .slice(start, end)
        .split('\u0000')
        .join(' ')
        .replace(/^ +| +$/g, '');
    const namePattern = /^[A-ZÁÉÍÓÚÜÑ]+(?:(?: +|['’-])[A-ZÁÉÍÓÚÜÑ]+)*$/;
    const lastName1 = nameAt(58, 81);
    const lastName2 = nameAt(81, 104);
    const firstName1 = nameAt(104, 127);
    const middleName = nameAt(127, 150);
    const sex = value[151];
    const birthDate = value.slice(152, 160);
    if (
      !digits(0, 10) ||
      !isPadding(value.slice(10, 24)) ||
      !isPadding(value.slice(32, 40)) ||
      !digits(40, 46) ||
      !isPadding(value.slice(46, 48)) ||
      !digits(48, 58) ||
      !namePattern.test(lastName1) ||
      !namePattern.test(firstName1) ||
      (lastName2 && !namePattern.test(lastName2)) ||
      (middleName && !namePattern.test(middleName)) ||
      value[150] !== '0' ||
      !/^[MF]$/.test(sex) ||
      !validBirthDate(birthDate, 'YYYYMMDD') ||
      !digits(160, 166) ||
      !/^(?:AB|A|B|O)[+-]/.test(value.slice(166))
    ) {
      return null;
    }
    return {
      lastName1,
      lastName2,
      firstName1,
      middleName,
      fullName: [firstName1, middleName, lastName1, lastName2]
        .filter(Boolean)
        .join(' '),
      year: birthDate.slice(0, 4),
      month: birthDate.slice(4, 6),
      day: birthDate.slice(6, 8),
      gender: genderLabel(sex),
    };
  }

  const data = value
    .split('\u0000')
    .join(' ')
    .replace(/�/g, ' ')
    .replace(/PubDSK_1/gi, ' ');

  // This legacy Colombian layout starts with metadata, not a document number.
  // Match its full header and padded name fields instead of guessing offsets.
  const legacyColombian = data.match(
    /^\d{12}[A-Z] {9}\d{12} {6}\d{18}([A-ZÑ]+(?: [A-ZÑ]+)*) {2,}([A-ZÑ]+(?: [A-ZÑ]+)*) {2,}([A-ZÑ]+(?: [A-ZÑ]+)*) {2,}([A-ZÑ]+(?: [A-ZÑ]+)*) {2,}0([MF])(\d{8})\d{6}(?:AB|A|B|O)[+-]/,
  );
  if (legacyColombian) {
    const [, lastName1, lastName2, firstName1, middleName, sex, birthDate] =
      legacyColombian;
    if (!validBirthDate(birthDate, 'YYYYMMDD')) {
      return null;
    }
    return {
      lastName1,
      lastName2,
      firstName1,
      middleName,
      fullName: `${firstName1} ${middleName} ${lastName1} ${lastName2}`,
      year: birthDate.slice(0, 4),
      month: birthDate.slice(4, 6),
      day: birthDate.slice(6, 8),
      gender: genderLabel(sex),
    };
  }

  if (value.includes('@')) {
    const fields = value.trim().split('@');
    if (fields.length !== 8 && fields.length !== 9) {
      return null;
    }
    const [, surname, givenNames, sex, identifier, , birthDate, issuedAt] =
      fields;
    const namePattern =
      /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\u2019-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
    if (
      !/^\d{7,8}$/.test(identifier) ||
      !namePattern.test(surname.trim()) ||
      !namePattern.test(givenNames.trim()) ||
      !/^[MFX]$/.test(sex) ||
      !validBirthDate(birthDate, 'DD/MM/YYYY') ||
      !validBirthDate(issuedAt, 'DD/MM/YYYY') ||
      moment(issuedAt, 'DD/MM/YYYY', true).isBefore(
        moment(birthDate, 'DD/MM/YYYY', true),
        'day',
      )
    ) {
      return null;
    }
    const [day, month, year] = birthDate.split('/');
    return {
      idNumber: identifier,
      fullName: `${givenNames.trim()} ${surname.trim()}`,
      year,
      month,
      day,
      gender: genderLabel(sex),
    };
  }

  // Preserve the existing Colombian, zero-separated layout without guessing
  // offsets when the payload does not contain its expected structure.
  const firstLetter = data.search(/[A-ZÑa-zñ]/);
  if (firstLetter < 10) {
    return null;
  }
  const identifierMatch = data
    .slice(0, firstLetter)
    .match(/(?:^|\D)(\d{10})\s*$/);
  const match = data
    .slice(firstLetter)
    .match(/^([A-ZÑ][A-ZÑ0\s]*?)0([MF])(\d{8})/);
  if (!identifierMatch || !match) {
    return null;
  }
  const identifier = identifierMatch[1];
  if (/^0+$/.test(identifier)) {
    return null;
  }
  const [, names, sex, birthDate] = match;
  const nameParts = names.trim().split(/[0\s]+/);
  if (nameParts.length < 3 || nameParts.length > 4) {
    return null;
  }
  if (!validBirthDate(birthDate, 'YYYYMMDD')) {
    return null;
  }
  const [lastName1, lastName2, firstName1, middleName] = nameParts;
  return {
    idNumber: Number(identifier).toString(),
    lastName1,
    lastName2,
    firstName1,
    middleName,
    year: birthDate.slice(0, 4),
    month: birthDate.slice(4, 6),
    day: birthDate.slice(6, 8),
    gender: genderLabel(sex),
    fullName: [firstName1, middleName, lastName1, lastName2]
      .filter(Boolean)
      .join(' '),
  };
}
