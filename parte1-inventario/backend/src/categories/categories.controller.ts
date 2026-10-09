import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
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

  @Patch(':id')
  @ApiOperation({ summary: 'Renombra una categoría' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una categoría sin productos' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
