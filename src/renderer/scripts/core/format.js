const MINUTE_MS = 60000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];
const LOCALE = 'pt-BR';

export const formatDuration = (ms) => {
  if (!ms) return '—';
  if (ms < MINUTE_MS) return 'menos de 1 min';
  const totalMinutes = Math.round(ms / MINUTE_MS);
  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
};

export const formatTimeAgo = (timestamp, now = Date.now()) => {
  if (!timestamp) return 'Nunca jogado';
  const minutes = Math.floor((now - timestamp) / MINUTE_MS);
  if (minutes < 1) return 'Agora mesmo';
  if (minutes < MINUTES_PER_HOUR) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `Há ${hours} h`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  if (days === 1) return 'Ontem';
  if (days < DAYS_PER_MONTH) return `Há ${days} dias`;
  return new Date(timestamp).toLocaleDateString(LOCALE);
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  let unitIndex = 0;
  let value = bytes;
  while (value >= BYTES_PER_UNIT && unitIndex < SIZE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${SIZE_UNITS[unitIndex]}`;
};

export const formatClockTime = (date) =>
  date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
