import type { MovementReason, MovementType } from '../api/types';

export interface ReasonOption {
  value: MovementReason;
  label: string;
  /** Texto corto que explica cuándo usar el motivo. */
  hint: string;
}

/** Motivos que se pueden elegir al registrar (STOCK_INICIAL lo genera el sistema). */
export const REASONS: Record<MovementType, ReasonOption[]> = {
  ENTRADA: [
    { value: 'COMPRA', label: 'Compra a proveedor', hint: 'Mercancía nueva que llegó de un proveedor' },
    { value: 'DEVOLUCION_CLIENTE', label: 'Devolución de cliente', hint: 'Un cliente devolvió el producto' },
    { value: 'AJUSTE_ENTRADA', label: 'Ajuste de inventario (sobrante)', hint: 'El conteo físico dio más que el sistema' },
  ],
  SALIDA: [
    { value: 'VENTA', label: 'Venta', hint: 'Se vendió a un cliente' },
    { value: 'DANADO', label: 'Dañado o defectuoso', hint: 'Se dañó y ya no se puede vender ni usar' },
    { value: 'PERDIDA', label: 'Pérdida o robo', hint: 'No aparece o fue sustraído' },
    { value: 'DOTACION', label: 'Dotación a vigilante o puesto', hint: 'Se entregó para uso en un puesto de vigilancia' },
    { value: 'DEVOLUCION_PROVEEDOR', label: 'Devolución a proveedor', hint: 'Se devolvió al proveedor' },
    { value: 'AJUSTE_SALIDA', label: 'Ajuste de inventario (faltante)', hint: 'El conteo físico dio menos que el sistema' },
  ],
};

const LABELS: Record<MovementReason, string> = {
  STOCK_INICIAL: 'Stock inicial',
  COMPRA: 'Compra a proveedor',
  DEVOLUCION_CLIENTE: 'Devolución de cliente',
  AJUSTE_ENTRADA: 'Ajuste (sobrante)',
  VENTA: 'Venta',
  DANADO: 'Dañado o defectuoso',
  PERDIDA: 'Pérdida o robo',
  DOTACION: 'Dotación',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
  AJUSTE_SALIDA: 'Ajuste (faltante)',
};

export function reasonLabel(reason: MovementReason | null | undefined): string {
  return reason ? LABELS[reason] : 'Sin motivo';
}

/** Todas las opciones para el filtro del historial, agrupadas por tipo. */
export const FILTER_REASONS: Array<{ group: string; options: MovementReason[] }> = [
  { group: 'Entradas', options: ['STOCK_INICIAL', 'COMPRA', 'DEVOLUCION_CLIENTE', 'AJUSTE_ENTRADA'] },
  { group: 'Salidas', options: ['VENTA', 'DANADO', 'PERDIDA', 'DOTACION', 'DEVOLUCION_PROVEEDOR', 'AJUSTE_SALIDA'] },
];
