export interface Row {
    [column: string]: any
}

export class ListResponse {
    page: number;
    limit: number;
    total_pages: number;
    total_items: any;
    items: Row[];
}