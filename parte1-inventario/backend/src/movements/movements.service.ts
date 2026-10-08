import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Movement, MovementType, Prisma } from '@prisma/client';
import { Paginated, paginated, skipOf } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { KardexQueryDto } from './dto/kardex-query.dto';

export interface KardexResult {
  product: { id: number; name: string; sku: string; stock: number };
  totals: { entries: number; exits: number };
  movements: Paginated<Movement>;
}

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una entrada o salida de forma atómica.
   *
   * La consistencia ante concurrencia no depende de leer-y-luego-escribir: la salida es un
   * UPDATE condicional (`stock >= cantidad`) que Postgres ejecuta bloqueando la fila. Dos salidas
   * simultaneas se serializan y la segunda ve el stock ya descontado, asi que nunca queda negativo.
   * Además la tabla tiene un CHECK (stock >= 0) como última línea de defensa.
   */
  async register(dto: CreateMovementDto, userId: number): Promise<Movement> {
    const { productId, type, quantity, note } = dto;

    return this.prisma.$transaction(async (tx) => {
      const balanceAfter =
        type === MovementType.ENTRADA
          ? await this.applyEntry(tx, productId, quantity)
          : await this.applyExit(tx, productId, quantity);

      return tx.movement.create({
        data: { productId, type, quantity, balanceAfter, note, userId },
      });
    });
  }

  async kardex(productId: number, query: KardexQueryDto): Promise<KardexResult> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, stock: true },
    });
    if (!product) throw new NotFoundException(`El producto ${productId} no existe`);

    const where: Prisma.MovementWhereInput = { productId };
    const [total, data, grouped] = await Promise.all([
      this.prisma.movement.count({ where }),
      this.prisma.movement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: skipOf(query.page, query.limit),
        take: query.limit,
      }),
      this.prisma.movement.groupBy({ by: ['type'], where, _sum: { quantity: true } }),
    ]);

    const sumOf = (type: MovementType) =>
      grouped.find((g) => g.type === type)?._sum.quantity ?? 0;

    return {
      product,
      totals: { entries: sumOf(MovementType.ENTRADA), exits: sumOf(MovementType.SALIDA) },
      movements: paginated(data, total, query.page, query.limit),
    };
  }

  private async applyEntry(
    tx: Prisma.TransactionClient,
    productId: number,
    quantity: number,
  ): Promise<number> {
    // P2025 (producto inexistente) lo traduce el PrismaExceptionFilter a 404.
    const { stock } = await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
      select: { stock: true },
    });
    return stock;
  }

  private async applyExit(
    tx: Prisma.TransactionClient,
    productId: number,
    quantity: number,
  ): Promise<number> {
    const { count } = await tx.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });

    if (count === 0) {
      const current = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });
      if (!current) throw new NotFoundException(`El producto ${productId} no existe`);
      throw new UnprocessableEntityException(
        `Stock insuficiente: hay ${current.stock} y se piden ${quantity}`,
      );
    }

    // La fila sigue bloqueada por esta transacción, asi que la lectura es consistente.
    const { stock } = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { stock: true },
    });
    return stock;
  }
}
