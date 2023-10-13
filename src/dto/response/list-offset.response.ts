import { Row } from "../../interfaces/interfaces";

export class ListOffsetResponse {
    offset: number;
    limit: number;
    total_items: number;
    filtered_items: number;
    items: Row[];
}