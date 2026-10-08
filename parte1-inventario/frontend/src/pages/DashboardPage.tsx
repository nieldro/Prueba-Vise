import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dashboardApi, productsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, Loading } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { TiltCard } from '../components/TiltCard';
import { formatDateTime, formatDay, formatInt, percentChange } from '../lib/format';

const RANGES = [7, 14, 30] as const;

interface KpiProps {
  tone: 'green' | 'blue' | 'violet' | 'coral';
  label: string;
  value: number;
  icon: ReactNode;
  delta?: number | null;
  footnote?: string;
}

function Kpi({ tone, label, value, icon, delta, footnote }: KpiProps) {
  return (
    <TiltCard className={`kpi kpi--${tone}`}>
      <div className="kpi__icon">{icon}</div>
      <span className="kpi__label">{label}</span>
      <strong className="kpi__value">{formatInt(value)}</strong>
      <span className="kpi__foot">
        {delta !== undefined && delta !== null ? (
          <>
            {delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {Math.abs(delta).toFixed(1)}% vs. periodo anterior
          </>
        ) : (
          footnote
        )}
      </span>
    </TiltCard>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(7);

  const summary = useQuery({ queryKey: ['dashboard', days], queryFn: () => dashboardApi.summary(days) });
  const lowStock = useQuery({
    queryKey: ['products', 'low-stock', 'widget'],
    queryFn: () => productsApi.lowStock({ page: 1, limit: 5, threshold: 10 }),
  });

  if (summary.isLoading) return <Loading label="Cargando resumen" />;
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  if (!summary.data) return null;

  const { totals, series, latestMovements } = summary.data;
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        subtitle="Este es el pulso de tu inventario."
        actions={
          <div className="segmented segmented--compact" role="group" aria-label="Periodo">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={`segmented__item${days === r ? ' is-active' : ''}`}
                onClick={() => setDays(r)}
                aria-pressed={days === r}
              >
                {r} días
              </button>
            ))}
          </div>
        }
      />

      <section className="kpis" aria-label="Indicadores">
        <Kpi
          tone="green"
          label="Unidades entrantes"
          value={totals.entries}
          icon={<ArrowDownToLine size={26} />}
          delta={percentChange(totals.entries, totals.previousEntries)}
          footnote="Sin periodo previo para comparar"
        />
        <Kpi
          tone="blue"
          label="Unidades salientes"
          value={totals.exits}
          icon={<ArrowUpFromLine size={26} />}
          delta={percentChange(totals.exits, totals.previousExits)}
          footnote="Sin periodo previo para comparar"
        />
        <Kpi
          tone="violet"
          label="Unidades en stock"
          value={totals.unitsInStock}
          icon={<Boxes size={26} />}
          footnote={`${formatInt(totals.products)} productos activos`}
        />
        <Kpi
          tone="coral"
          label="Productos con stock bajo"
          value={totals.lowStockProducts}
          icon={<TriangleAlert size={26} />}
          footnote="Con 10 unidades o menos"
        />
      </section>

      <div className="grid-2">
        <section className="card card--lift">
          <header className="card__header">
            <h2>Entradas y salidas</h2>
            <div className="legend">
              <span className="legend__dot legend__dot--in" /> Entradas
              <span className="legend__dot legend__dot--out" /> Salidas
            </div>
          </header>
          <div className="chart" role="img" aria-label="Gráfica de entradas y salidas por día">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={series} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e7d32" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2e7d32" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e3e9f4" strokeDasharray="4 6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7a99', fontSize: 12 }}
                  minTickGap={18}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7a99', fontSize: 12 }} />
                <Tooltip
                  cursor={{ stroke: '#9db2d9', strokeDasharray: '4 4' }}
                  labelFormatter={(label) => formatDay(String(label))}
                  formatter={(value, name) => [formatInt(Number(value)), name === 'entries' ? 'Entradas' : 'Salidas']}
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 12px 30px rgba(31,78,140,.22)' }}
                />
                <Area type="monotone" dataKey="entries" stroke="#2e7d32" strokeWidth={3} fill="url(#gIn)" />
                <Area type="monotone" dataKey="exits" stroke="#2563eb" strokeWidth={3} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="stack">
          <section className="card card--lift">
            <header className="card__header">
              <h2>Últimos movimientos</h2>
            </header>
            {latestMovements.length === 0 ? (
              <p className="muted">Aún no hay movimientos.</p>
            ) : (
              <ul className="feed">
                {latestMovements.map((m) => (
                  <li key={m.id}>
                    <span className={`feed__icon feed__icon--${m.type === 'ENTRADA' ? 'in' : 'out'}`}>
                      {m.type === 'ENTRADA' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                    </span>
                    <div className="feed__text">
                      <Link to={`/productos/${m.product.id}/kardex`}>{m.product.name}</Link>
                      <small>{formatDateTime(m.createdAt)}</small>
                    </div>
                    <strong className={m.type === 'ENTRADA' ? 'num-in' : 'num-out'}>
                      {m.type === 'ENTRADA' ? '+' : '-'}
                      {formatInt(m.quantity)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            <Link className="card__link" to="/movimientos">
              Registrar movimiento <ArrowRight size={16} />
            </Link>
          </section>

          <section className="card card--lift">
            <header className="card__header">
              <h2>Requieren reposición</h2>
            </header>
            {lowStock.data && lowStock.data.data.length > 0 ? (
              <ul className="feed">
                {lowStock.data.data.map((p) => (
                  <li key={p.id}>
                    <div className="feed__text">
                      <Link to={`/productos/${p.id}/kardex`}>{p.name}</Link>
                      <small>{p.sku}</small>
                    </div>
                    <span className={`badge ${p.stock === 0 ? 'badge--danger' : 'badge--warn'}`}>
                      {formatInt(p.stock)} uds
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Todo el inventario esta sobre el umbral.</p>
            )}
            <Link className="card__link" to="/stock-bajo">
              Ver todos <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
