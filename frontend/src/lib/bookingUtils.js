import { format } from 'date-fns';

// Time slots from 08:00 to 20:00 every 15 minutes
export const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

export const getDayHoursForDate = (dateStr, hoursConfig) => {
  if (!hoursConfig) return { dayHours: '', isClosed: false, isConfigured: false };
  const dayMapShort = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mer', 4: 'gio', 5: 'ven', 6: 'sab' };
  const dayMapFull = { 0: 'domenica', 1: 'lunedì', 2: 'martedì', 3: 'mercoledì', 4: 'giovedì', 5: 'venerdì', 6: 'sabato' };
  const dayMapFullNoAccent = { 0: 'domenica', 1: 'lunedi', 2: 'martedi', 3: 'mercoledi', 4: 'giovedi', 5: 'venerdi', 6: 'sabato' };
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const configLower = {};
  Object.keys(hoursConfig).forEach(k => { configLower[k.toLowerCase()] = hoursConfig[k]; });
  const dayHours = (
    configLower[dayMapFull[dow]] ||
    configLower[dayMapFullNoAccent[dow]] ||
    configLower[dayMapShort[dow]] ||
    ''
  );
  const val = (typeof dayHours === 'string' ? dayHours : '').toLowerCase().trim();
  const isClosed = val === 'chiuso' || val === '-';
  return { dayHours: val, isClosed, isConfigured: !!val };
};

export const getAvailableSlotsForDate = (dateStr, hoursConfig, blockedSlots = []) => {
  const BUFFER_MINUTES = 15;
  let slots = [];

  const hasHoursConfig = hoursConfig && Object.keys(hoursConfig).some(k => {
    const v = hoursConfig[k];
    return v && v !== '' && (typeof v === 'string' ? v.toLowerCase() : '') !== 'chiuso' && v !== '-';
  });

  if (hasHoursConfig) {
    const { dayHours, isClosed } = getDayHoursForDate(dateStr, hoursConfig);
    if (isClosed) return [];
    const rangePattern = /(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/g;
    let match;
    let foundRange = false;
    while ((match = rangePattern.exec(dayHours)) !== null) {
      foundRange = true;
      const openMin = parseInt(match[1]) * 60 + parseInt(match[2]);
      const closeMin = parseInt(match[3]) * 60 + parseInt(match[4]);
      TIME_SLOTS.forEach(slot => {
        const [h, m] = slot.split(':').map(Number);
        const t = h * 60 + m;
        if (t >= openMin && t < closeMin) slots.push(slot);
      });
    }
    if (!foundRange && !dayHours) {
      slots = [...TIME_SLOTS];
    } else if (!foundRange) {
      slots = [...TIME_SLOTS];
    }
  } else {
    slots = [...TIME_SLOTS];
  }

  // Filter past times for today (with 15-min buffer)
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr === today) {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes() + BUFFER_MINUTES;
    slots = slots.filter(slot => {
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m >= cur;
    });
  }

  // Filter out admin-blocked slots
  if (blockedSlots.length > 0) {
    const blockedSet = new Set(blockedSlots);
    slots = slots.filter(slot => !blockedSet.has(slot));
  }

  return slots;
};

export const isAllSlotsPastForToday = (dateStr, hoursConfig) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== today) return false;
  const hasHoursConfig = hoursConfig && Object.keys(hoursConfig).some(k => {
    const v = hoursConfig[k];
    return v && v !== '' && (typeof v === 'string' ? v.toLowerCase() : '') !== 'chiuso' && v !== '-';
  });
  if (hasHoursConfig) {
    const { isClosed } = getDayHoursForDate(dateStr, hoursConfig);
    if (isClosed) return false;
  }
  return true;
};

export const getNextAvailableDate = (currentDateStr, hoursConfig, maxDays = 14) => {
  const current = new Date(currentDateStr + 'T12:00:00');
  for (let i = 1; i <= maxDays; i++) {
    const next = new Date(current);
    next.setDate(next.getDate() + i);
    const nextStr = format(next, 'yyyy-MM-dd');
    const slots = getAvailableSlotsForDate(nextStr, hoursConfig, []);
    if (slots.length > 0) return nextStr;
  }
  return null;
};
