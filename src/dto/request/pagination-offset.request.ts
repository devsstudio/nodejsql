import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Order } from '../../interfaces/interfaces';

export class PaginationOffsetRequest {

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform((val) => val.value * 1)
  offset: number = 0;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(50)
  @Transform((val) => val.value * 1)
  limit: number = 10;

  @IsOptional()
  order: Order = {};
}
