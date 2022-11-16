export interface Columns {
    [column: string]: string
}

export class ListParams {
    columns: Columns;
    table: string;
    where: string;
    group: string;
}