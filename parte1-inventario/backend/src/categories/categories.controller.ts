import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las categorías con su número de productos' })
  findAll() {
    return this.categories.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crea una categoría' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }
}
