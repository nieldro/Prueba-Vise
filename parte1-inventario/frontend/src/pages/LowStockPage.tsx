import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { productsApi } from '../api/endpoints';
import { EmptyState, ErrorState, Loading, StockBadge } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { formatInt } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';

export function LowStockPage() {
  const [thresholdInput, setThresholdInput] = useState('10');
  const [page, setPage] = useState(1);
  const parsed = Number(thresholdInput);
  const threshold = useDebounced(Number.isInteger(parsed) && parsed >= 0 ? parsed : 10);

  const list = useQuery({
    queryKey: ['products', 'low-stock', { threshold, page }],
    queryFn: () => productsApi.lowStock({ page, limit: 10, threshold }),
    placeholderData: (previous) => previous,
  });

  return (
    <>
      <PageHeader
        title="Stock bajo"
        subtitle="Productos con existencias iguales o inferiores al umbral."
        actions={
          <label className="inline-field">
            <span>Umbral</span>
            <input
              type="number"
              min={0}
              step={1}
              value={thresholdInput}
              onChange={(e) => {
                setThresholdInput(e.target.value);
                setPage(1);
              }}
            />
          </label>
        }
      />

      <section className="card">
        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyState title="Todo en orden" hint={`Ningún producto tiene ${formatInt(threshold)} unidades o menos.`} />
        ) : (
          list.data && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="num">Stock</th>
                      <th>Estado</th>
                      <th className="actions-col">Kardex</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <small className="cell-sub">{p.sku}</small>
                        </td>
                        <td>{p.category.name}</td>
                        <td className="num">
                          <strong>{formatInt(p.stock)}</strong>
                        </td>
                        <td>
                          <StockBadge stock={p.stock} threshold={threshold} />
                        </td>
                        <td className="actions-col">
                          <div className="row-actions">
                            <Link className="icon-btn" title="Ver kardex" aria-label={`Ver kardex de ${p.name}`} to={`/productos/${p.id}/kardex`}>
                              <BookOpen size={17} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={list.data.meta.page}
                totalPages={list.data.meta.totalPages}
                total={list.data.meta.total}
                onChange={setPage}
              />
            </>
          )
        )}
      </section>
    </>
  );
}
