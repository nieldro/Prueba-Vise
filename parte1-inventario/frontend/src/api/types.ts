export type MovementType = 'ENTRADA' | 'SALIDA';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  productCount: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  /** Prisma serializa Decimal como texto. */
  price: string;
  stock: number;
  brand: string | null;
  description: string | null;
  unit: string;
  /** Rutas de imagen; la primera es la principal. */
  images: string[];
  specs: Array<{ label: string; value: string }> | null;
  category: { id: number; name: string };
}

export interface ProductInput {
  name: string;
  sku: string;
  categoryId: number;
  price: number;
  brand?: string;
  description?: string;
  unit?: string;
  /** Imagen principal (URL o ruta). Cadena vacía = quitar. Solo se envía si cambió. */
  imageUrl?: string;
  initialStock?: number;
}

export interface CalendarDay {
  day: string;
  movements: number;
  entries: number;
  exits: number;
}

export interface CalendarResult {
  month: string;
  days: CalendarDay[];
}

export interface Movement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

/** Fila del historial general: el movimiento junto con su producto y quien lo registró. */
export interface MovementRow extends Movement {
  product: { id: number; name: string; sku: string };
  user: { name: string } | null;
}

export interface MovementFilters {
  page: number;
  limit: number;
  type?: MovementType;
  productId?: number;
  date?: string;
  search?: string;
}

export interface MovementInput {
  productId: number;
  type: MovementType;
  quantity: number;
  note?: string;
}

export interface Kardex {
  product: { id: number; name: string; sku: string; stock: number };
  totals: { entries: number; exits: number };
  movements: Paginated<Movement>;
}

export interface DashboardSummary {
  days: number;
  totals: {
    products: number;
    unitsInStock: number;
    lowStockProducts: number;
    entries: number;
    exits: number;
    previousEntries: number;
    previousExits: number;
  };
  series: Array<{ day: string; entries: number; exits: number }>;
  latestMovements: Array<{
    id: number;
    type: MovementType;
    quantity: number;
    createdAt: string;
    product: { id: number; name: string };
  }>;
}
