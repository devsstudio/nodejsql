import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { Order } from '../../interfaces/interfaces';

export class PaginationFromRequest {

  @IsOptional()
  @IsBoolean()
  @Transform((val) => val.value ? true : false)
  count: boolean = false;

  @IsOptional()
  @IsString()
  @Transform((val) => (typeof val.value === 'string' ? val.value : String(val.value)))
  from?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(50)
  @Transform((val) => val.value * 1)
  limit: number = 10;

  @IsOptional()
  order: Order = {};
}
