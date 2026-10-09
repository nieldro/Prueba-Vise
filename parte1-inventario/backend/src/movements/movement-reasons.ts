import { MovementReason, MovementType } from '@prisma/client';

/**
 * Motivos válidos para cada tipo de movimiento. STOCK_INICIAL lo genera el sistema al crear un
 * producto con existencias; no se elige a mano.
 */
export const MOVEMENT_REASONS: Record<MovementType, readonly MovementReason[]> = {
  [MovementType.ENTRADA]: [
    MovementReason.COMPRA,
    MovementReason.DEVOLUCION_CLIENTE,
    MovementReason.AJUSTE_ENTRADA,
  ],
  [MovementType.SALIDA]: [
    MovementReason.VENTA,
    MovementReason.DANADO,
    MovementReason.PERDIDA,
    MovementReason.DOTACION,
    MovementReason.DEVOLUCION_PROVEEDOR,
    MovementReason.AJUSTE_SALIDA,
  ],
};

export function isReasonValidFor(type: MovementType, reason: MovementReason): boolean {
  return MOVEMENT_REASONS[type].includes(reason);
}
