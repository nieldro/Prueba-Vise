import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/endpoints';
import type { Product, ProductInput } from '../api/types';
import { useToast } from '../components/Toast';
import { useCategories } from './useCategories';

/** Valores del formulario, para que quien lo use pueda mostrar una vista previa en vivo. */
export interface ProductDraft {
  name: string;
  sku: string;
  price: number | null;
  initialStock: number | null;
  brand: string;
  unit: string;
  imageUrl: string;
  categoryName: string;
}

interface ProductFormProps {
  /** Sin producto = modo creación. */
  product?: Product;
  onSaved: (product: Product) => void;
  onCancel?: () => void;
  onDraftChange?: (draft: ProductDraft) => void;
}

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,38}[A-Z0-9]$/;

export function ProductForm({ product, onSaved, onCancel, onDraftChange }: ProductFormProps) {
  const isEdit = Boolean(product);
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useCategories();

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(product?.categoryId ?? '');
  const [price, setPrice] = useState(product ? String(Number(product.price)) : '');
  const [initialStock, setInitialStock] = useState('');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'Und');
  const [description, setDescription] = useState(product?.description ?? '');
  const originalImage = product?.images[0] ?? '';
  const [imageUrl, setImageUrl] = useState(originalImage);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    onDraftChange?.({
      name,
      sku: sku.trim().toUpperCase(),
      price: price === '' || Number.isNaN(Number(price)) ? null : Number(price),
      initialStock: initialStock === '' || Number.isNaN(Number(initialStock)) ? null : Number(initialStock),
      brand,
      unit,
      imageUrl: imageUrl.trim(),
      categoryName: categories.data?.find((c) => c.id === categoryId)?.name ?? '',
    });
    // onDraftChange cambia en cada render del padre; solo importan los valores del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, sku, price, initialStock, brand, unit, imageUrl, categoryId, categories.data]);

  const mutation = useMutation({
    mutationFn: (input: ProductInput) =>
      product ? productsApi.update(product.id, input) : productsApi.create(input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries();
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado');
      onSaved(saved);
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
    if (imageUrl.trim() && !/^(https?:\/\/|\/)\S+$/.test(imageUrl.trim())) {
      return setFormError('La imagen debe ser una URL que empiece con http:// o https://');
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
      unit: unit.trim() || 'Und',
      ...(brand.trim() && { brand: brand.trim() }),
      ...(description.trim() && { description: description.trim() }),
      // Solo se envía si cambió: así editar otros datos no reemplaza la galería completa.
      ...(imageUrl.trim() !== originalImage && { imageUrl: imageUrl.trim() }),
      ...(!isEdit && stockNumber !== undefined && { initialStock: stockNumber }),
    });
  };

  return (
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

      <div className="form__row">
        <label className="field">
          <span>Marca</span>
          <input value={brand} maxLength={80} onChange={(e) => setBrand(e.target.value)} />
        </label>
        <label className="field">
          <span>Unidad</span>
          <input value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="Und, Caja, Par" />
        </label>
      </div>

      <label className="field">
        <span>Imagen (URL, opcional)</span>
        <input value={imageUrl} maxLength={500} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </label>

      <label className="field">
        <span>Descripción</span>
        <textarea value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)} />
      </label>

      {isEdit ? (
        <p className="hint">El stock solo cambia registrando movimientos.</p>
      ) : (
        <p className="hint">Si indicas stock inicial, queda registrado en el kardex como una entrada de "Stock inicial".</p>
      )}
      {formError && (
        <p className="form__error" role="alert">
          {formError}
        </p>
      )}

      <div className="form__actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
