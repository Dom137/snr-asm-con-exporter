/*
 * Copyright 2021 @OpenAdvice
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 *    http://www.apache.org/licenses/LICENSE-2.0
 */

/*
 * --------------------------------------------------------------------------------
 * Description:
 *        TODO:
 * --------------------------------------------------------------------------------
 */

exports.getCurrentDate = () => {
  let d = new Date();
  d =
    d.getFullYear() +
    '-' +
    ('0' + (d.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + d.getDate()).slice(-2) +
    ' ' +
    ('0' + d.getHours()).slice(-2) +
    ':' +
    ('0' + d.getMinutes()).slice(-2) +
    ':' +
    ('0' + d.getSeconds()).slice(-2);
  return d;
};

exports.getDateForUTC = (utcSeconds, LOKI_CONVERT_UTC) => {
  let d = new Date(utcSeconds / 1000000);

  // if set to 1, the date from Loki will be converted to local time
  if (LOKI_CONVERT_UTC == 1) {
    console.log('Converting Date to local time... ');
    d = d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  }

  return d;
};
