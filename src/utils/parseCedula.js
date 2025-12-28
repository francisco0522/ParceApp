// utils/parseCedula.js

import moment, {months} from 'moment';

export function parseCedulaPDF417(value) {
  // Elimina los caracteres nulos
  //   const cleaned = value.replace(/\u0000/g, '');
  let dataString = value.replaceAll('�', ' ');
  // Ejemplo basado en la estructura típica colombiana
  // Ajusta las posiciones según tu cédula real

  //   const cedula = leaned.substring(24, 34).trim();
  //   const primerApellido = cleaned.substring(13, 25).trim();
  //   const segundoApellido = cleaned.substring(25, 38).trim();
  //   const nombres = cleaned.substring(38, 60).trim();
  //   const birthDateRaw = cleaned.substring(10, 18); // ejemplo YYYYMMDD
  //   const birthDate = new Date(
  //     parseInt(birthDateRaw.substring(0, 4)),
  //     parseInt(birthDateRaw.substring(4, 6)) - 1,
  //     parseInt(birthDateRaw.substring(6, 8)),
  //   );

  //   return {
  //     fullName: `${primerApellido} ${segundoApellido} ${nombres}`,
  //     birthDate,
  //     cedula,
  //   };
  // }

  dataString = dataString.replace('PubDSK_1', '0');
  const sI = dataString.match('[a-zA-Z]').index;
  dataString = dataString.substring(sI - 10);
  const btIndex = dataString.match('[+]|-').index;
  let usableData = dataString.substring(0, btIndex + 1);
  usableData = usableData.replace(/  +/g, ' ');
  const dataArray = usableData.split(' ');

  const firstAlpha = dataArray[0].match('[a-zA-Z]').index;
  const idNumber = Number(dataArray[0].substring(0, firstAlpha)).toString();
  const fullName = dataArray[0].substring(firstAlpha, dataArray[0].length);
  // 2️⃣ Extraer todos los bloques de letras antes del primer número
  const lettersBlocks = fullName.match(/[A-ZÑ]+/g);
  const after0M =
    fullName.split('0M')[1] != undefined
      ? fullName.split('0M')[1]
      : fullName.split('0F')[1]; // toma todo después de "0M"
  //   const extraData =
  //     dataArray.length > 4
  //       ? dataArray[4]
  //       : dataArray.length > 3
  //         ? dataArray[3]
  //         : dataArray[2];
  //   const birthDate = moment(
  //     `${extraData.substring(genderIndex + 1, genderIndex + 9)}`,
  //     'YYYYMMDD',
  //   ).toDate();

  return {
    idNumber,
    lastName1: lettersBlocks[0],
    lastName2: lettersBlocks[1],
    firstName1: lettersBlocks[2],
    middleName: lettersBlocks[3],
    year: after0M.slice(0, 4),
    month: after0M.slice(4, 6),
    day: after0M.slice(6, 8),
    gender: fullName.split('0M')[1] != undefined ? 'Hombre' : 'Mujer',
    fullName:
      `${lettersBlocks[2]}${lettersBlocks[3] != 'M' && lettersBlocks[3] != 'F' ? ` ${lettersBlocks[3]}` : ''} ${lettersBlocks[0]} ${lettersBlocks[1] || ''}`.trim(),
  };
}
