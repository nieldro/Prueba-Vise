import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MovementType, Prisma } from '@prisma/client';
import { Paginated, paginated, skipOf } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto, LowStockQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = { category: { select: { id: true, name: true } } } satisfies Prisma.ProductInclude;
export type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class ProductsService {
  private readonly defaultThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.defaultThreshold = config.get<number>('LOW_STOCK_THRESHOLD', 10);
  }

  async findAll(query: ListProductsQueryDto): Promise<Paginated<ProductWithCategory>> {
    const { page, limit, categoryId, search } = query;
    const where: Prisma.ProductWhereInput = {
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    return this.page(where, [{ name: 'asc' }], page, limit);
  }

  async findLowStock(query: LowStockQueryDto): Promise<Paginated<ProductWithCategory>> {
    const threshold = query.threshold ?? this.defaultThreshold;
    return this.page({ stock: { lte: threshold } }, [{ stock: 'asc' }, { name: 'asc' }], query.page, query.limit);
  }

  async findOne(id: number): Promise<ProductWithCategory> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException(`El producto ${id} no existe`);
    return product;
  }

  /** Crea el producto y, si hay stock inicial, su entrada en el kardex dentro de la misma transacción. */
  async create(dto: CreateProductDto, userId: number): Promise<ProductWithCategory> {
    const { initialStock = 0, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { ...data, stock: initialStock },
        include: productInclude,
      });
      if (initialStock > 0) {
        await tx.movement.create({
          data: {
            productId: product.id,
            type: MovementType.ENTRADA,
            quantity: initialStock,
            balanceAfter: initialStock,
            note: 'Stock inicial',
            userId,
          },
        });
      }
      return product;
    });
  }

  update(id: number, dto: UpdateProductDto): Promise<ProductWithCategory> {
    return this.prisma.product.update({ where: { id }, data: dto, include: productInclude });
  }

  /** Falla con 409 si el producto tiene movimientos: el kardex es un registro historico. */
  async remove(id: number): Promise<void> {
    const movements = await this.prisma.movement.count({ where: { productId: id } });
    if (movements > 0) {
      throw new ConflictException(
        'El producto tiene movimientos en el kardex y no se puede eliminar',
      );
    }
    await this.prisma.product.delete({ where: { id } });
  }

  private async page(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
    page: number,
    limit: number,
  ): Promise<Paginated<ProductWithCategory>> {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: skipOf(page, limit),
        take: limit,
        include: productInclude,
      }),
    ]);
    return paginated(data, total, page, limit);
  }
}
