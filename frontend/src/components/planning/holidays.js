import { addDays, isSameDay } from 'date-fns';

export const computeEaster = (year) => {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

export const getItalianHolidays = (year) => {
  const easter = computeEaster(year);
  const easterMonday = addDays(easter, 1);
  return [
    { date: new Date(year, 0, 1), name: 'Capodanno' },
    { date: new Date(year, 0, 6), name: 'Epifania' },
    { date: easter, name: 'Pasqua' },
    { date: easterMonday, name: "Lunedi dell'Angelo" },
    { date: new Date(year, 3, 25), name: 'Festa della Liberazione' },
    { date: new Date(year, 4, 1), name: 'Festa del Lavoro' },
    { date: new Date(year, 5, 2), name: 'Festa della Repubblica' },
    { date: new Date(year, 7, 15), name: 'Ferragosto' },
    { date: new Date(year, 10, 1), name: 'Tutti i Santi' },
    { date: new Date(year, 11, 8), name: 'Immacolata Concezione' },
    { date: new Date(year, 11, 25), name: 'Natale' },
    { date: new Date(year, 11, 26), name: 'Santo Stefano' },
  ];
};

export const isHoliday = (date) => {
  const holidays = getItalianHolidays(date.getFullYear());
  return holidays.find(h => isSameDay(h.date, date));
};
