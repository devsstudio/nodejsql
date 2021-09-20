const mysql = require("mysql");

module.exports = class NodeJSQList {
  static FILTER_TYPE_SIMPLE = "SIMPLE";
  static FILTER_TYPE_COLUMN = "COLUMN";
  static FILTER_TYPE_SUB = "SUB";
  static FILTER_TYPE_BETWEEN = "BETWEEN";
  static FILTER_TYPE_NOT_BETWEEN = "NOT_BETWEEN";
  static FILTER_TYPE_IN = "IN";
  static FILTER_TYPE_NOT_IN = "NOT_IN";
  static FILTER_TYPE_NULL = "NULL";
  static FILTER_TYPE_NOT_NULL = "NOT_NULL";
  static FILTER_TYPE_DATE = "DATE";
  static FILTER_TYPE_YEAR = "YEAR";
  static FILTER_TYPE_MONTH = "MONTH";
  static FILTER_TYPE_DAY = "DAY";
  static FILTER_TYPE_TIME = "TIME";
  static FILTER_TYPE_DATE_BETWEEN = "DATE_BETWEEN";
  static FILTER_TYPE_TERM = "TERM";
  //
  static FILTER_CONNECTOR_AND = "AND";
  static FILTER_CONNECTOR_OR = "OR";
  //
  static FILTER_OPERATOR_EQUAL = "=";
  static FILTER_OPERATOR_NOT_EQUAL = "<>";
  static FILTER_OPERATOR_MAJOR = ">";
  static FILTER_OPERATOR_MAJOR_EQUAL = ">=";
  static FILTER_OPERATOR_MINOR = "<";
  static FILTER_OPERATOR_MINOR_EQUAL = "<=";
  static FILTER_OPERATOR_LIKE = "LIKE";
  //
  static SORT_RAND = "RAND";

  columns;
  table;
  original_where;
  where;
  group;
  order;
  pagination;

  constructor(connectionParams, baseParams) {
    this.con = mysql.createConnection(connectionParams);

    this.columns = baseParams.columns;
    this.table = "FROM " + baseParams.table;
    //Adding WHERE
    if (baseParams.where) {
      this.original_where = baseParams.where;
      this.where = baseParams.where;
    } else {
      this.original_where = "";
      this.where = "";
    }
    this.group = "GROUP BY " + baseParams.group.join(", ");
    //Setting order
    this.setOrder(baseParams.order);
  }

  async findAll(filters, pagination) {
    this.where = this.setFilters(filters, this.original_where);
    this.pagination = this.setPagination(pagination);

    return new Promise((resolve, reject) => {
      var sql = this.getSql();
      this.con.query(sql, (err, results, fields) => {
        console.log(fields);

        if (err) {
          // con.destroy();
          reject("Ha ocurrido un error interno");
        } else {
          // con.end();
          resolve(results);
        }
      });
    });
  }

  async count(filters, pagination) {
    this.where = this.setFilters(filters, this.original_where);
    this.pagination = this.setPagination(pagination);

    return await this._count();
  }

  getCountSql() {
    var sql =
      "SELECT " +
      this.getColumnCount() +
      " " +
      this.table +
      " WHERE " +
      this.where;
    return sql;
  }

  getSql() {
    var sql =
      "SELECT " +
      Object.values(this.columns).join(", ") +
      " " +
      this.table +
      " WHERE " +
      this.where +
      " " +
      this.group +
      " " +
      this.order +
      " " +
      this.pagination;
    return sql;
  }

  getColumnCount = function () {
    if (this.group.trim().length > 0) {
      var distinct = [];
      var parts = this.group.trim().replace("GROUP BY", "").split(",");

      for (var i = 0; i < parts.length; i++) {
        distinct.push(
          parts[i]
            .replace(" ASC")
            .replace(" DESC")
            .replace(" asc")
            .replace(" desc")
            .trim()
        );
      }

      return "COUNT(DISTINCT " + distinct.join(", ") + ") AS count";
    } else {
      return "COUNT(*) AS count";
    }
  };

  _count = function () {
    return new Promise((resolve, reject) => {
      var sql = this.getCountSql();
      this.con.query(sql, (err, results, fields) => {
        console.log(fields);

        if (err) {
          // con.destroy();
          reject("Ha ocurrido un error interno");
        } else {
          // con.end();
          resolve(results[0].count);
        }
      });
    });
  };

  setFilters = function (filters, condition) {
    if (Array.isArray(filters)) {
      for (var i = 0; i < filters.length; i++) {
        if (typeof filters[i] === "object" && filters[i] !== null) {
          this.verifyFilterType(filters[i]);
          this.verifyFilterConnector(filters[i]);
          this.verifyFilterOperator(filters[i]);
          this.verifyFilterAttribute(filters[i]);
          this.verifyFilterValue(filters[i]);
          //Procesamos filtro
          condition += this.processFilter(filters[i], condition);
        } else {
          throw "Filter should be an object, in index " + i;
        }
      }

      return condition;
    } else {
      throw "Filters should be an array";
    }
  };

  setOrder = function (order) {
    var orderSql = [];
    Object.entries(order).forEach((orderPair) => {
      const [alias, direction] = orderPair;
      orderSql.push(this.columns[alias] + " " + direction);
    });
    this.order = "ORDER BY " + orderSql.join(", ");
  };

  setPagination = function (pagination) {
    if (typeof pagination.count === "undefined" || pagination.count === null) {
      pagination.count = 0;
    }

    if (typeof pagination.limit === "undefined" || pagination.limit === null) {
      pagination.limit = 1;
    }

    if (typeof pagination.page === "undefined" || pagination.page === null) {
      pagination.page = false1;
    }

    if (pagination.count == 1) {
      if (pagination.limit !== false) {
        var count = this._count();
        //Total de páginas
        var total_pages = 1;
        if (pagination.limit > 0) {
          if (count > 0) {
            total_pages = Math.ceil(count / pagination.limit);
          } else {
            total_pages = 0;
          }
        }
        var offset = Math.floor(
          pagination.limit * pagination.page - pagination.limit
        );
        return "LIMIT " + pagination.limit + " OFFSET " + offset;
      } else {
        return "";
      }
    } else {
      if (pagination.limit !== false) {
        var offset = Math.floor(
          pagination.limit * pagination.page - pagination.limit
        );
        return "LIMIT " + pagination.limit + " OFFSET " + offset;
      } else {
        return "";
      }
    }
  };

  getColumn = function (alias) {
    return this.columns[alias];
  };

  getConn = function (conn, condition) {
    return condition.trim().length > 0 ? conn : "";
  };

  verifyFilterType = function (filter) {
    //Si no existe seteamos por defecto
    if (filter.type) {
      filter.type = filter.type.toUpperCase();
    } else {
      filter.type = NodeJSQList.FILTER_TYPE_SIMPLE;
    }

    var valid_types = [
      NodeJSQList.FILTER_TYPE_SIMPLE,
      NodeJSQList.FILTER_TYPE_COLUMN,
      NodeJSQList.FILTER_TYPE_SUB,
      NodeJSQList.FILTER_TYPE_BETWEEN,
      NodeJSQList.FILTER_TYPE_NOT_BETWEEN,
      NodeJSQList.FILTER_TYPE_IN,
      NodeJSQList.FILTER_TYPE_NOT_IN,
      NodeJSQList.FILTER_TYPE_NULL,
      NodeJSQList.FILTER_TYPE_NOT_NULL,
      NodeJSQList.FILTER_TYPE_DATE,
      NodeJSQList.FILTER_TYPE_YEAR,
      NodeJSQList.FILTER_TYPE_MONTH,
      NodeJSQList.FILTER_TYPE_DAY,
      NodeJSQList.FILTER_TYPE_TIME,
      NodeJSQList.FILTER_TYPE_DATE_BETWEEN,
      NodeJSQList.FILTER_TYPE_TERM,
    ];

    //Verificamos que no sea un array
    if (!Array.isArray(filter.type)) {
      //Chequeamos si está en el array
      if (!valid_types.includes(filter.type)) {
        throw "Invalid filter type: " + filter.type;
      }
    } else {
      throw (
        "Filter type shouldn't be an array neither object when filter type is " +
        filter.type
      );
    }
  };

  verifyFilterConnector = function (filter) {
    //Si no existe seteamos por defecto
    if (filter.conn) {
      filter.conn = filter.conn.toUpperCase();
    } else {
      filter.conn = NodeJSQList.FILTER_CONNECTOR_AND;
    }

    //Verificamos que no sea un array
    if (!Array.isArray(filter.conn)) {
      var valid_conn = [
        NodeJSQList.FILTER_CONNECTOR_AND,
        NodeJSQList.FILTER_CONNECTOR_OR,
      ];
      //Chequeamos si está en el array
      if (!valid_conn.includes(filter.conn)) {
        throw "Invalid filter connector: " + filter.conn;
      }
    } else {
      throw (
        "Filter connector shouldn't be an array neither object when filter type is " +
        filter.conn
      );
    }
  };

  verifyFilterAttribute = function (filter) {
    var white = filter.type !== NodeJSQList.FILTER_TYPE_SUB;
    //Attr no está permitido cuando el tipo de filtro es sub
    if (filter.attr && !white) {
      throw "Attribute filter not allowed when filter type is " + filter.type;
    }
    //Si debería estar
    if (white) {
      //Verificamos que exista
      if (filter.attr) {
        //Nothing
      } else {
        throw "Attribute filter is required when filter type is " + filter.type;
      }

      //Verificamos tipo
      if (filter.type === NodeJSQList.FILTER_TYPE_TERM) {
        //Verificamos que sea un array
        if (Array.isArray(filter.attr)) {
          //Verificamos si es un valor válido
          for (var i = 0; i < filter.attr; i++) {
            verifyFilterType(filter[i]);
            var column = this.getColumn(filter.attr[i]);
            if (typeof column === "undefined") {
              throw "Attribute filter '" + column + "' is not allowed";
            }
          }
        } else {
          throw (
            "Attribute filter should be array when filter type is " +
            filter.type
          );
        }
      } else {
        //Verificamos que no sea un array
        if (!Array.isArray(filter.attr)) {
          //Verificamos si es un valor válido
          var column = this.getColumn(filter.attr);
          if (typeof column === "undefined") {
            throw "Attribute filter '" + filter.attr + "' is not allowed";
          }
        } else {
          throw (
            "Attribute filter shouldn't be array neither object when filter type is " +
            filter.type
          );
        }
      }
    }
  };

  verifyFilterOperator = function (filter) {
    var valid_types = [
      NodeJSQList.FILTER_TYPE_SIMPLE,
      NodeJSQList.FILTER_TYPE_COLUMN,
    ];

    var valid = !valid_types.includes(filter.type);

    //Attr no está permitido cuando el tipo de filtro es diferente a simple y column
    if (filter.opr && valid) {
      throw "Operator filter not allowed where filter type is " + filter.type;
    }

    //Si no está seteado asuminos equal
    if (filter.opr) {
      filter.opr = filter.opr.toUpperCase();
    } else {
      filter.opr = NodeJSQList.FILTER_OPERATOR_EQUAL;
    }

    //Chequeamos si está en el array
    if (!Array.isArray(filter.opr)) {
      var valid_operators = [
        NodeJSQList.FILTER_OPERATOR_EQUAL,
        NodeJSQList.FILTER_OPERATOR_NOT_EQUAL,
        NodeJSQList.FILTER_OPERATOR_MAJOR,
        NodeJSQList.FILTER_OPERATOR_MAJOR_EQUAL,
        NodeJSQList.FILTER_OPERATOR_MINOR,
        NodeJSQList.FILTER_OPERATOR_MINOR_EQUAL,
        NodeJSQList.FILTER_OPERATOR_LIKE,
      ];
      //Verificamos si es un valor válido
      if (!valid_operators.includes(filter.opr)) {
        throw "Operator filter '" + filter.opr + "' not allowed";
      }
    } else {
      throw (
        "Operator filter shouldn't be array neither object when filter type is " +
        filter.type
      );
    }
  };

  verifyFilterValue = function (filter) {
    var valid_types = [
      NodeJSQList.FILTER_TYPE_NULL,
      NodeJSQList.FILTER_TYPE_NOT_NULL,
    ];

    var white = !valid_types.includes(filter.type);

    //Val no está permitido cuando el tipo de filtro es null o not_null
    if (filter.val && !white) {
      throw "Value is not allowed when filter type is " + filter.type;
    }

    //Verificamos que exista (salvo que sea NULL o NOT_NULL)
    if (typeof filter.val === "undefined" && white) {
      throw "Value is required when filter type is " + filter.type;
    }
  };

  processFilter = function (filter, condition) {
    switch (filter.type) {
      case NodeJSQList.FILTER_TYPE_SIMPLE:
        return this.processSimpleFilter(filter, condition);
      case NodeJSQList.FILTER_TYPE_COLUMN:
        return this.processColumnFilter(filter, condition);
      case NodeJSQList.FILTER_TYPE_BETWEEN:
        return this.processBetweenFilter(filter, false, condition);
      case NodeJSQList.FILTER_TYPE_NOT_BETWEEN:
        return this.processBetweenFilter(filter, true, condition);
      case NodeJSQList.FILTER_TYPE_IN:
        return this.processInFilter(filter, false, condition);
      case NodeJSQList.FILTER_TYPE_NOT_IN:
        return this.processInFilter(filter, true, condition);
      case NodeJSQList.FILTER_TYPE_NULL:
        return this.processNullFilter(filter, false, condition);
      case NodeJSQList.FILTER_TYPE_NOT_NULL:
        return this.processNullFilter(filter, true, condition);
      case NodeJSQList.FILTER_TYPE_TERM:
        return this.processTermFilter(filter, condition);
      case NodeJSQList.FILTER_TYPE_SUB:
        return this.processSubFilter(filter, condition);
    }
  };

  processSimpleFilter = function (filter, condition) {
    //Validamos que no sea un array
    if (Array.isArray(filter.val)) {
      throw (
        "Filter value shouldn't be an array neither object when filter type is " +
        filter.type
      );
    }

    //Creamos
    var column = this.getColumn(filter.attr);
    return (
      " " +
      this.getConn(filter.conn, condition) +
      " (" +
      column +
      " " +
      filter.opr +
      " '" +
      filter.val +
      "')"
    );
  };

  processColumnFilter = function (filter, condition) {
    //Validamos que no sea un array
    if (Array.isArray(filter.val)) {
      throw (
        "Filter value shouldn't be an array neither object when filter type is " +
        filter.type
      );
    }
    //Verificamos que sea una columna válida
    var column = this.getColumn(filter.attr);
    var column2 = this.getColumn(filter.val);
    if (typeof column2 === undefined || column2 === null) {
      throw "Column filter '" + column2 + "' is not allowed";
    }

    return (
      " " +
      this.getConn(filter.conn, condition) +
      " (" +
      column +
      " " +
      filter.opr +
      " " +
      column2 +
      ")"
    );
  };

  processBetweenFilter = function (filter, not, condition) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw (
        "Filter value should be an array when filter type is " + filter.type
      );
    }

    //Debe tener dos valores siempre
    if (filter.val.length !== 2) {
      throw (
        "Filter value should be an array with two elements, when filter type is " +
        filter.type
      );
    }

    //Cada elemento no debe ser array
    for (var i = 0; i < filter.val.length; i++) {
      if (Array.isArray(filter.val[i])) {
        throw (
          "Filter value shouldn't be an array neither object when filter type is " +
          filter.type
        );
      }
    }

    //Creamos
    var column = this.getColumn(filter.attr);
    if (not) {
      return (
        " " +
        this.getConn(filter.conn, condition) +
        " (" +
        column +
        " BETWEEN '" +
        filter.val[0] +
        "' AND '" +
        filter.val[1] +
        "')"
      );
    } else {
      return (
        " " +
        this.getConn(filter.conn, condition) +
        " (" +
        column +
        " NOT BETWEEN '" +
        filter.val[0] +
        "' AND '" +
        filter.val[1] +
        "')"
      );
    }
  };

  processInFilter = function (filter, not, condition) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw (
        "Filter value should be an array when filter type is " + filter.type
      );
    }

    //Cada elemento no debe ser array
    for (var i = 0; i < filter.val.length; i++) {
      if (Array.isArray(filter.val[i])) {
        throw (
          "Filter value shouldn't be an array neither object when filter type is " +
          filter.type
        );
      }
    }

    //Creamos
    var column = this.getColumn(filter.attr);
    if (not) {
      return (
        " " +
        this.getConn(filter.conn, condition) +
        " (" +
        column +
        " IN ('" +
        filter.val.join("', '") +
        "'))"
      );
    } else {
      return (
        " " +
        this.getConn(filter.conn, condition) +
        " (" +
        column +
        " IN ('" +
        filter.val.join('", "') +
        "'))"
      );
    }
  };

  processNullFilter = function (filter, not, condition) {
    //Creamos
    var column = this.getColumn(filter.attr);
    if (not) {
      return (
        " " + this.getConn(filter.conn, condition) + " (" + column + " IS NULL)"
      );
    } else {
      return (
        " " +
        this.getConn(filter.conn, condition) +
        " (" +
        column +
        " IS NOT NULL)"
      );
    }
  };

  processTermFilter = function (filter, condition) {
    //
    //Recorremos las columnas para filtros OR
    var ors = [];
    for (var i = 0; i < filter.attr.length; i++) {
      if (Array.isArray(filter.val)) {
        throw (
          "Filter value shouldn't be an array neither object when filter type is " +
          filter.type
        );
      }

      var column = this.getColumn(filter.attr[i]);
      ors.push(column + " LIKE '" + filter.val + "'");
    }

    return (
      " " + this.getConn(filter.conn, condition) + " (" + ors.join(" OR ") + ")"
    );
  };

  processSubFilter = function (filter, condition) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw (
        "Filter value should be an array when filter type is " + filter.type
      );
    }

    return (
      " " +
      this.getConn(filter.conn, condition) +
      " (" +
      this.setFilters(filter.val, "") +
      ")"
    );
  };
};
