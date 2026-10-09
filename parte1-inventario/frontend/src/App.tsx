import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from './components/feedback';
import { AppShell } from './layout/AppShell';
import { RequireAuth } from './layout/RequireAuth';
import { LoginPage } from './pages/LoginPage';

// Cada pagina se descarga bajo demanda; el tablero arrastra la libreria de graficas.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const NewProductPage = lazy(() => import('./pages/NewProductPage').then((m) => ({ default: m.NewProductPage })));
const RegisterMovementPage = lazy(() => import('./pages/RegisterMovementPage').then((m) => ({ default: m.RegisterMovementPage })));
const KardexPage = lazy(() => import('./pages/KardexPage').then((m) => ({ default: m.KardexPage })));
const MovementsPage = lazy(() => import('./pages/MovementsPage').then((m) => ({ default: m.MovementsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const LowStockPage = lazy(() => import('./pages/LowStockPage').then((m) => ({ default: m.LowStockPage })));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="productos/nuevo" element={<NewProductPage />} />
          <Route path="productos/:id" element={<ProductDetailPage />} />
          <Route path="productos/:id/kardex" element={<KardexPage />} />
          <Route path="movimientos" element={<MovementsPage />} />
          <Route path="movimientos/nuevo" element={<RegisterMovementPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="stock-bajo" element={<LowStockPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
