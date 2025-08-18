import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { FilterRequest } from "../request/filter.request";
import { PaginationOffsetRequest } from "../request/pagination-offset.request";

export class OffsetRequest {

    @IsArray()
    @Type(() => FilterRequest)
    @ValidateNested()
    @IsOptional()
    filters: FilterRequest[] = [];

    @Type(() => PaginationOffsetRequest)
    @ValidateNested()
    @IsOptional()
    pagination: PaginationOffsetRequest = new PaginationOffsetRequest();
}
