import { Row } from "../../interfaces/interfaces";

export class ListOffsetResponse {
    offset: number = 0;
    limit: number = 0;
    total_items: number = 0;
    filtered_items: number = 0;
    items: Row[] = [];
}