import type { Product } from '../api/types';
import { Modal } from '../components/Modal';
import { ProductForm } from './ProductForm';

interface ProductFormModalProps {
  product: Product;
  onClose: () => void;
}

/** Edición rápida de un producto sin salir de la pantalla en la que se está. */
export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  return (
    <Modal title="Editar producto" onClose={onClose}>
      <ProductForm product={product} onSaved={onClose} onCancel={onClose} />
    </Modal>
  );
}
