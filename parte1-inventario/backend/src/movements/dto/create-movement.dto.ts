import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementReason, MovementType } from '@prisma/client';
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

  @ApiProperty({
    enum: MovementReason,
    example: MovementReason.COMPRA,
    description:
      'Entradas: COMPRA, DEVOLUCION_CLIENTE, AJUSTE_ENTRADA. Salidas: VENTA, DANADO, PERDIDA, DOTACION, DEVOLUCION_PROVEEDOR, AJUSTE_SALIDA.',
  })
  @IsEnum(MovementReason)
  reason: MovementReason;

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
