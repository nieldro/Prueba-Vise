import { ConflictException, Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

export type CategoryWithCount = Category & { productCount: number };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryWithCount[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({ data: { name: dto.name } });
  }

  /** Un nombre repetido responde 409 y una categoría inexistente 404 (filtro de Prisma). */
  update(id: number, dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data: { name: dto.name } });
  }

  /** No se elimina una categoría con productos: habría que reasignarlos primero. */
  async remove(id: number): Promise<void> {
    const products = await this.prisma.product.count({ where: { categoryId: id } });
    if (products > 0) {
      throw new ConflictException(
        `La categoría tiene ${products} ${products === 1 ? 'producto' : 'productos'}; muévelos a otra categoría antes de eliminarla`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }
}
