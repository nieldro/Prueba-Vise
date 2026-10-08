import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { movementsApi, productsApi } from '../api/endpoints';
import type { MovementType, Product } from '../api/types';
import { useToast } from '../components/Toast';
import { formatInt } from '../lib/format';

interface MovementFormProps {
  /** Si viene fijo, no se muestra el selector de producto. */
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'stock'>;
  onDone?: () => void;
}

export function MovementForm({ product, onDone }: MovementFormProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState<number | ''>(product?.id ?? '');
  const [type, setType] = useState<MovementType>('ENTRADA');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const picker = useQuery({
    queryKey: ['products', 'picker'],
    queryFn: () => productsApi.list({ page: 1, limit: 100 }),
    enabled: !product,
  });

  const selected = product ?? picker.data?.data.find((p) => p.id === productId);

  const mutation = useMutation({
    mutationFn: movementsApi.register,
    onSuccess: (movement) => {
      void queryClient.invalidateQueries();
      toast.success(
        `${movement.type === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada. Saldo: ${formatInt(movement.balanceAfter)}`,
      );
      setQuantity('');
      setNote('');
      setFormError(null);
      onDone?.();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const qty = Number(quantity);
    if (!productId) return setFormError('Selecciona un producto');
    if (!Number.isInteger(qty) || qty < 1) return setFormError('La cantidad debe ser un entero mayor a 0');
    if (type === 'SALIDA' && selected && qty > selected.stock) {
      return setFormError(`Stock insuficiente: hay ${formatInt(selected.stock)} unidades`);
    }
    setFormError(null);
    mutation.mutate({ productId, type, quantity: qty, note: note.trim() || undefined });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {product ? (
        <div className="form__product">
          <strong>{product.name}</strong>
          <small>
            {product.sku} &middot; stock actual {formatInt(product.stock)}
          </small>
        </div>
      ) : (
        <label className="field">
          <span>Producto</span>
          <select value={productId} onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Selecciona un producto</option>
            {picker.data?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name} (stock {formatInt(p.stock)})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="field">
        <span>Tipo de movimiento</span>
        <div className="segmented" role="group" aria-label="Tipo de movimiento">
          <button
            type="button"
            className={`segmented__item segmented__item--in${type === 'ENTRADA' ? ' is-active' : ''}`}
            onClick={() => setType('ENTRADA')}
            aria-pressed={type === 'ENTRADA'}
          >
            <ArrowDownToLine size={17} /> Entrada
          </button>
          <button
            type="button"
            className={`segmented__item segmented__item--out${type === 'SALIDA' ? ' is-active' : ''}`}
            onClick={() => setType('SALIDA')}
            aria-pressed={type === 'SALIDA'}
          >
            <ArrowUpFromLine size={17} /> Salida
          </button>
        </div>
      </div>

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

      <label className="field">
        <span>Nota (opcional)</span>
        <input
          type="text"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Compra a proveedor, despacho a obra..."
        />
      </label>

      {formError && (
        <p className="form__error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
        {mutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
      </button>
    </form>
  );
}
