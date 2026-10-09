import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { PageHeader } from '../components/PageHeader';
import { ProductForm } from '../features/ProductForm';
import type { ProductDraft } from '../features/ProductForm';
import { formatInt, formatMoney } from '../lib/format';

const EMPTY: ProductDraft = {
  name: '',
  sku: '',
  price: null,
  initialStock: null,
  brand: '',
  unit: 'Und',
  imageUrl: '',
  categoryName: '',
};

export function NewProductPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProductDraft>(EMPTY);

  return (
    <>
      <PageHeader
        title="Nuevo producto"
        subtitle="Agrega un producto al catálogo. Después podrás registrar sus entradas y salidas."
        actions={
          <Link className="btn btn--ghost" to="/productos">
            <ArrowLeft size={18} /> Volver a productos
          </Link>
        }
      />

      <div className="grid-2 grid-2--form">
        <section className="card card--lift">
          <header className="card__header">
            <h2>Datos del producto</h2>
          </header>
          <ProductForm
            onSaved={(product) => navigate(`/productos/${product.id}`)}
            onCancel={() => navigate('/productos')}
            onDraftChange={setDraft}
          />
        </section>

        <section className="card card--lift preview-card" aria-label="Vista previa">
          <header className="card__header">
            <h2>Vista previa</h2>
          </header>
          <div className="preview-card__image">
            <ProductImage key={draft.imageUrl} src={draft.imageUrl || undefined} alt="" />
          </div>
          <strong className="preview-card__name">{draft.name || 'Nombre del producto'}</strong>
          <small className="muted">
            {draft.sku || 'SKU'}
            {draft.brand ? ` · ${draft.brand}` : ''}
            {draft.categoryName ? ` · ${draft.categoryName}` : ''}
          </small>
          <dl className="info-list">
            <div>
              <dt>Precio</dt>
              <dd>{draft.price !== null ? formatMoney(draft.price) : '-'}</dd>
            </div>
            <div>
              <dt>Stock inicial</dt>
              <dd>
                {draft.initialStock !== null ? formatInt(draft.initialStock) : 0} {draft.unit || 'Und'}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
