import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { productsApi } from '../api/endpoints';
import type { Product } from '../api/types';
import { EmptyState, ErrorState, Loading, StockBadge } from '../components/feedback';
import { Modal } from '../components/Modal';
import { ProductImage } from '../components/ProductImage';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import { MovementForm } from '../features/MovementForm';
import { ProductFormModal } from '../features/ProductFormModal';
import { useCategories } from '../features/useCategories';
import { formatInt, formatMoney } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';

const PAGE_SIZE = 10;

export function ProductsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  // El termino de busqueda vive en la URL: asi funciona desde la barra superior y se puede compartir.
  const urlSearch = params.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const search = useDebounced(searchInput);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [moving, setMoving] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const categories = useCategories();
  const list = useQuery({
    queryKey: ['products', { page, categoryId, search }],
    queryFn: () =>
      productsApi.list({
        page,
        limit: PAGE_SIZE,
        categoryId: categoryId === '' ? undefined : categoryId,
        search: search || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const remove = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success('Producto eliminado');
      setDeleting(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeleting(null);
    },
  });

  const changeSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
    setParams(value ? { search: value } : {}, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo, precios y existencias."
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
            <Plus size={18} /> Nuevo producto
          </button>
        }
      />

      <section className="card">
        <div className="toolbar">
          <label className="search search--inline">
            <Search size={18} />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Nombre o SKU"
              aria-label="Buscar"
            />
          </label>
          <select
            className="select"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyState title="Sin resultados" hint="Prueba con otra busqueda o categoría." />
        ) : (
          list.data && (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="num">Precio</th>
                      <th className="num">Stock</th>
                      <th>Estado</th>
                      <th className="actions-col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link className="product-cell" to={`/productos/${p.id}`}>
                            <ProductImage className="product-cell__img" src={p.images[0]} alt="" />
                            <span>
                              <strong>{p.name}</strong>
                              <small className="cell-sub">
                                {p.sku}
                                {p.brand ? ` · ${p.brand}` : ''}
                              </small>
                            </span>
                          </Link>
                        </td>
                        <td>{p.category.name}</td>
                        <td className="num">{formatMoney(p.price)}</td>
                        <td className="num">
                          <strong>{formatInt(p.stock)}</strong>
                        </td>
                        <td>
                          <StockBadge stock={p.stock} />
                        </td>
                        <td className="actions-col">
                          <div className="row-actions">
                            <button type="button" className="icon-btn" title="Registrar movimiento" aria-label={`Registrar movimiento de ${p.name}`} onClick={() => setMoving(p)}>
                              <ArrowLeftRight size={17} />
                            </button>
                            <Link className="icon-btn" title="Ver kardex" aria-label={`Ver kardex de ${p.name}`} to={`/productos/${p.id}/kardex`}>
                              <BookOpen size={17} />
                            </Link>
                            <button type="button" className="icon-btn" title="Editar" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}>
                              <Pencil size={17} />
                            </button>
                            <button type="button" className="icon-btn icon-btn--danger" title="Eliminar" aria-label={`Eliminar ${p.name}`} onClick={() => setDeleting(p)}>
                              <Trash2 size={17} />
                            </button>
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

      {editing && (
        <ProductFormModal product={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      {moving && (
        <Modal title="Registrar movimiento" onClose={() => setMoving(null)}>
          <MovementForm product={moving} onDone={() => setMoving(null)} />
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Eliminar producto"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--danger" disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)}>
                {remove.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          }
        >
          <p>
            Se eliminará <strong>{deleting.name}</strong> ({deleting.sku}). Solo es posible si no tiene movimientos
            en el kardex.
          </p>
        </Modal>
      )}
    </>
  );
}
