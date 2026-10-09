import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { categoriesApi } from '../api/endpoints';
import type { Category } from '../api/types';
import { EmptyState, ErrorState, Loading } from '../components/feedback';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useCategories } from '../features/useCategories';

export function CategoriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useCategories();

  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const refresh = () => void queryClient.invalidateQueries();

  const create = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: (category) => {
      refresh();
      toast.success(`Categoría "${category.name}" creada`);
      setName('');
      setFormError(null);
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const rename = useMutation({
    mutationFn: (input: { id: number; name: string }) => categoriesApi.rename(input.id, input.name),
    onSuccess: (category) => {
      refresh();
      toast.success(`Categoría renombrada a "${category.name}"`);
      setEditing(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      refresh();
      toast.success('Categoría eliminada');
      setDeleting(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeleting(null);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setFormError('Escribe el nombre de la categoría');
    create.mutate(name.trim());
  };

  const saveRename = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const value = editing.name.trim();
    if (!value) return toast.error('El nombre no puede estar vacío');
    rename.mutate({ id: editing.id, name: value });
  };

  return (
    <>
      <PageHeader title="Categorías" subtitle="Agrupa los productos del catálogo." />

      <div className="grid-2 grid-2--form">
        <section className="card card--lift">
          <header className="card__header">
            <h2>Nueva categoría</h2>
          </header>
          <form className="form" onSubmit={submit} noValidate>
            <label className="field">
              <span>Nombre</span>
              <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ferretería" />
            </label>
            {formError && (
              <p className="form__error" role="alert">
                {formError}
              </p>
            )}
            <button type="submit" className="btn btn--primary" disabled={create.isPending}>
              <Plus size={18} /> {create.isPending ? 'Creando...' : 'Crear categoría'}
            </button>
          </form>
        </section>

        <section className="card card--lift">
          <header className="card__header">
            <h2>Categorías existentes</h2>
          </header>
          {categories.isLoading ? (
            <Loading />
          ) : categories.isError ? (
            <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
          ) : categories.data && categories.data.length > 0 ? (
            <ul className="feed">
              {categories.data.map((c) => (
                <li key={c.id}>
                  <span className="feed__icon feed__icon--tag">
                    <Tag size={16} />
                  </span>

                  {editing?.id === c.id ? (
                    <form className="inline-edit" onSubmit={saveRename}>
                      <input
                        autoFocus
                        value={editing.name}
                        maxLength={80}
                        aria-label={`Nuevo nombre para ${c.name}`}
                        onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      />
                      <button type="submit" className="icon-btn" aria-label="Guardar nombre" disabled={rename.isPending}>
                        <Check size={17} />
                      </button>
                      <button type="button" className="icon-btn" aria-label="Cancelar" onClick={() => setEditing(null)}>
                        <X size={17} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="feed__text">
                        <strong>{c.name}</strong>
                      </div>
                      <Link
                        className="badge badge--info"
                        to={`/productos?categoryId=${c.id}`}
                        title="Ver los productos de esta categoría"
                      >
                        {c.productCount} {c.productCount === 1 ? 'producto' : 'productos'}
                      </Link>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Renombrar"
                          aria-label={`Renombrar ${c.name}`}
                          onClick={() => setEditing({ id: c.id, name: c.name })}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Eliminar"
                          aria-label={`Eliminar ${c.name}`}
                          onClick={() => setDeleting(c)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin categorías" hint="Crea la primera para empezar." />
          )}
        </section>
      </div>

      {deleting && (
        <Modal
          title="Eliminar categoría"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleting.id)}
              >
                {remove.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          }
        >
          <p>
            Se eliminará <strong>{deleting.name}</strong>.{' '}
            {deleting.productCount > 0
              ? `Tiene ${deleting.productCount} ${deleting.productCount === 1 ? 'producto' : 'productos'} y no se podrá eliminar hasta que los muevas a otra categoría.`
              : 'No tiene productos asociados.'}
          </p>
        </Modal>
      )}
    </>
  );
}
