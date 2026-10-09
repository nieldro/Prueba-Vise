import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dashboardApi } from '../api/endpoints';
import { formatInt } from '../lib/format';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const monthTitle = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria del navegador. */
function todayKey(): string {
  const now = new Date();
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Calendario mensual del tablero: marca los días con movimientos (punto turquesa si hubo
 * entradas, magenta si hubo salidas) y resume la actividad del día elegido.
 */
export function Calendar() {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  }));
  const [selected, setSelected] = useState(today);

  const monthKey = `${cursor.year}-${pad(cursor.month)}`;
  const activity = useQuery({
    queryKey: ['calendar', monthKey],
    queryFn: () => dashboardApi.calendar(monthKey),
    placeholderData: (previous) => previous,
  });

  const byDay = useMemo(() => new Map(activity.data?.days.map((d) => [d.day, d])), [activity.data]);

  // Cuadrícula: la semana empieza el lunes.
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  }, [cursor]);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(Date.UTC(year, month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });

  const goToday = () => {
    setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
    setSelected(today);
  };

  const detail = byDay.get(selected);
  const rawTitle = monthTitle.format(new Date(Date.UTC(cursor.year, cursor.month - 1, 1)));
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  return (
    <div className="calendar">
      <header className="calendar__header">
        <strong className="calendar__title">{title}</strong>
        <div className="calendar__nav">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="calendar__grid" role="grid" aria-label={`Calendario de ${title}`}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar__weekday" role="columnheader">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const key = ymd(cursor.year, cursor.month, day);
          const info = byDay.get(key);
          const classes = ['calendar__day'];
          if (key === today) classes.push('is-today');
          if (key === selected) classes.push('is-selected');
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              className={classes.join(' ')}
              onClick={() => setSelected(key)}
              aria-label={`${day}${info ? `, ${info.movements} movimientos` : ''}`}
              aria-pressed={key === selected}
            >
              {day}
              {info && (
                <span className="calendar__dots" aria-hidden="true">
                  {info.entries > 0 && <i className="dot dot--in" />}
                  {info.exits > 0 && <i className="dot dot--out" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <footer className="calendar__footer">
        <div className="calendar__summary">
          <strong>{selected === today ? 'Hoy' : selected.split('-').reverse().join('/')}</strong>
          {detail ? (
            <span>
              {detail.movements} {detail.movements === 1 ? 'movimiento' : 'movimientos'}
              <em className="num-in"> +{formatInt(detail.entries)}</em>
              <em className="num-out"> -{formatInt(detail.exits)}</em>
            </span>
          ) : (
            <span className="muted">Sin movimientos</span>
          )}
        </div>
        <div className="calendar__actions">
          {detail && (
            <Link className="btn btn--primary btn--small" to={`/movimientos?date=${selected}`}>
              Ver movimientos
            </Link>
          )}
          {monthKey !== today.slice(0, 7) && (
            <button type="button" className="btn btn--ghost btn--small" onClick={goToday}>
              Ir a hoy
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
