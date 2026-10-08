import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Indicadores y serie diaria de entradas y salidas' })
  summary(@Query() query: SummaryQueryDto) {
    return this.dashboard.summary(query.days);
  }
}
