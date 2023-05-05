import { IsDefined, IsIn, IsOptional } from "class-validator";

export class FilterRequest {
    @IsOptional()
    @IsIn(["SIMPLE",
        "COLUMN",
        "SUB",
        "BETWEEN",
        "NOT_BETWEEN",
        "IN",
        "NOT_IN",
        "NULL",
        "NOT_NULL",
        "DATE", "DATE_BETWEEN", "TERM"])
    type: string = "SIMPLE";

    @IsDefined()
    attr: string;

    @IsDefined()
    val: string;

    @IsOptional()
    @IsIn(["=",
        "<>",
        ">",
        ">=",
        "<",
        "<=",
        "LIKE",
        "ILIKE"
    ])
    opr: string = "=";

    @IsOptional()
    @IsIn(["AND", "OR"])
    conn: string = "AND";
}


