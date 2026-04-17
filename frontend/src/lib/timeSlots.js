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
