// Shared time-slot utilities — imported by PlanningPage, NewAppointmentDialog, EditAppointmentDialog

export const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === 20 && min > 0) break;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

export const ALL_SLOTS = generateTimeSlots();

// Maps JS getDay() index → short day key used in hours config
export const DAY_MAP = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mer', 4: 'gio', 5: 'ven', 6: 'sab' };

// Orario di lavoro del Planning per giorno della settimana (getDay(): 0 = domenica).
// Ogni fascia e' [inizio, fine] in HH:MM; uno slot da 15 minuti e' di lavoro se inizia nella fascia
// (inizio <= slot < fine). Fuori dalle fasce (pausa, mattino presto, sera, giorni chiusi) la griglia
// mostra la fascia "Fuori orario", che resta cliccabile.
// "Prolunga orario" aggiunge una fascia per UN solo giorno oltre a questo orario.
const WORK_DAY_WITH_BREAK = [['08:15', '13:00'], ['14:00', '18:30']]; // martedi-giovedi: pausa 13:00-14:00
const WORK_DAY_CONTINUOUS = [['08:15', '18:30']];                     // venerdi e sabato: senza pausa
export const WORK_HOURS = {
  0: [],                      // domenica: chiuso
  1: [],                      // lunedi: chiuso
  2: WORK_DAY_WITH_BREAK,
  3: WORK_DAY_WITH_BREAK,
  4: WORK_DAY_WITH_BREAK,
  5: WORK_DAY_CONTINUOUS,
  6: WORK_DAY_CONTINUOUS,
};

const hhmmToMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// Lo slot (es. '13:15') e' orario di lavoro nel giorno della settimana dow (0-6)?
export const isWorkSlot = (dow, slot) => {
  const t = hhmmToMin(slot);
  return (WORK_HOURS[dow] || []).some(([start, end]) => t >= hhmmToMin(start) && t < hhmmToMin(end));
};
