const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('es-CO');
const dateTime = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});
const shortDay = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const formatMoney = (value: string | number): string => currency.format(Number(value));
export const formatInt = (value: number): string => integer.format(value);
export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
/** Recibe 'YYYY-MM-DD' (sin zona) y evita el corrimiento de un día al parsearlo. */
export const formatDay = (ymd: string): string => shortDay.format(new Date(`${ymd}T00:00:00Z`));

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
