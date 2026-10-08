import { Injectable } from '@nestjs/common';
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
}
