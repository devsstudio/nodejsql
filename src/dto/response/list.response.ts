import { Row } from "../../interfaces/interfaces";

export class ListResponse {
    page: number;
    limit: number;
    total_pages: number;
    total_items: any;
    items: Row[];
}