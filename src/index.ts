import { NativeList } from "./classes/native-list";
import { ListParams } from "./dto/params/list.params";

export function getList(con: any, baseParams: ListParams) {
  return new NativeList(con, baseParams);
};
