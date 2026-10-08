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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto, LowStockQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista productos con paginación y filtro por categoría' })
  findAll(@Query() query: ListProductsQueryDto) {
    return this.products.findAll(query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock menor o igual al umbral' })
  findLowStock(@Query() query: LowStockQueryDto) {
    return this.products.findLowStock(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un producto' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un producto (con stock inicial opcional)' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza datos del producto (no el stock)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un producto sin movimientos' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.products.remove(id);
  }
}
