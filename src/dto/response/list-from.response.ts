import { Row } from '../../interfaces/interfaces';

export class ListFromResponse {
  items: Row[] = [];
  prev: string | null = null;
  next: string | null = null;
  count: number | null = null;
}
