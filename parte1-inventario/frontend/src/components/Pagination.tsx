import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Paginación">
      <span className="pagination__info">
        {total} {total === 1 ? 'registro' : 'registros'} &middot; página {page} de {totalPages}
      </span>
      <div className="pagination__buttons">
        <button
          type="button"
          className="icon-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  );
}
