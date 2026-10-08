import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class KardexQueryDto extends PaginationQueryDto {
  override limit: number = 20;
}
