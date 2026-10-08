export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function paginated<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export function skipOf(page: number, limit: number): number {
  return (page - 1) * limit;
}
