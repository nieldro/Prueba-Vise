import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class CalendarQueryDto {
  @ApiPropertyOptional({ example: '2026-10', description: 'Mes en formato AAAA-MM (por defecto, el actual)' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month debe tener el formato AAAA-MM' })
  month?: string;
}
