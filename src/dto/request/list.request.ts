import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { FilterRequest } from "./filter.request";
import { PaginationRequest } from "./pagination.request";

export class ListRequest {

    @IsArray()
    @Type(() => FilterRequest)
    @ValidateNested()
    @IsOptional()
    filters: FilterRequest[] = [];

    @Type(() => PaginationRequest)
    @ValidateNested()
    @IsOptional()
    pagination: PaginationRequest = new PaginationRequest();
}
