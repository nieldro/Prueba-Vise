import { MovementReason, MovementType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../auth/auth.constants';
import { CATEGORIES, LOW_STOCK_SKUS, PRODUCTS } from './catalog';

/**
 * Datos semilla idempotentes: se puede ejecutar varias veces sin duplicar ni pisar nada.
 * Crea el usuario de prueba, categorías, productos de seguridad y un historial de 30 días de
 * movimientos coherente (los saldos del kardex cuadran y el stock nunca es negativo).
 */
const prisma = new PrismaClient();

/** Generador pseudoaleatorio con semilla fija: el historial es el mismo en cada ejecución. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reparte las salidas de ejemplo entre sus motivos: más ventas y dotaciones que daños o pérdidas. */
function exitReason(roll: number): [MovementReason, string] {
  if (roll < 0.55) return [MovementReason.VENTA, 'Venta a cliente'];
  if (roll < 0.8) return [MovementReason.DOTACION, 'Dotación a puesto de vigilancia'];
  if (roll < 0.9) return [MovementReason.DANADO, 'Producto dañado en bodega'];
  if (roll < 0.95) return [MovementReason.PERDIDA, 'Faltante detectado en inventario'];
  return [MovementReason.DEVOLUCION_PROVEEDOR, 'Devolución por defecto de fábrica'];
}

async function seedUser(): Promise<number> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@vise.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Administrador VISE',
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    },
  });
  return user.id;
}

async function seedCatalog(): Promise<void> {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  const categories = await prisma.category.findMany();
  const idByName = new Map(categories.map((c) => [c.name, c.id]));

  for (const p of PRODUCTS) {
    const details = {
      brand: p.brand,
      description: p.description,
      unit: p.unit,
      images: [1, 2, 3].map((view) => `/products/${p.art}-${view}.svg`),
      specs: p.specs,
    };
    // Si el producto ya existe no se pisan ediciones del usuario; solo se completan
    // las fichas que aun no tienen imagenes (por ejemplo, tras una migracion).
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        price: p.price,
        categoryId: idByName.get(p.category)!,
        ...details,
      },
    });
    await prisma.product.updateMany({
      where: { sku: p.sku, images: { isEmpty: true } },
      data: details,
    });
  }
}

async function seedHistory(userId: number): Promise<void> {
  const rand = mulberry32(20261008);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const volumeBySku = new Map(PRODUCTS.map((p) => [p.sku, p.volume]));
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });

  for (const product of products) {
    if ((await prisma.movement.count({ where: { productId: product.id } })) > 0) continue;

    const volume = volumeBySku.get(product.sku) ?? 0.5;
    let stock = 0;
    const rows: Array<{
      productId: number;
      type: MovementType;
      reason: MovementReason;
      quantity: number;
      balanceAfter: number;
      note: string;
      userId: number;
      createdAt: Date;
    }> = [];

    const push = (
      type: MovementType,
      reason: MovementReason,
      quantity: number,
      daysAgo: number,
      note: string,
    ) => {
      stock += type === MovementType.ENTRADA ? quantity : -quantity;
      // Horario laboral (13:00-21:00 UTC = 08:00-16:00 en Bogotá), sin pasar del momento actual.
      const at = new Date(now - daysAgo * DAY);
      at.setUTCHours(13 + Math.floor(rand() * 8), Math.floor(rand() * 60), 0, 0);
      rows.push({
        productId: product.id,
        type,
        reason,
        quantity,
        balanceAfter: stock,
        note,
        userId,
        createdAt: at.getTime() > now ? new Date(now - 60_000) : at,
      });
    };

    // Algunos productos arrancan con poco stock y sin reposición: así el tablero tiene alertas reales.
    const runsLow = LOW_STOCK_SKUS.includes(product.sku);

    push(
      MovementType.ENTRADA,
      MovementReason.STOCK_INICIAL,
      runsLow ? 12 + Math.floor(rand() * 6) : Math.max(6, Math.round((40 + rand() * 80) * volume)),
      30,
      'Stock inicial',
    );
    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const roll = rand();
      if (!runsLow && roll < 0.22) {
        const qty = Math.max(2, Math.round((10 + rand() * 40) * volume));
        const returned = rand() < 0.1;
        push(
          MovementType.ENTRADA,
          returned ? MovementReason.DEVOLUCION_CLIENTE : MovementReason.COMPRA,
          qty,
          daysAgo,
          returned ? 'Devolución de cliente' : 'Compra a proveedor',
        );
      } else if (roll >= 0.22 && roll < 0.7 && stock > (runsLow ? 4 : 0)) {
        const maxQty = runsLow
          ? Math.min(3, stock - 4)
          : Math.max(1, Math.min(stock, Math.round(14 * volume)));
        const [reason, note] = exitReason(rand());
        push(MovementType.SALIDA, reason, 1 + Math.floor(rand() * maxQty), daysAgo, note);
      }
    }

    await prisma.$transaction([
      prisma.movement.createMany({ data: rows }),
      prisma.product.update({ where: { id: product.id }, data: { stock } }),
    ]);
  }
}

async function main(): Promise<void> {
  const userId = await seedUser();
  await seedCatalog();
  await seedHistory(userId);
  console.log('Datos semilla aplicados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
