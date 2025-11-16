import { Row } from "../../interfaces/interfaces";

export class ListResponse {
    page: number = 0;
    limit: number = 0;
    total_pages: number = 0;
    total_items: number = 0;
    items: Row[] = [];
}