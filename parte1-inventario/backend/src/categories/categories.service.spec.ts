import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const prisma = {
    category: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    product: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CategoriesService);
  });

  it('lista las categorías con su número de productos', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: 1, name: 'Videovigilancia', createdAt: new Date(), _count: { products: 3 } },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([expect.objectContaining({ id: 1, productCount: 3 })]);
    expect(result[0]).not.toHaveProperty('_count');
  });

  it('renombra una categoría', async () => {
    prisma.category.update.mockResolvedValue({ id: 1, name: 'Cámaras' });

    await service.update(1, { name: 'Cámaras' });

    expect(prisma.category.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Cámaras' } });
  });

  it('elimina una categoría sin productos', async () => {
    prisma.product.count.mockResolvedValue(0);

    await service.remove(4);

    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it('no elimina una categoría con productos y responde 409', async () => {
    prisma.product.count.mockResolvedValue(2);

    await expect(service.remove(4)).rejects.toThrow(ConflictException);
    await expect(service.remove(4)).rejects.toThrow('2 productos');
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });
});
