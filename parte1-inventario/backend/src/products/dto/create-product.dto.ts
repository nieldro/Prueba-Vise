import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateProductDto {
  @ApiProperty({ example: 'Taladro percutor 650W' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'HER-0001', description: 'Único. Letras, números y guiones.' })
  @Transform(upperTrim)
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9-]{1,38}[A-Z0-9]$/, {
    message: 'sku debe tener entre 3 y 40 caracteres: letras, números y guiones',
  })
  sku: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({ example: 189900, description: 'Máximo 2 decimales' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999)
  price: number;

  @ApiPropertyOptional({ example: 'VigiTec' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  brand?: string;

  @ApiPropertyOptional({ example: 'Cámara domo IP para interiores con visión nocturna' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Und', description: 'Unidad de medida' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({
    example: 25,
    description: 'Si se envía, se registra como una entrada inicial en el kardex',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  initialStock?: number;
}
