const { NativeList } = require("./classes/native-list");

exports.getList = function (con, baseParams) {
  return new NativeList(con, baseParams);
};
