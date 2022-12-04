import { Columns } from "../../interfaces/interfaces";

export class ListParams {
    columns: Columns;
    table: string;
    where?: string = "";
    group?: string = "";
}