import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Search } from 'lucide-react';
import { movementsApi, productsApi } from '../api/endpoints';
import type { MovementReason, MovementType, Product } from '../api/types';
import { ProductImage } from '../components/ProductImage';
import { useToast } from '../components/Toast';
import { formatInt } from '../lib/format';
import { REASONS } from '../lib/reasons';
import { useDebounced } from '../lib/useDebounced';

type ProductSummary = Pick<Product, 'id' | 'name' | 'sku' | 'stock'> & Partial<Pick<Product, 'images' | 'unit'>>;

interface MovementFormProps {
  /** Producto fijo (por ejemplo, desde su fila o su ficha): no se muestra el buscador. */
  product?: ProductSummary;
  /** Producto con el que arranca el formulario, pero que se puede cambiar. */
  defaultProduct?: ProductSummary;
  initialType?: MovementType;
  onDone?: () => void;
}

function ProductHeader({ product }: { product: ProductSummary }) {
  return (
    <div className="picked-product">
      <ProductImage className="picked-product__img" src={product.images?.[0]} alt="" />
      <div>
        <strong>{product.name}</strong>
        <small>
          {product.sku} &middot; stock actual {formatInt(product.stock)} {product.unit ?? ''}
        </small>
      </div>
    </div>
  );
}

export function MovementForm({ product: fixedProduct, defaultProduct, initialType = 'ENTRADA', onDone }: MovementFormProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [picked, setPicked] = useState<ProductSummary | undefined>(defaultProduct);
  const [term, setTerm] = useState('');
  const search = useDebounced(term);
  const [type, setType] = useState<MovementType>(initialType);
  const [reason, setReason] = useState<MovementReason>(REASONS[initialType][0].value);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const product = fixedProduct ?? picked;
  const needsPicker = !fixedProduct && !picked;

  const results = useQuery({
    queryKey: ['products', 'picker', search],
    queryFn: () => productsApi.list({ page: 1, limit: 8, search: search || undefined }),
    enabled: needsPicker,
  });

  const changeType = (next: MovementType) => {
    setType(next);
    setReason(REASONS[next][0].value);
    setFormError(null);
  };

  const qty = Number(quantity);
  const validQty = Number.isInteger(qty) && qty > 0;
  const stockAfter = product && validQty ? product.stock + (type === 'ENTRADA' ? qty : -qty) : null;
  const insufficient = type === 'SALIDA' && stockAfter !== null && stockAfter < 0;

  const mutation = useMutation({
    mutationFn: movementsApi.register,
    onSuccess: (movement) => {
      void queryClient.invalidateQueries();
      toast.success(
        `${movement.type === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada. Saldo: ${formatInt(movement.balanceAfter)}`,
      );
      // Con buscador, el formulario queda listo para otro movimiento del mismo producto.
      if (!fixedProduct && picked) setPicked({ ...picked, stock: movement.balanceAfter });
      setQuantity('');
      setNote('');
      setFormError(null);
      onDone?.();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!product) return setFormError('Selecciona un producto');
    if (!validQty) return setFormError('La cantidad debe ser un entero mayor a 0');
    if (insufficient) return setFormError(`Stock insuficiente: hay ${formatInt(product.stock)} unidades`);
    setFormError(null);
    mutation.mutate({ productId: product.id, type, reason, quantity: qty, note: note.trim() || undefined });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {product ? (
        <div className="form__product-row">
          <ProductHeader product={product} />
          {!fixedProduct && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setPicked(undefined)}>
              Cambiar
            </button>
          )}
        </div>
      ) : (
        <div className="field">
          <span>Producto</span>
          <label className="search search--inline">
            <Search size={18} />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Busca por nombre o SKU"
              aria-label="Buscar producto"
              autoFocus
            />
          </label>
          <ul className="picker" aria-label="Resultados">
            {results.data?.data.map((p) => (
              <li key={p.id}>
                <button type="button" className="picker__item" onClick={() => setPicked(p)}>
                  <ProductImage className="picked-product__img" src={p.images[0]} alt="" />
                  <span className="picker__text">
                    <strong>{p.name}</strong>
                    <small>{p.sku}</small>
                  </span>
                  <span className="picker__stock">{formatInt(p.stock)} {p.unit}</span>
                </button>
              </li>
            ))}
            {results.data && results.data.data.length === 0 && <li className="muted picker__empty">Sin resultados</li>}
          </ul>
        </div>
      )}

      <div className="field">
        <span>Tipo de movimiento</span>
        <div className="segmented" role="group" aria-label="Tipo de movimiento">
          <button
            type="button"
            className={`segmented__item segmented__item--in${type === 'ENTRADA' ? ' is-active' : ''}`}
            onClick={() => changeType('ENTRADA')}
            aria-pressed={type === 'ENTRADA'}
          >
            <ArrowDownToLine size={17} /> Entrada
          </button>
          <button
            type="button"
            className={`segmented__item segmented__item--out${type === 'SALIDA' ? ' is-active' : ''}`}
            onClick={() => changeType('SALIDA')}
            aria-pressed={type === 'SALIDA'}
          >
            <ArrowUpFromLine size={17} /> Salida
          </button>
        </div>
      </div>

      <fieldset className="field reasons">
        <legend>{type === 'ENTRADA' ? '¿Por qué entra?' : '¿Por qué sale?'}</legend>
        <div className="reasons__grid">
          {REASONS[type].map((r) => (
            <label key={r.value} className={`reason${reason === r.value ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              <strong>{r.label}</strong>
              <small>{r.hint}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Cantidad</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
        />
      </label>

      {product && stockAfter !== null && (
        <div className={`stock-preview${insufficient ? ' is-error' : ''}`} aria-live="polite">
          <span>{formatInt(product.stock)}</span>
          <ArrowRight size={16} />
          <strong>{insufficient ? 'insuficiente' : formatInt(stockAfter)}</strong>
          <small>{insufficient ? 'No alcanza para esta salida' : 'Stock después del movimiento'}</small>
        </div>
      )}

      <label className="field">
        <span>Nota (opcional)</span>
        <input
          type="text"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Número de factura, puesto, detalle del daño..."
        />
      </label>

      {formError && (
        <p className="form__error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={mutation.isPending || !product}>
        {mutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
      </button>
    </form>
  );
}
