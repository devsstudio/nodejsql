import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { Order } from '../../interfaces/interfaces';

export class FindRequest {

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform((val) => val.value * 1)
  limit: number = 0;

  @IsOptional()
  order: Order = {};
}
