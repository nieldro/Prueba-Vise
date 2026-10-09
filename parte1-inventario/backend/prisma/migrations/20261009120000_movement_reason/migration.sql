-- Motivo de cada movimiento: venta, dañado, pérdida, dotación, compra, devolución, ajuste...
CREATE TYPE "movement_reason" AS ENUM (
  'STOCK_INICIAL', 'COMPRA', 'DEVOLUCION_CLIENTE', 'AJUSTE_ENTRADA',
  'VENTA', 'DANADO', 'PERDIDA', 'DOTACION', 'DEVOLUCION_PROVEEDOR', 'AJUSTE_SALIDA'
);

ALTER TABLE "movements" ADD COLUMN "reason" "movement_reason";

-- Los movimientos que ya existían se clasifican con lo que dice su nota.
UPDATE "movements" SET "reason" = CASE
  WHEN "type" = 'ENTRADA' AND "note" = 'Stock inicial' THEN 'STOCK_INICIAL'::"movement_reason"
  WHEN "type" = 'ENTRADA' THEN 'COMPRA'::"movement_reason"
  WHEN "note" ILIKE 'Dotaci%' THEN 'DOTACION'::"movement_reason"
  ELSE 'VENTA'::"movement_reason"
END;

-- El motivo debe corresponder al tipo: una entrada no puede ser "venta" ni una salida "compra".
ALTER TABLE "movements" ADD CONSTRAINT "movements_reason_matches_type" CHECK (
  "reason" IS NULL
  OR ("type" = 'ENTRADA' AND "reason" IN ('STOCK_INICIAL', 'COMPRA', 'DEVOLUCION_CLIENTE', 'AJUSTE_ENTRADA'))
  OR ("type" = 'SALIDA' AND "reason" IN ('VENTA', 'DANADO', 'PERDIDA', 'DOTACION', 'DEVOLUCION_PROVEEDOR', 'AJUSTE_SALIDA'))
);

CREATE INDEX "movements_reason_idx" ON "movements"("reason");
