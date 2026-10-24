const weights = [7, 3, 1];

function checkDigit(value, expected) {
  if (!/^\d$/.test(expected)) {
    return false;
  }
  const total = [...value].reduce((sum, char, index) => {
    const number =
      char === '<'
        ? 0
        : /\d/.test(char)
          ? Number(char)
          : char.charCodeAt(0) - 55;
    return sum + number * weights[index % weights.length];
  }, 0);
  return total % 10 === Number(expected);
}

function calendarDate(year, month, day) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function parseTD3(first, second, reference) {
  if (
    !/^P[A-Z<][A-Z<]{3}[A-Z<]{39}$/.test(first) ||
    !/^[A-Z0-9<]{44}$/.test(second)
  ) {
    return null;
  }
  const documentNumber = second.slice(0, 9);
  const birth = second.slice(13, 19);
  const expiry = second.slice(21, 27);
  const optional = second.slice(28, 42);
  if (
    /^<+$/.test(documentNumber) ||
    !/^[A-Z<]{3}$/.test(second.slice(10, 13)) ||
    !/^\d{6}$/.test(birth) ||
    !/^\d{6}$/.test(expiry) ||
    !/^[MFX<]$/.test(second[20]) ||
    !checkDigit(documentNumber, second[9]) ||
    !checkDigit(birth, second[19]) ||
    !checkDigit(expiry, second[27]) ||
    !(
      checkDigit(optional, second[42]) ||
      (/^<+$/.test(optional) && second[42] === '<')
    ) ||
    !checkDigit(
      second.slice(0, 10) + second.slice(13, 20) + second.slice(21, 43),
      second[43],
    )
  ) {
    return null;
  }

  const names = first.slice(5);
  const separator = names.indexOf('<<');
  if (separator < 1) {
    return null;
  }
  const surname = names.slice(0, separator);
  const givenNames = names.slice(separator + 2).replace(/<+$/, '');
  if (
    !/^[A-Z]+(?:<[A-Z]+)*$/.test(surname) ||
    !/^[A-Z]+(?:<+[A-Z]+)*$/.test(givenNames)
  ) {
    return null;
  }

  let year =
    Math.floor(reference.getUTCFullYear() / 100) * 100 +
    Number(birth.slice(0, 2));
  const month = Number(birth.slice(2, 4));
  const day = Number(birth.slice(4, 6));
  let birthday = calendarDate(year, month, day);
  if (!birthday) {
    return null;
  }
  if (birthday > reference) {
    year -= 100;
    birthday = calendarDate(year, month, day);
  }
  if (!birthday || birthday > reference) {
    return null;
  }
  // Expiration does not establish authenticity or eligibility; expired documents
  // can still be read. Its century does not affect calendar validation.
  if (
    !calendarDate(
      2000 + Number(expiry.slice(0, 2)),
      Number(expiry.slice(2, 4)),
      Number(expiry.slice(4, 6)),
    )
  ) {
    return null;
  }

  return {
    fullName: `${givenNames.replace(/<+/g, ' ')} ${surname.replace(/</g, ' ')}`,
    year: String(year),
    month: birth.slice(2, 4),
    day: birth.slice(4, 6),
    gender: second[20] === 'M' ? 'Hombre' : second[20] === 'F' ? 'Mujer' : '',
    documentType: 'passport',
  };
}

// ICAO TD3 only. Strict checks avoid guessing characters from ambiguous OCR.
export function parsePassportMRZ(text, referenceDate = new Date()) {
  if (typeof text !== 'string') {
    return null;
  }
  const reference = new Date(referenceDate);
  if (!Number.isFinite(reference.getTime())) {
    return null;
  }
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]/g, ''))
    .filter(Boolean);
  let result = null;
  for (let index = 0; index < lines.length - 1; index += 1) {
    const candidate = parseTD3(lines[index], lines[index + 1], reference);
    if (candidate) {
      if (result) {
        return null;
      }
      result = candidate;
    }
  }
  return result;
}
