import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MovementReason, MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MovementsService } from './movements.service';

/**
 * Pruebas de concurrencia contra una base PostgreSQL REAL (los mocks no pueden demostrar que dos
 * transacciones simultáneas se serializan). Se ejecutan solo si existe TEST_DATABASE_URL, con las
 * migraciones ya aplicadas; si no, se omiten y `npm test` sigue sin necesitar base de datos:
 *
 *   TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/inventario npm test
 *
 * Cada prueba crea sus propios datos con un SKU único y los elimina al terminar.
 */
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDb = databaseUrl ? describe : describe.skip;

describeWithDb('MovementsService - concurrencia sobre PostgreSQL real', () => {
  let prisma: PrismaService;
  let service: MovementsService;
  let categoryId: number;
  let userId: number;
  const createdProducts: number[] = [];

  beforeAll(async () => {
    // Más conexiones que operaciones simultáneas: así la contención ocurre en la fila, no en el pool.
    const url = new URL(databaseUrl as string);
    url.searchParams.set('connection_limit', '30');
    process.env.DATABASE_URL = url.toString();

    prisma = new PrismaService();
    await prisma.$connect();
    service = new MovementsService(prisma, { get: () => 'America/Bogota' } as unknown as ConfigService);

    const category = await prisma.category.create({ data: { name: `Prueba concurrencia ${Date.now()}` } });
    categoryId = category.id;
    const user = await prisma.user.create({
      data: { email: `concurrencia-${Date.now()}@prueba.local`, name: 'Prueba', passwordHash: 'x' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.movement.deleteMany({ where: { productId: { in: createdProducts } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProducts } } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  async function newProduct(stock: number): Promise<number> {
    const product = await prisma.product.create({
      data: {
        name: 'Producto de concurrencia',
        sku: `CONC-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        categoryId,
        price: 1000,
        stock,
      },
    });
    createdProducts.push(product.id);
    return product.id;
  }

  const exit = (productId: number, quantity: number) =>
    service.register(
      { productId, type: MovementType.SALIDA, reason: MovementReason.VENTA, quantity },
      userId,
    );
  const entry = (productId: number, quantity: number) =>
    service.register(
      { productId, type: MovementType.ENTRADA, reason: MovementReason.COMPRA, quantity },
      userId,
    );

  it('12 salidas simultáneas de 3 unidades sobre stock 20: pasan 6, se rechazan 6 y el stock queda en 2', async () => {
    const productId = await newProduct(20);

    const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () => exit(productId, 3)));

    const accepted = outcomes.filter((o) => o.status === 'fulfilled');
    const rejected = outcomes.filter((o): o is PromiseRejectedResult => o.status === 'rejected');
    expect(accepted).toHaveLength(6);
    expect(rejected).toHaveLength(6);
    expect(rejected.every((o) => o.reason instanceof UnprocessableEntityException)).toBe(true);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(2);
    expect(await prisma.movement.count({ where: { productId } })).toBe(6); // las rechazadas no dejan rastro
  });

  it('nunca se vende más de lo que hay: 30 salidas de 1 sobre stock 10 dejan exactamente 10 vendidas', async () => {
    const productId = await newProduct(10);

    const outcomes = await Promise.allSettled(Array.from({ length: 30 }, () => exit(productId, 1)));

    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(10);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(0);
  });

  it('entradas y salidas mezcladas en paralelo: el stock final cuadra y el kardex es coherente', async () => {
    const productId = await newProduct(5);
    const operations = Array.from({ length: 40 }, (_, i) =>
      i % 3 === 0 ? entry(productId, 4) : exit(productId, 3),
    );

    const outcomes = await Promise.allSettled(operations);
    const accepted = outcomes.filter((o) => o.status === 'fulfilled');
    expect(accepted.length).toBeGreaterThan(0);

    const movements = await prisma.movement.findMany({ where: { productId }, orderBy: { id: 'asc' } });
    expect(movements).toHaveLength(accepted.length);

    // Reproducir el kardex en orden: cada saldo guardado debe ser el acumulado real y nunca negativo.
    let running = 5;
    for (const movement of movements) {
      running += movement.type === MovementType.ENTRADA ? movement.quantity : -movement.quantity;
      expect(movement.balanceAfter).toBe(running);
      expect(running).toBeGreaterThanOrEqual(0);
    }
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(running);
  });

  it('la base de datos rechaza por sí sola un stock negativo (restricción CHECK)', async () => {
    const productId = await newProduct(1);

    await expect(prisma.product.update({ where: { id: productId }, data: { stock: -1 } })).rejects.toThrow();
  });
});
