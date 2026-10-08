-- Ficha de producto: marca, descripcion, unidad, imagenes y especificaciones.
ALTER TABLE "products"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'Und',
  ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "specs" JSONB;
