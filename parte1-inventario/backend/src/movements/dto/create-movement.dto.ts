import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateMovementDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ enum: MovementType, example: MovementType.ENTRADA })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity: number;

  @ApiPropertyOptional({ example: 'Compra a proveedor' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(255)
  note?: string;
}
