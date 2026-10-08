import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { productsApi } from '../api/endpoints';
import { ErrorState, Loading } from '../components/feedback';
import { PageHeader } from '../components/PageHeader';
import { KardexPanel } from '../features/KardexPanel';

export function KardexPage() {
  const productId = Number(useParams().id);
  const valid = Number.isInteger(productId) && productId > 0;
  const product = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.get(productId),
    enabled: valid,
  });

  if (product.isLoading) return <Loading label="Cargando kardex" />;
  if (product.isError || !valid) {
    return <ErrorState error={product.error ?? new Error('Producto no válido')} onRetry={() => void product.refetch()} />;
  }
  if (!product.data) return null;

  return (
    <>
      <PageHeader
        title={`Kardex: ${product.data.name}`}
        subtitle={`SKU ${product.data.sku}`}
        actions={
          <Link className="btn btn--ghost" to={`/productos/${productId}`}>
            <ArrowLeft size={18} /> Volver a la ficha
          </Link>
        }
      />
      <KardexPanel productId={productId} />
    </>
  );
}
