import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class SummaryQueryDto {
  @ApiPropertyOptional({ enum: [7, 14, 30], default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 14, 30])
  days: number = 7;
}
