import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovementReason, MovementType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional({ enum: MovementReason })
  @IsOptional()
  @IsEnum(MovementReason)
  reason?: MovementReason;

  @ApiPropertyOptional({ description: 'Filtra por producto' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({ example: '2026-10-08', description: 'Día (AAAA-MM-DD) en la zona horaria configurada' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date debe tener el formato AAAA-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ description: 'Busca por nombre o SKU del producto' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  search?: string;
}
