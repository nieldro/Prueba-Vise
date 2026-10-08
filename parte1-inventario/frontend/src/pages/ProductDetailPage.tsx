import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  BookOpen,
  Pencil,
  Wallet,
} from 'lucide-react';
import { movementsApi, productsApi } from '../api/endpoints';
import { ErrorState, Loading, StockBadge } from '../components/feedback';
import { Gallery } from '../components/Gallery';
import { Modal } from '../components/Modal';
import { TiltCard } from '../components/TiltCard';
import { KardexPanel } from '../features/KardexPanel';
import { MovementForm } from '../features/MovementForm';
import { ProductFormModal } from '../features/ProductFormModal';
import { formatDateTime, formatInt, formatMoney } from '../lib/format';

type Tab = 'general' | 'historial' | 'especificaciones';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'general', label: 'Información general' },
  { id: 'historial', label: 'Historial' },
  { id: 'especificaciones', label: 'Especificaciones' },
];

export function ProductDetailPage() {
  const productId = Number(useParams().id);
  const valid = Number.isInteger(productId) && productId > 0;

  const [tab, setTab] = useState<Tab>('general');
  const [moving, setMoving] = useState(false);
  const [editing, setEditing] = useState(false);

  const product = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId),
    enabled: valid,
  });
  const recent = useQuery({
    queryKey: ['kardex', productId, 'recent'],
    queryFn: () => movementsApi.kardex(productId, 1, 6),
    enabled: valid,
  });

  if (product.isLoading) return <Loading label="Cargando producto" />;
  if (product.isError || !valid) {
    return <ErrorState error={product.error ?? new Error('Producto no válido')} onRetry={() => void product.refetch()} />;
  }
  if (!product.data) return null;

  const p = product.data;
  const inventoryValue = Number(p.price) * p.stock;

  return (
    <>
      <div className="detail-head">
        <div className="detail-head__title">
          <Link className="icon-btn" to="/productos" aria-label="Volver a productos" title="Volver a productos">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1>{p.name}</h1>
            <div className="detail-head__meta">
              <span className="badge badge--info">{p.category.name}</span>
              <span className="muted">SKU {p.sku}</span>
              {p.brand && <span className="muted">&middot; {p.brand}</span>}
            </div>
          </div>
        </div>

        <div className="detail-head__side">
          <div className="detail-head__total">
            <span>Total en stock</span>
            <strong>
              {formatInt(p.stock)} <small>{p.unit}</small>
            </strong>
            <StockBadge stock={p.stock} />
          </div>
          <div className="detail-head__actions">
            <button type="button" className="btn btn--primary" onClick={() => setMoving(true)}>
              <ArrowLeftRight size={18} /> Registrar movimiento
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
              <Pencil size={18} /> Editar
            </button>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Secciones del producto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tabs__item${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="detail-grid">
          <section className="card card--lift">
            <Gallery images={p.images} alt={p.name} />

            <h2 className="detail-section-title">Información general</h2>
            <dl className="info-list">
              <div><dt>Tipo de producto</dt><dd>Con control de inventario</dd></div>
              <div><dt>Categoría</dt><dd>{p.category.name}</dd></div>
              <div><dt>Unidad</dt><dd>{p.unit}</dd></div>
              <div><dt>Marca</dt><dd>{p.brand ?? '-'}</dd></div>
              <div><dt>Precio</dt><dd>{formatMoney(p.price)}</dd></div>
            </dl>
            {p.description && <p className="detail-description">{p.description}</p>}
          </section>

          <div className="stack">
            <section className="stat-tiles" aria-label="Indicadores del producto">
              <TiltCard className="kpi kpi--coral kpi--compact">
                <span className="kpi__label">Valor en inventario</span>
                <strong className="kpi__value kpi__value--sm">{formatMoney(inventoryValue)}</strong>
                <div className="kpi__icon kpi__icon--corner"><Wallet size={20} /></div>
              </TiltCard>
              <TiltCard className="kpi kpi--cyan kpi--compact">
                <span className="kpi__label">Entradas</span>
                <strong className="kpi__value kpi__value--sm">{formatInt(recent.data?.totals.entries ?? 0)}</strong>
                <div className="kpi__icon kpi__icon--corner"><ArrowDownToLine size={20} /></div>
              </TiltCard>
              <TiltCard className="kpi kpi--purple kpi--compact">
                <span className="kpi__label">Salidas</span>
                <strong className="kpi__value kpi__value--sm">{formatInt(recent.data?.totals.exits ?? 0)}</strong>
                <div className="kpi__icon kpi__icon--corner"><ArrowUpFromLine size={20} /></div>
              </TiltCard>
            </section>

            <section className="card">
              <header className="card__header">
                <h2>Últimos movimientos</h2>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => setTab('historial')}>
                  <BookOpen size={16} /> Ver kardex
                </button>
              </header>
              {recent.isLoading ? (
                <Loading />
              ) : recent.data && recent.data.movements.data.length > 0 ? (
                <ul className="move-cards">
                  {recent.data.movements.data.map((m) => (
                    <li key={m.id} className={`move-card move-card--${m.type === 'ENTRADA' ? 'in' : 'out'}`}>
                      <span className="move-card__icon">
                        {m.type === 'ENTRADA' ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                      </span>
                      <div className="move-card__text">
                        <strong>{m.type === 'ENTRADA' ? 'Entrada' : 'Salida'}</strong>
                        <small>{m.note ?? formatDateTime(m.createdAt)}</small>
                      </div>
                      <div className="move-card__figure">
                        <span>Cantidad</span>
                        <strong className={m.type === 'ENTRADA' ? 'num-in' : 'num-out'}>
                          {m.type === 'ENTRADA' ? '+' : '-'}
                          {formatInt(m.quantity)}
                        </strong>
                      </div>
                      <div className="move-card__figure">
                        <span>Saldo</span>
                        <strong>{formatInt(m.balanceAfter)}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Aún no hay movimientos de este producto.</p>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'historial' && <KardexPanel productId={productId} />}

      {tab === 'especificaciones' && (
        <section className="card">
          <header className="card__header">
            <h2>Especificaciones técnicas</h2>
          </header>
          {p.specs && p.specs.length > 0 ? (
            <dl className="spec-grid">
              {p.specs.map((s) => (
                <div key={s.label} className="spec-grid__item">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">Este producto aún no tiene especificaciones registradas.</p>
          )}
          {p.description && <p className="detail-description">{p.description}</p>}
        </section>
      )}

      {moving && (
        <Modal title="Registrar movimiento" onClose={() => setMoving(false)}>
          <MovementForm product={p} onDone={() => setMoving(false)} />
        </Modal>
      )}
      {editing && <ProductFormModal product={p} onClose={() => setEditing(false)} />}
    </>
  );
}
