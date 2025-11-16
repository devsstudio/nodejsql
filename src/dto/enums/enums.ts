export enum NodeJSQLFilterType {
    SIMPLE = "SIMPLE",
    COLUMN = "COLUMN",
    BETWEEN = "BETWEEN",
    NOT_BETWEEN = "NOT_BETWEEN",
    IN = "IN",
    NOT_IN = "NOT_IN",
    NULL = "NULL",
    NOT_NULL = "NOT_NULL",
    DATE = "DATE",
    NUMERIC = "NUMERIC",
    DATE_BETWEEN = "DATE_BETWEEN",
    TERM = "TERM"
}

export enum NodeJSQLFilterConnector {
    AND = "AND",
    OR = "OR"
}

export enum NodeJSQLFilterOperator {
    EQUAL = "=",
    NOT_EQUAL = "<>",
    MAJOR = ">",
    MAJOR_EQUAL = ">=",
    MINOR = "<",
    MINOR_EQUAL = "<=",
    LIKE = "LIKE",
    ILIKE = "ILIKE",
}