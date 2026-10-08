import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Tag } from 'lucide-react';
import { categoriesApi } from '../api/endpoints';
import { EmptyState, ErrorState, Loading } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useCategories } from '../features/useCategories';

export function CategoriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Categoría "${category.name}" creada`);
      setName('');
      setFormError(null);
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setFormError('Escribe el nombre de la categoría');
    create.mutate(name.trim());
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
                  <div className="feed__text">
                    <strong>{c.name}</strong>
                  </div>
                  <Link className="badge badge--info" to="/productos">
                    {c.productCount} {c.productCount === 1 ? 'producto' : 'productos'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin categorías" hint="Crea la primera para empezar." />
          )}
        </section>
      </div>
    </>
  );
}
