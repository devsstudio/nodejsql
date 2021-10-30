//https://www.npmjs.com/package/mysql

const NodeJSQList = require("./classes/NodeJSQList");
const { Sequelize } = require("sequelize");


exports.getList = function (connectionParams, baseParams) {
  return new NodeJSQList(connectionParams, baseParams);
};

exports.printMsg = function () {
  return "This is a message from the demo package";
};
