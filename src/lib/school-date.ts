const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export type SchoolDay = (typeof DAY_NAMES)[number];

export function getJakartaDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function isValidDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toDatabaseDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function shiftSchoolDateKey(dateKey: string, days: number) {
  const date = toDatabaseDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getSchoolDay(dateKey: string): SchoolDay {
  return DAY_NAMES[toDatabaseDate(dateKey).getUTCDay()];
}

export function formatSchoolDate(dateKey: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDatabaseDate(dateKey));
}

/**
 * Prisma's PostgreSQL adapter returns timestamptz values as Jakarta wall-clock
 * components encoded in a UTC Date. Normalize those session timestamps back
 * to the real instant before formatting or comparing expiry windows.
 */
export function normalizePrismaJakartaTimestamp(value: Date) {
  return new Date(value.getTime() - 7 * 60 * 60 * 1000);
}
