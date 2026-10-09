import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMovementDto } from './dto/create-movement.dto';
import { KardexQueryDto } from './dto/kardex-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { MovementsService } from './movements.service';

@ApiTags('movements')
@ApiBearerAuth()
@Controller()
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Historial de movimientos con filtros y paginación' })
  list(@Query() query: ListMovementsQueryDto) {
    return this.movements.list(query);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Registra una entrada o salida (rechaza stock negativo)' })
  register(@Body() dto: CreateMovementDto, @CurrentUser() user: AuthUser) {
    return this.movements.register(dto, user.id);
  }

  @Get('products/:productId/kardex')
  @ApiOperation({ summary: 'Historial de movimientos de un producto con saldo acumulado' })
  kardex(@Param('productId', ParseIntPipe) productId: number, @Query() query: KardexQueryDto) {
    return this.movements.kardex(productId, query);
  }
}
