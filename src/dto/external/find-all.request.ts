import { Type } from "class-transformer";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { FilterRequest } from "../request/filter.request";
import { FindRequest } from "../request/find.request";

export class FindAllRequest {

    @IsArray()
    @Type(() => FilterRequest)
    @ValidateNested()
    @IsOptional()
    filters: FilterRequest[] = [];

    @Type(() => FindRequest)
    @ValidateNested()
    @IsOptional()
    request: FindRequest = new FindRequest();
}
