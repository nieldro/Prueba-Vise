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
  category: { id: number; name: string };
}

export interface ProductInput {
  name: string;
  sku: string;
  categoryId: number;
  price: number;
  initialStock?: number;
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
