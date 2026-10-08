import type { ReactNode } from 'react';
import { Inbox, TriangleAlert } from 'lucide-react';

export function Loading({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}...</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
  return (
    <div className="state state--error" role="alert">
      <TriangleAlert size={28} />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="state">
      <Inbox size={30} />
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

export function StockBadge({ stock, threshold = 10 }: { stock: number; threshold?: number }) {
  if (stock === 0) return <span className="badge badge--danger">Agotado</span>;
  if (stock <= threshold) return <span className="badge badge--warn">Stock bajo</span>;
  return <span className="badge badge--ok">Disponible</span>;
}
