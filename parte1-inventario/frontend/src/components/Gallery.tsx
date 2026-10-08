import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface GalleryProps {
  images: string[];
  alt: string;
}

/** Imagen principal con miniaturas y flechas, como en la ficha de producto de referencia. */
export function Gallery({ images, alt }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const count = Math.max(images.length, 1);

  // Si cambia de producto, vuelve a la primera imagen.
  useEffect(() => setIndex(0), [images]);

  const go = (delta: number) => setIndex((current) => (current + delta + count) % count);

  return (
    <div className="gallery">
      <div className="gallery__stage">
        <span className="gallery__tag">{index === 0 ? 'Principal' : `Vista ${index + 1}`}</span>
        <ProductImage key={images[index]} className="gallery__main" src={images[index]} alt={alt} />
        {count > 1 && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label="Imagen anterior">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label="Imagen siguiente">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="gallery__thumbs" role="tablist" aria-label="Imágenes del producto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`gallery__thumb${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
            >
              <ProductImage src={src} alt={`${alt}, vista ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
