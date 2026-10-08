import { MovementType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../auth/auth.constants';

/**
 * Datos semilla idempotentes: se puede ejecutar varias veces sin duplicar nada.
 * Crea el usuario de prueba, categorías, productos y un historial de 30 días de movimientos
 * coherente (los saldos del kardex cuadran y el stock nunca es negativo).
 */
const prisma = new PrismaClient();

const CATEGORIES = ['Herramientas', 'Eléctricos', 'Plomería', 'Pinturas', 'Seguridad industrial'];

const PRODUCTS: Array<{ sku: string; name: string; category: string; price: number }> = [
  { sku: 'HER-0001', name: 'Taladro percutor 650W', category: 'Herramientas', price: 189900 },
  { sku: 'HER-0002', name: 'Juego de destornilladores x12', category: 'Herramientas', price: 45900 },
  { sku: 'HER-0003', name: 'Martillo de carpintero 16oz', category: 'Herramientas', price: 28500 },
  { sku: 'ELE-0001', name: 'Cable THHN calibre 12 (rollo 100m)', category: 'Eléctricos', price: 249000 },
  { sku: 'ELE-0002', name: 'Breaker monopolar 20A', category: 'Eléctricos', price: 14900 },
  { sku: 'ELE-0003', name: 'Tomacorriente doble con polo a tierra', category: 'Eléctricos', price: 8900 },
  { sku: 'PLO-0001', name: 'Tubo PVC presión 1/2 pulgada x 6m', category: 'Plomería', price: 19800 },
  { sku: 'PLO-0002', name: 'Llave de paso 1/2 pulgada', category: 'Plomería', price: 17500 },
  { sku: 'PIN-0001', name: 'Vinilo blanco tipo 1 (galon)', category: 'Pinturas', price: 62000 },
  { sku: 'PIN-0002', name: 'Rodillo de felpa 9 pulgadas', category: 'Pinturas', price: 12900 },
  { sku: 'SEG-0001', name: 'Casco de seguridad con barbuquejo', category: 'Seguridad industrial', price: 21900 },
  { sku: 'SEG-0002', name: 'Guantes de nitrilo (par)', category: 'Seguridad industrial', price: 6500 },
];

const LOW_STOCK_SKUS = ['HER-0003', 'PLO-0002', 'SEG-0002'];

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
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { sku: p.sku, name: p.name, price: p.price, categoryId: idByName.get(p.category)! },
    });
  }
}

async function seedHistory(userId: number): Promise<void> {
  const rand = mulberry32(20261008);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });

  for (const product of products) {
    if ((await prisma.movement.count({ where: { productId: product.id } })) > 0) continue;

    let stock = 0;
    const rows: Array<{
      productId: number;
      type: MovementType;
      quantity: number;
      balanceAfter: number;
      note: string;
      userId: number;
      createdAt: Date;
    }> = [];

    const push = (type: MovementType, quantity: number, daysAgo: number, note: string) => {
      stock += type === MovementType.ENTRADA ? quantity : -quantity;
      // Horario laboral (13:00-21:00 UTC = 08:00-16:00 en Bogota), sin pasar del momento actual.
      const at = new Date(now - daysAgo * DAY);
      at.setUTCHours(13 + Math.floor(rand() * 8), Math.floor(rand() * 60), 0, 0);
      rows.push({
        productId: product.id,
        type,
        quantity,
        balanceAfter: stock,
        note,
        userId,
        createdAt: at.getTime() > now ? new Date(now - 60_000) : at,
      });
    };

    // Algunos productos arrancan con poco stock y sin reposicion: asi el tablero tiene alertas reales.
    const runsLow = LOW_STOCK_SKUS.includes(product.sku);

    push(
      MovementType.ENTRADA,
      runsLow ? 14 + Math.floor(rand() * 8) : 40 + Math.floor(rand() * 80),
      30,
      'Stock inicial',
    );
    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const roll = rand();
      if (!runsLow && roll < 0.22) {
        push(MovementType.ENTRADA, 10 + Math.floor(rand() * 40), daysAgo, 'Compra a proveedor');
      } else if (roll >= 0.22 && roll < 0.7 && stock > (runsLow ? 4 : 0)) {
        const maxQty = runsLow ? Math.min(3, stock - 4) : Math.min(stock, 14);
        push(MovementType.SALIDA, 1 + Math.floor(rand() * maxQty), daysAgo, 'Despacho a cliente');
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
