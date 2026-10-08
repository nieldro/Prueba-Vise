import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { dashboardApi } from '../api/endpoints';
import { ErrorState, Loading } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { MovementForm } from '../features/MovementForm';
import { formatDateTime, formatInt } from '../lib/format';

export function MovementsPage() {
  const recent = useQuery({ queryKey: ['dashboard', 7], queryFn: () => dashboardApi.summary(7) });

  return (
    <>
      <PageHeader title="Movimientos" subtitle="Registra entradas y salidas. El saldo nunca queda negativo." />

      <div className="grid-2 grid-2--form">
        <section className="card card--lift">
          <header className="card__header">
            <h2>Nuevo movimiento</h2>
          </header>
          <MovementForm />
        </section>

        <section className="card card--lift">
          <header className="card__header">
            <h2>Últimos movimientos</h2>
          </header>
          {recent.isLoading ? (
            <Loading />
          ) : recent.isError ? (
            <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
          ) : recent.data && recent.data.latestMovements.length > 0 ? (
            <ul className="feed">
              {recent.data.latestMovements.map((m) => (
                <li key={m.id}>
                  <span className={`feed__icon feed__icon--${m.type === 'ENTRADA' ? 'in' : 'out'}`}>
                    {m.type === 'ENTRADA' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                  </span>
                  <div className="feed__text">
                    <Link to={`/productos/${m.product.id}`}>{m.product.name}</Link>
                    <small>{formatDateTime(m.createdAt)}</small>
                  </div>
                  <strong className={m.type === 'ENTRADA' ? 'num-in' : 'num-out'}>
                    {m.type === 'ENTRADA' ? '+' : '-'}
                    {formatInt(m.quantity)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aún no hay movimientos.</p>
          )}
        </section>
      </div>
    </>
  );
}
