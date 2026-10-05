import { IsDefined, IsEnum, IsOptional, ValidateIf } from "class-validator";
import { NodeJSQLFilterConnector, NodeJSQLFilterOperator, NodeJSQLFilterType } from "../enums/enums";
import { NodeJSQLFilterValueSimple } from "../types/types";

export class FilterRequest {
    @IsOptional()
    @IsEnum(NodeJSQLFilterType)
    type?: NodeJSQLFilterType = NodeJSQLFilterType.SIMPLE;

    @IsDefined()
    attr!: string;

    @ValidateIf((val) => ![NodeJSQLFilterType.NULL, NodeJSQLFilterType.NOT_NULL].includes(val.type))
    @IsDefined()
    val?: NodeJSQLFilterValueSimple;

    @ValidateIf((val) => ![NodeJSQLFilterType.SIMPLE, NodeJSQLFilterType.COLUMN, NodeJSQLFilterType.NUMERIC, NodeJSQLFilterType.TERM].includes(val.type))
    @IsDefined()
    @IsEnum(NodeJSQLFilterOperator)
    opr?: NodeJSQLFilterOperator = NodeJSQLFilterOperator.EQUAL;

    @IsOptional()
    @IsEnum(NodeJSQLFilterConnector)
    conn?: NodeJSQLFilterConnector = NodeJSQLFilterConnector.AND;
}


