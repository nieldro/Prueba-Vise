import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** El stock no se edita aqui: solo cambia mediante movimientos. */
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['initialStock'])) {}
