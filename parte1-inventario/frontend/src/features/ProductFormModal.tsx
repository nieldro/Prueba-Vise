import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/endpoints';
import type { Product } from '../api/types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useCategories } from './useCategories';

interface ProductFormModalProps {
  /** Sin producto = modo creacion. */
  product?: Product;
  onClose: () => void;
}

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,38}[A-Z0-9]$/;

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const isEdit = Boolean(product);
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useCategories();

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(product?.categoryId ?? '');
  const [price, setPrice] = useState(product ? String(Number(product.price)) : '');
  const [initialStock, setInitialStock] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { name: string; sku: string; categoryId: number; price: number; initialStock?: number }) =>
      product ? productsApi.update(product.id, input) : productsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado');
      onClose();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanSku = sku.trim().toUpperCase();
    const priceNumber = Number(price);
    const stockNumber = initialStock === '' ? undefined : Number(initialStock);

    if (!name.trim()) return setFormError('El nombre es obligatorio');
    if (!SKU_PATTERN.test(cleanSku)) {
      return setFormError('El SKU debe tener entre 3 y 40 caracteres: letras, números y guiones');
    }
    if (!categoryId) return setFormError('Selecciona una categoría');
    if (price === '' || !Number.isFinite(priceNumber) || priceNumber < 0) {
      return setFormError('El precio debe ser un número mayor o igual a 0');
    }
    if (stockNumber !== undefined && (!Number.isInteger(stockNumber) || stockNumber < 0)) {
      return setFormError('El stock inicial debe ser un entero mayor o igual a 0');
    }

    setFormError(null);
    mutation.mutate({
      name: name.trim(),
      sku: cleanSku,
      categoryId,
      price: priceNumber,
      ...(!isEdit && stockNumber !== undefined && { initialStock: stockNumber }),
    });
  };

  return (
    <Modal
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="product-form" className="btn btn--primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="product-form" className="form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Nombre</span>
          <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="form__row">
          <label className="field">
            <span>SKU</span>
            <input value={sku} maxLength={40} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="HER-0001" />
          </label>
          <label className="field">
            <span>Categoría</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecciona</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form__row">
          <label className="field">
            <span>Precio (COP)</span>
            <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          {!isEdit && (
            <label className="field">
              <span>Stock inicial</span>
              <input
                type="number"
                min={0}
                step={1}
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                placeholder="0"
              />
            </label>
          )}
        </div>

        {isEdit && <p className="hint">El stock solo cambia registrando movimientos.</p>}
        {formError && (
          <p className="form__error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
