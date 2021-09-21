//https://www.npmjs.com/package/mysql

var NodeJSQList = require("./lib/NodeJSQList");

exports.getList = function (connectionParams, baseParams) {
  return new NodeJSQList(connectionParams, baseParams);
};

exports.printMsg = function () {
  return "This is a message from the demo package";
};
