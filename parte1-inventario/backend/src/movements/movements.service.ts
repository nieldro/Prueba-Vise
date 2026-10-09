import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Movement, MovementType, Prisma } from '@prisma/client';
import { Paginated, paginated, skipOf } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { KardexQueryDto } from './dto/kardex-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { isReasonValidFor } from './movement-reasons';

export interface KardexResult {
  product: { id: number; name: string; sku: string; stock: number };
  totals: { entries: number; exits: number };
  movements: Paginated<Movement>;
}

const movementInclude = {
  product: { select: { id: true, name: true, sku: true } },
  user: { select: { name: true } },
} satisfies Prisma.MovementInclude;
export type MovementRow = Prisma.MovementGetPayload<{ include: typeof movementInclude }>;

@Injectable()
export class MovementsService {
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.timezone = config.get<string>('TZ_NAME', 'America/Bogota');
  }

  /** Historial general de movimientos con filtros por tipo, producto, día y texto. */
  async list(query: ListMovementsQueryDto): Promise<Paginated<MovementRow>> {
    const { page, limit, type, reason, productId, date, search } = query;
    const where: Prisma.MovementWhereInput = {
      ...(type && { type }),
      ...(reason && { reason }),
      ...(productId && { productId }),
      ...(search && {
        product: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
      ...(date && { createdAt: await this.dayRange(date) }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.movement.count({ where }),
      this.prisma.movement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: skipOf(page, limit),
        take: limit,
        include: movementInclude,
      }),
    ]);
    return paginated(data, total, page, limit);
  }

  /** Límites (en UTC) del día local indicado; rechaza fechas inexistentes como 2026-02-31. */
  private async dayRange(date: string): Promise<{ gte: Date; lt: Date }> {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('date no es una fecha válida');
    }
    const [bounds] = await this.prisma.$queryRaw<Array<{ s: Date; e: Date }>>`
      SELECT ((${date}::date)::timestamp AT TIME ZONE ${this.timezone}) AT TIME ZONE 'UTC' AS s,
             ((${date}::date + 1)::timestamp AT TIME ZONE ${this.timezone}) AT TIME ZONE 'UTC' AS e`;
    return { gte: bounds.s, lt: bounds.e };
  }

  /**
   * Registra una entrada o salida de forma atómica.
   *
   * La consistencia ante concurrencia no depende de leer-y-luego-escribir: la salida es un
   * UPDATE condicional (`stock >= cantidad`) que Postgres ejecuta bloqueando la fila. Dos salidas
   * simultaneas se serializan y la segunda ve el stock ya descontado, asi que nunca queda negativo.
   * Además la tabla tiene un CHECK (stock >= 0) como última línea de defensa.
   */
  async register(dto: CreateMovementDto, userId: number): Promise<Movement> {
    const { productId, type, reason, quantity, note } = dto;

    if (!isReasonValidFor(type, reason)) {
      throw new BadRequestException(
        `El motivo ${reason} no corresponde a una ${type === MovementType.ENTRADA ? 'entrada' : 'salida'}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const balanceAfter =
        type === MovementType.ENTRADA
          ? await this.applyEntry(tx, productId, quantity)
          : await this.applyExit(tx, productId, quantity);

      return tx.movement.create({
        data: { productId, type, reason, quantity, balanceAfter, note, userId },
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
