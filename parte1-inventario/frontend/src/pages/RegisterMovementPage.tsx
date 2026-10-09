import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { dashboardApi, productsApi } from '../api/endpoints';
import type { MovementType } from '../api/types';
import { ErrorState, Loading } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { MovementForm } from '../features/MovementForm';
import { formatDateTime, formatInt } from '../lib/format';

export function RegisterMovementPage() {
  const [params] = useSearchParams();
  const productId = params.get('productId') ? Number(params.get('productId')) : undefined;
  const type: MovementType = params.get('type') === 'SALIDA' ? 'SALIDA' : 'ENTRADA';

  const preselected = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId!),
    enabled: Boolean(productId),
  });
  const recent = useQuery({ queryKey: ['dashboard', 7], queryFn: () => dashboardApi.summary(7) });

  return (
    <>
      <PageHeader
        title="Registrar movimiento"
        subtitle="Entradas por compra o devolución; salidas por venta, daño, pérdida o dotación."
        actions={
          <Link className="btn btn--ghost" to="/movimientos">
            <History size={18} /> Ver historial
          </Link>
        }
      />

      <div className="grid-2 grid-2--form">
        <section className="card card--lift">
          <header className="card__header">
            <h2>Nuevo movimiento</h2>
          </header>
          {productId && preselected.isLoading ? (
            <Loading />
          ) : productId && preselected.isError ? (
            <ErrorState error={preselected.error} onRetry={() => void preselected.refetch()} />
          ) : (
            <MovementForm key={`${productId}-${type}`} defaultProduct={preselected.data} initialType={type} />
          )}
        </section>

        <section className="card card--lift">
          <header className="card__header">
            <h2>Últimos movimientos</h2>
          </header>
          {recent.isLoading ? (
            <Loading />
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
