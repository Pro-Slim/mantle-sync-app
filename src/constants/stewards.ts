export type StewardId = 'HADUKEM' | 'LUISMA' | 'SLIM';
export type DutySlot = StewardId | 'IDLE';

export interface Steward {
  id: StewardId;
  label: string;
  color: string;
}

// Hues borrowed from the campaign category palette in utils/colorHelpers, kept
// clear of the teal the app's own chrome is painted in.
export const STEWARDS: Steward[] = [
  { id: 'HADUKEM', label: 'HADUKEM', color: '#9D4EDD' },
  { id: 'LUISMA', label: 'LUISMA', color: '#00D4FF' },
  { id: 'SLIM', label: 'SlimOnShark', color: '#FFB703' },
];

export const IDLE_COLOR = '#5A6B7A';

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const HOURS_IN_WEEK = 168;

// One row per UTC hour (row 0 = 00:00-01:00 UTC), one character per day,
// Monday-first. H=HADUKEM, L=LUISMA, S=SLIM, .=idle. Laid out as a block so it
// diffs by eye against the printed rota it was transcribed from.
const ROTA = [
  'LLLLLLL', // 00:00
  'LLLLLLL', // 01:00
  'LLLLLLL', // 02:00
  'LLLLLL.', // 03:00
  '....LLH', // 04:00
  '.....LH', // 05:00
  'SSSS..H', // 06:00
  'SSSSS..', // 07:00
  'SSSSS..', // 08:00
  'SSSSSSS', // 09:00
  'SSSSSS.', // 10:00
  'SSSS.S.', // 11:00
  '.....SS', // 12:00
  'HHH.H.S', // 13:00
  'HHHHHSS', // 14:00
  'HHHHHSS', // 15:00
  'HHHHHS.', // 16:00
  'HHHHHS.', // 17:00
  'HHHHHSL', // 18:00
  'HHHHHSL', // 19:00
  'HHHHHSL', // 20:00
  'H...H.L', // 21:00
  '.LLL..L', // 22:00
  'LLLLL.L', // 23:00
];

const SLOT_BY_CHAR: Record<string, DutySlot> = {
  H: 'HADUKEM',
  L: 'LUISMA',
  S: 'SLIM',
  '.': 'IDLE',
};

export const dutyAt = (dayIndex: number, utcHour: number): DutySlot =>
  SLOT_BY_CHAR[ROTA[utcHour]?.[dayIndex]] ?? 'IDLE';

export const getSteward = (slot: DutySlot): Steward | null =>
  STEWARDS.find((s) => s.id === slot) ?? null;

// Ids stay short and stable (the rota grid is keyed by them); this is the name
// people see.
export const slotLabel = (slot: DutySlot): string => getSteward(slot)?.label ?? slot;

export const slotColor = (slot: DutySlot): string =>
  getSteward(slot)?.color ?? IDLE_COLOR;

// Counted from ROTA rather than typed in: the printed rota states 44 hours each
// with 36 idle, so a transcription slip shows up as a wrong number on screen
// instead of hiding in the grid.
export const weeklyHours = (): Record<DutySlot, number> => {
  const totals: Record<DutySlot, number> = { HADUKEM: 0, LUISMA: 0, SLIM: 0, IDLE: 0 };
  for (let hour = 0; hour < 24; hour++) {
    for (let day = 0; day < 7; day++) {
      totals[dutyAt(day, hour)]++;
    }
  }
  return totals;
};

export interface Shift {
  slot: DutySlot;
  startDayIndex: number;
  startHour: number;
  endDayIndex: number;
  endHour: number;
  lengthHours: number;
}

const linearIndex = (dayIndex: number, hour: number): number => dayIndex * 24 + hour;
const wrap = (index: number): number => ((index % HOURS_IN_WEEK) + HOURS_IN_WEEK) % HOURS_IN_WEEK;
const slotAtLinear = (index: number): DutySlot => {
  const i = wrap(index);
  return dutyAt(Math.floor(i / 24), i % 24);
};

// A shift is the unbroken run of hours around the current one, walked over the
// week as a 168-hour ring so a run crossing midnight -- or crossing Sunday into
// Monday, which LUISMA's does -- reads as one shift rather than two.
export const shiftAround = (dayIndex: number, utcHour: number): Shift => {
  const slot = dutyAt(dayIndex, utcHour);
  const here = linearIndex(dayIndex, utcHour);

  let start = here;
  while (start > here - HOURS_IN_WEEK && slotAtLinear(start - 1) === slot) start--;

  let end = here;
  while (end < start + HOURS_IN_WEEK - 1 && slotAtLinear(end + 1) === slot) end++;

  const startWrapped = wrap(start);
  const endWrapped = wrap(end + 1);

  return {
    slot,
    startDayIndex: Math.floor(startWrapped / 24),
    startHour: startWrapped % 24,
    endDayIndex: Math.floor(endWrapped / 24),
    endHour: endWrapped % 24,
    lengthHours: end - start + 1,
  };
};
