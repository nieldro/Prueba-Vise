import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MovementsService } from './movements.service';

/** Cliente transaccional falso: cada método es un mock que cada prueba configura. */
function createTx() {
  return {
    product: {
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    movement: { create: jest.fn() },
  };
}

describe('MovementsService', () => {
  let service: MovementsService;
  let tx: ReturnType<typeof createTx>;
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    product: { findUnique: jest.Mock };
    movement: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
  };

  beforeEach(async () => {
    tx = createTx();
    prisma = {
      // Acepta tanto la forma con callback (transaccion interactiva) como la lista de promesas.
      $transaction: jest.fn((arg: ((t: typeof tx) => unknown) | Promise<unknown>[]) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(tx),
      ),
      $queryRaw: jest.fn(),
      product: { findUnique: jest.fn() },
      movement: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'America/Bogota' } },
      ],
    }).compile();
    service = moduleRef.get(MovementsService);
  });

  describe('register - entrada', () => {
    it('incrementa el stock y guarda el saldo resultante', async () => {
      tx.product.update.mockResolvedValue({ stock: 35 });
      tx.movement.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const result = await service.register(
        { productId: 7, type: MovementType.ENTRADA, quantity: 15, note: 'Compra' },
        99,
      );

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { stock: { increment: 15 } },
        select: { stock: true },
      });
      expect(tx.movement.create).toHaveBeenCalledWith({
        data: {
          productId: 7,
          type: MovementType.ENTRADA,
          quantity: 15,
          balanceAfter: 35,
          note: 'Compra',
          userId: 99,
        },
      });
      expect(result).toMatchObject({ balanceAfter: 35 });
    });

    it('propaga el error si el producto no existe y no registra el movimiento', async () => {
      tx.product.update.mockRejectedValue(new Error('P2025'));

      await expect(
        service.register({ productId: 404, type: MovementType.ENTRADA, quantity: 1 }, 1),
      ).rejects.toThrow('P2025');
      expect(tx.movement.create).not.toHaveBeenCalled();
    });
  });

  describe('register - salida', () => {
    it('descuenta con un UPDATE condicional por stock suficiente', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.product.findUniqueOrThrow.mockResolvedValue({ stock: 4 });
      tx.movement.create.mockImplementation(({ data }) => Promise.resolve({ id: 2, ...data }));

      const result = await service.register(
        { productId: 7, type: MovementType.SALIDA, quantity: 6 },
        1,
      );

      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 7, stock: { gte: 6 } },
        data: { stock: { decrement: 6 } },
      });
      expect(result).toMatchObject({ type: MovementType.SALIDA, balanceAfter: 4 });
    });

    it('permite dejar el stock exactamente en cero', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.product.findUniqueOrThrow.mockResolvedValue({ stock: 0 });
      tx.movement.create.mockImplementation(({ data }) => Promise.resolve(data));

      await expect(
        service.register({ productId: 7, type: MovementType.SALIDA, quantity: 10 }, 1),
      ).resolves.toMatchObject({ balanceAfter: 0 });
    });

    it('rechaza con 422 una salida que dejaría el stock negativo', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue({ stock: 3 });

      await expect(
        service.register({ productId: 7, type: MovementType.SALIDA, quantity: 5 }, 1),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(tx.movement.create).not.toHaveBeenCalled();
    });

    it('informa el stock disponible en el mensaje de error', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue({ stock: 3 });

      await expect(
        service.register({ productId: 7, type: MovementType.SALIDA, quantity: 5 }, 1),
      ).rejects.toThrow('hay 3 y se piden 5');
    });

    it('responde 404 si el producto no existe', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 0 });
      tx.product.findUnique.mockResolvedValue(null);

      await expect(
        service.register({ productId: 404, type: MovementType.SALIDA, quantity: 1 }, 1),
      ).rejects.toThrow(NotFoundException);
      expect(tx.movement.create).not.toHaveBeenCalled();
    });

    it('ejecuta todo dentro de una única transacción', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      tx.product.findUniqueOrThrow.mockResolvedValue({ stock: 1 });
      tx.movement.create.mockResolvedValue({});

      await service.register({ productId: 7, type: MovementType.SALIDA, quantity: 1 }, 1);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      prisma.movement.count.mockResolvedValue(3);
      prisma.movement.findMany.mockResolvedValue([{ id: 3 }, { id: 2 }, { id: 1 }]);
    });

    it('pagina el historial sin filtros, del más reciente al más antiguo', async () => {
      const result = await service.list({ page: 2, limit: 2 });

      expect(prisma.movement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 2,
          take: 2,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(result.meta).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 });
    });

    it('aplica los filtros de tipo y producto', async () => {
      await service.list({ page: 1, limit: 10, type: MovementType.SALIDA, productId: 7 });

      expect(prisma.movement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: MovementType.SALIDA, productId: 7 } }),
      );
    });

    it('convierte el día elegido en un rango de fechas en UTC', async () => {
      const start = new Date('2026-10-08T05:00:00Z');
      const end = new Date('2026-10-09T05:00:00Z');
      prisma.$queryRaw.mockResolvedValue([{ s: start, e: end }]);

      await service.list({ page: 1, limit: 10, date: '2026-10-08' });

      expect(prisma.movement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdAt: { gte: start, lt: end } } }),
      );
    });

    it('rechaza con 400 una fecha inexistente', async () => {
      await expect(service.list({ page: 1, limit: 10, date: '2026-02-31' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.movement.findMany).not.toHaveBeenCalled();
    });
  });

  describe('kardex', () => {
    it('devuelve producto, totales y movimientos paginados', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 7, name: 'Taladro', sku: 'HER-1', stock: 8 });
      prisma.movement.count.mockResolvedValue(45);
      prisma.movement.findMany.mockResolvedValue([{ id: 3 }, { id: 2 }]);
      prisma.movement.groupBy.mockResolvedValue([
        { type: MovementType.ENTRADA, _sum: { quantity: 50 } },
        { type: MovementType.SALIDA, _sum: { quantity: 42 } },
      ]);

      const result = await service.kardex(7, { page: 2, limit: 20 });

      expect(prisma.movement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20, where: { productId: 7 } }),
      );
      expect(result.totals).toEqual({ entries: 50, exits: 42 });
      expect(result.movements.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
    });

    it('usa cero cuando no hay movimientos de un tipo', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 7, name: 'X', sku: 'X-1', stock: 0 });
      prisma.movement.count.mockResolvedValue(0);
      prisma.movement.findMany.mockResolvedValue([]);
      prisma.movement.groupBy.mockResolvedValue([]);

      const result = await service.kardex(7, { page: 1, limit: 20 });

      expect(result.totals).toEqual({ entries: 0, exits: 0 });
      expect(result.movements.meta.totalPages).toBe(1);
    });

    it('responde 404 si el producto no existe', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.kardex(404, { page: 1, limit: 20 })).rejects.toThrow(NotFoundException);
    });
  });
});
