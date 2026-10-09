import type { Paginated } from '../api/types';

type Cell = string | number | null | undefined;

/** Excel en configuración regional española separa columnas con punto y coma. */
const SEPARATOR = ';';

function escapeCell(value: Cell): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Evita que Excel interprete el contenido como una fórmula.
  const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /["\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Descarga un CSV con BOM UTF-8 para que Excel muestre bien las tildes. */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Recorre todas las páginas de un listado paginado (de 100 en 100) y devuelve todos los registros. */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const limit = 100;
  const first = await fetchPage(1, limit);
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, i) => fetchPage(i + 2, limit)),
  );
  return [first, ...rest].flatMap((p) => p.data);
}

export function todayStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
