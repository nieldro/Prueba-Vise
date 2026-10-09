import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Download, FilterX, Plus, Search } from 'lucide-react';
import { movementsApi, productsApi } from '../api/endpoints';
import type { MovementReason, MovementType } from '../api/types';
import { EmptyState, ErrorState, Loading } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import { downloadCsv, fetchAllPages, todayStamp } from '../lib/csv';
import { formatDateTime, formatInt } from '../lib/format';
import { FILTER_REASONS, reasonLabel } from '../lib/reasons';
import { useDebounced } from '../lib/useDebounced';

const PAGE_SIZE = 12;

export function MovementsPage() {
  const toast = useToast();
  // Los filtros viven en la URL: el calendario y otras pantallas pueden enlazar a una vista filtrada.
  const [params, setParams] = useSearchParams();
  const type = (params.get('type') as MovementType | null) ?? undefined;
  const reason = (params.get('reason') as MovementReason | null) ?? undefined;
  const productId = params.get('productId') ? Number(params.get('productId')) : undefined;
  const date = params.get('date') ?? undefined;

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const search = useDebounced(searchInput);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const clearFilters = () => {
    setParams({}, { replace: true });
    setSearchInput('');
    setPage(1);
  };
  const hasFilters = Boolean(type || reason || productId || date || searchInput);

  const filters = { type, reason, productId, date, search: search || undefined };
  const products = useQuery({
    queryKey: ['products', 'picker'],
    queryFn: () => productsApi.list({ page: 1, limit: 100 }),
  });
  const list = useQuery({
    queryKey: ['movements', { ...filters, page }],
    queryFn: () => movementsApi.list({ ...filters, page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllPages((p, limit) => movementsApi.list({ ...filters, page: p, limit }));
      downloadCsv(
        `movimientos-${todayStamp()}.csv`,
        ['Fecha', 'SKU', 'Producto', 'Tipo', 'Motivo', 'Cantidad', 'Saldo', 'Nota', 'Registrado por'],
        rows.map((m) => [
          formatDateTime(m.createdAt),
          m.product.sku,
          m.product.name,
          m.type === 'ENTRADA' ? 'Entrada' : 'Salida',
          reasonLabel(m.reason),
          m.quantity,
          m.balanceAfter,
          m.note,
          m.user?.name,
        ]),
      );
      toast.success(`${rows.length} movimientos exportados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Historial de entradas y salidas. El saldo nunca queda negativo."
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => void exportCsv()} disabled={exporting}>
              <Download size={18} /> {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <Link className="btn btn--primary" to="/movimientos/nuevo">
              <Plus size={18} /> Nuevo movimiento
            </Link>
          </>
        }
      />

      <section className="card">
        <div className="toolbar">
          <label className="search search--inline">
            <Search size={18} />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Producto o SKU"
              aria-label="Buscar producto"
            />
          </label>
          <select className="select" value={type ?? ''} onChange={(e) => setFilter('type', e.target.value)} aria-label="Tipo">
            <option value="">Entradas y salidas</option>
            <option value="ENTRADA">Solo entradas</option>
            <option value="SALIDA">Solo salidas</option>
          </select>
          <select className="select" value={reason ?? ''} onChange={(e) => setFilter('reason', e.target.value)} aria-label="Motivo">
            <option value="">Todos los motivos</option>
            {FILTER_REASONS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((r) => (
                  <option key={r} value={r}>
                    {reasonLabel(r)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            className="select"
            value={productId ?? ''}
            onChange={(e) => setFilter('productId', e.target.value)}
            aria-label="Producto"
          >
            <option value="">Todos los productos</option>
            {products.data?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="select"
            type="date"
            value={date ?? ''}
            max={todayStamp()}
            onChange={(e) => setFilter('date', e.target.value)}
            aria-label="Día"
          />
          {hasFilters && (
            <button type="button" className="btn btn--ghost btn--small" onClick={clearFilters}>
              <FilterX size={16} /> Limpiar filtros
            </button>
          )}
        </div>

        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            hint={hasFilters ? 'Ningún movimiento coincide con los filtros.' : 'Registra el primero con "Nuevo movimiento".'}
            action={
              hasFilters ? (
                <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          list.data && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th className="num">Cantidad</th>
                      <th className="num">Saldo</th>
                      <th>Nota</th>
                      <th>Registró</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((m) => (
                      <tr key={m.id}>
                        <td className="nowrap">{formatDateTime(m.createdAt)}</td>
                        <td>
                          <Link to={`/productos/${m.product.id}`}>
                            <strong>{m.product.name}</strong>
                          </Link>
                          <small className="cell-sub">{m.product.sku}</small>
                        </td>
                        <td>
                          <span className={`badge ${m.type === 'ENTRADA' ? 'badge--ok' : 'badge--out'}`}>
                            {m.type === 'ENTRADA' ? (
                              <ArrowDownToLine size={12} className="badge__icon" />
                            ) : (
                              <ArrowUpFromLine size={12} className="badge__icon" />
                            )}
                            {m.type === 'ENTRADA' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td>{reasonLabel(m.reason)}</td>
                        <td className={`num ${m.type === 'ENTRADA' ? 'num-in' : 'num-out'}`}>
                          {m.type === 'ENTRADA' ? '+' : '-'}
                          {formatInt(m.quantity)}
                        </td>
                        <td className="num">
                          <strong>{formatInt(m.balanceAfter)}</strong>
                        </td>
                        <td className="muted">{m.note ?? '-'}</td>
                        <td className="muted">{m.user?.name ?? '-'}</td>
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
