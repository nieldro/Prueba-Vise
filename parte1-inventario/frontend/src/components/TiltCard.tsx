import { useRef } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Grados maximos de inclinacion. */
  maxTilt?: number;
}

/**
 * Tarjeta con perspectiva 3D: se inclina hacia el cursor y proyecta un brillo.
 * Respeta `prefers-reduced-motion` (el CSS anula la transformacion).
 */
export function TiltCard({ children, className = '', style, maxTilt = 7 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 2 * maxTilt}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 2 * maxTilt}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      <div className="tilt__glare" aria-hidden="true" />
      {children}
    </div>
  );
}
