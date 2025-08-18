import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { FilterRequest } from "../request/filter.request";
import { InfiniteScrollRequest } from "../request/infinite-scroll.request";

export class Select2Request {

    @IsArray()
    @Type(() => FilterRequest)
    @ValidateNested()
    @IsOptional()
    filters: FilterRequest[] = [];

    @Type(() => InfiniteScrollRequest)
    @ValidateNested()
    @IsOptional()
    request: InfiniteScrollRequest = new InfiniteScrollRequest();
}
