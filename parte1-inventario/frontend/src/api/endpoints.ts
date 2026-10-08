import { request } from './client';
import type {
  CalendarResult,
  Category,
  DashboardSummary,
  Kardex,
  LoginResponse,
  Movement,
  MovementInput,
  Paginated,
  Product,
  ProductInput,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } }),
};

export interface ProductFilters {
  page: number;
  limit: number;
  categoryId?: number;
  search?: string;
}

export const productsApi = {
  list: (filters: ProductFilters) =>
    request<Paginated<Product>>('/products', { query: { ...filters } }),
  get: (id: number) => request<Product>(`/products/${id}`),
  lowStock: (query: { page: number; limit: number; threshold: number }) =>
    request<Paginated<Product>>('/products/low-stock', { query }),
  create: (input: ProductInput) => request<Product>('/products', { method: 'POST', body: input }),
  update: (id: number, input: Omit<ProductInput, 'initialStock'>) =>
    request<Product>(`/products/${id}`, { method: 'PATCH', body: input }),
  remove: (id: number) => request<void>(`/products/${id}`, { method: 'DELETE' }),
};

export const categoriesApi = {
  list: () => request<Category[]>('/categories'),
  create: (name: string) => request<Category>('/categories', { method: 'POST', body: { name } }),
};

export const movementsApi = {
  register: (input: MovementInput) =>
    request<Movement>('/movements', { method: 'POST', body: input }),
  kardex: (productId: number, page: number, limit = 15) =>
    request<Kardex>(`/products/${productId}/kardex`, { query: { page, limit } }),
};

export const dashboardApi = {
  summary: (days: number) => request<DashboardSummary>('/dashboard/summary', { query: { days } }),
  calendar: (month: string) => request<CalendarResult>('/dashboard/calendar', { query: { month } }),
};
