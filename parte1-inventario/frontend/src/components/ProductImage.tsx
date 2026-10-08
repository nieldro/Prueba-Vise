import { useState } from 'react';

const PLACEHOLDER = '/products/placeholder.svg';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/** Imagen de producto con respaldo: si no hay foto o falla la carga, muestra una caja genérica. */
export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={className}
      src={failed || !src ? PLACEHOLDER : src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
