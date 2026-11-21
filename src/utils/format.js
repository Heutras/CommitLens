// The page is written in English, and prerendered HTML must match the first
// client render, so formatting uses one fixed locale and UTC for absolute dates.
const LOCALE = 'en-US';

const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat(LOCALE);
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** 83997 → "84K". Returns "Unavailable" for null, never a fake zero. */
export function formatCompact(value) {
  return typeof value === 'number' ? compact.format(value) : 'Unavailable';
}

/** 83997 → "83,997". */
export function formatNumber(value) {
  return typeof value === 'number' ? full.format(value) : 'Unavailable';
}

/** Percent with one decimal, and "<0.1%" for shares that round to zero. */
export function formatPercent(value) {
  if (typeof value !== 'number') return 'Unavailable';
  if (value > 0 && value < 0.1) return '<0.1%';
  return `${value.toFixed(1)}%`;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'];
/** 3647285 → "3.6 MB" (decimal units, as GitHub reports bytes). */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number') return 'Unavailable';
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < BYTE_UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}

/** "Nov 20, 2026" in UTC. */
export function formatDate(iso, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return 'Unavailable';
  return new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...options }).format(new Date(iso));
}

/** "Nov 20, 2026, 11:05 AM UTC", for tooltips on relative times. */
export function formatDateTime(iso) {
  return formatDate(iso, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** Short week label for chart axes, in UTC because GitHub weeks start at 00:00 UTC Sunday. */
export function formatWeek(iso) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

const DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

/** "3 hours ago", "last week". */
export function formatRelative(iso, now = Date.now()) {
  if (!iso) return 'Unavailable';
  let duration = (new Date(iso).getTime() - now) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relative.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return formatDate(iso);
}
