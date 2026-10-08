import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, Boxes } from 'lucide-react';
import { movementsApi } from '../api/endpoints';
import { EmptyState, ErrorState, Loading } from '../components/feedback';
import { Pagination } from '../components/Pagination';
import { TiltCard } from '../components/TiltCard';
import { formatDateTime, formatInt } from '../lib/format';

/** Indicadores y tabla paginada del kardex de un producto (con saldo acumulado). */
export function KardexPanel({ productId }: { productId: number }) {
  const [page, setPage] = useState(1);

  const kardex = useQuery({
    queryKey: ['kardex', productId, page],
    queryFn: () => movementsApi.kardex(productId, page),
    placeholderData: (previous) => previous,
  });

  if (kardex.isLoading) return <Loading label="Cargando kardex" />;
  if (kardex.isError) return <ErrorState error={kardex.error} onRetry={() => void kardex.refetch()} />;
  if (!kardex.data) return null;

  const { product, totals, movements } = kardex.data;

  return (
    <>
      <section className="kpis kpis--three" aria-label="Resumen del producto">
        <TiltCard className="kpi kpi--coral">
          <div className="kpi__icon"><Boxes size={26} /></div>
          <span className="kpi__label">Saldo actual</span>
          <strong className="kpi__value">{formatInt(product.stock)}</strong>
          <span className="kpi__foot">Unidades disponibles</span>
        </TiltCard>
        <TiltCard className="kpi kpi--cyan">
          <div className="kpi__icon"><ArrowDownToLine size={26} /></div>
          <span className="kpi__label">Total entradas</span>
          <strong className="kpi__value">{formatInt(totals.entries)}</strong>
          <span className="kpi__foot">Desde el primer movimiento</span>
        </TiltCard>
        <TiltCard className="kpi kpi--purple">
          <div className="kpi__icon"><ArrowUpFromLine size={26} /></div>
          <span className="kpi__label">Total salidas</span>
          <strong className="kpi__value">{formatInt(totals.exits)}</strong>
          <span className="kpi__foot">Desde el primer movimiento</span>
        </TiltCard>
      </section>

      <section className="card">
        {movements.data.length === 0 ? (
          <EmptyState title="Sin movimientos" hint="Registra la primera entrada de este producto." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th className="num">Cantidad</th>
                    <th className="num">Saldo</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.map((m) => (
                    <tr key={m.id}>
                      <td>{formatDateTime(m.createdAt)}</td>
                      <td>
                        <span className={`badge ${m.type === 'ENTRADA' ? 'badge--ok' : 'badge--out'}`}>
                          {m.type === 'ENTRADA' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className={`num ${m.type === 'ENTRADA' ? 'num-in' : 'num-out'}`}>
                        {m.type === 'ENTRADA' ? '+' : '-'}
                        {formatInt(m.quantity)}
                      </td>
                      <td className="num">
                        <strong>{formatInt(m.balanceAfter)}</strong>
                      </td>
                      <td className="muted">{m.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={movements.meta.page}
              totalPages={movements.meta.totalPages}
              total={movements.meta.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
