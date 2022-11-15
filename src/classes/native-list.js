const { DevsStudioNodejsqlError } = require("./error");

class NativeList {
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
  // static FILTER_TYPE_YEAR = "YEAR";
  // static FILTER_TYPE_MONTH = "MONTH";
  // static FILTER_TYPE_DAY = "DAY";
  // static FILTER_TYPE_TIME = "TIME";
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
  offsetLimit;
  placeholders;

  constructor(con, baseParams) {
    this.con = con;

    this.columns = baseParams.columns;
    this.table = "FROM " + baseParams.table;
    //Adding WHERE
    if (baseParams.where && baseParams.length > 0) {
      this.original_where = baseParams.where;
      this.where = baseParams.where;
    } else {
      this.original_where = "1 = 1";
      this.where = "1 = 1";
    }
    //Adding GROUP
    if (baseParams.group) {
      this.group = "GROUP BY " + baseParams.group.join(", ");
    } else {
      this.group = "";
    }
  }

  async findAll(filters, pagination) {
    var placeholders = [];
    this.where = this._setFilters(filters, this.original_where, placeholders);
    this.offsetLimit = await this._setPagination(pagination);
    this.order = this._setOrder(pagination);
    var sql = this.getSql();
    //Obtenemos ítems
    var items = await this.con.query(sql, placeholders);

    //COUNT
    if (pagination.count == 1) {
      var total_items = await this._count(placeholders);
      //Total de páginas
      var total_pages = 1;
      if (pagination.limit > 0) {
        if (total_items > 0) {
          total_pages = Math.ceil(total_items / pagination.limit);
        } else {
          total_pages = 0;
        }
      }
      return {
        page: pagination.page * 1,
        limit: pagination.limit * 1,
        total_pages: total_pages,
        total_items: total_items,
        items: items,
      };
    } else {
      return {
        page: pagination.page * 1,
        limit: pagination.limit * 1,
        total_pages: 1,
        total_items: items.length,
        items: items,
      };
    }
  }

  async count(filters) {
    var placeholders = [];
    this.where = this._setFilters(filters, this.original_where, placeholders);

    return await this._count(placeholders);
  }

  getCountSql() {
    var sql =
      "SELECT " +
      this._getColumnCount() +
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
      this.offsetLimit;
    return sql;
  }

  _getColumnCount = function () {
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

  _count = async function (placeholders) {
    var sql = this.getCountSql();
    var items = await this.con.query(sql, placeholders);
    return items[0].count * 1;
  };

  _setPlaceholder = function (placeholders, value) {
    placeholders.push(value);
    return "?";
  };

  _setFilters = function (filters, condition, placeholders) {
    if (Array.isArray(filters)) {
      for (var i = 0; i < filters.length; i++) {
        if (typeof filters[i] === "object" && filters[i] !== null) {
          this._verifyFilterType(filters[i]);
          this.verifyFilterConnector(filters[i]);
          this.verifyFilterOperator(filters[i]);
          this.verifyFilterAttribute(filters[i]);
          this.verifyFilterValue(filters[i]);
          //Procesamos filtro
          condition += this._processFilter(filters[i], condition, placeholders);
        } else {
          throw new DevsStudioNodejsqlError(
            `Filter should be an object, in index ${i}`
          );
        }
      }

      return condition;
    } else {
      throw new DevsStudioNodejsqlError("Filters should be an array");
    }
  };

  _setPagination = async function (pagination) {
    if (typeof pagination.count === "undefined" || pagination.count === null) {
      pagination.count = 0;
    }

    if (typeof pagination.limit === "undefined" || pagination.limit === null) {
      pagination.limit = 10;
    }

    if (typeof pagination.page === "undefined" || pagination.page === null) {
      pagination.page = 1;
    }

    if (pagination.limit !== false) {
      var offset = Math.floor(
        pagination.limit * pagination.page - pagination.limit
      );
      return "LIMIT " + pagination.limit + " OFFSET " + offset;
    } else {
      return "";
    }
  };

  _setOrder = function (pagination) {
    //Setting order
    var orderSql = [];
    for (const [key, value] of Object.entries(pagination.order)) {
      orderSql.push(this.columns[key] + " " + value);
    }
    return "ORDER BY " + orderSql.join(", ");
  }

  getColumn = function (alias) {
    return this.columns[alias];
  };

  _getConn = function (conn, condition) {
    return condition.trim().length > 0 ? conn : "";
  };

  _verifyFilterType = function (filter) {
    //Si no existe seteamos por defecto
    if (filter.type) {
      filter.type = filter.type.toUpperCase();
    } else {
      filter.type = NativeList.FILTER_TYPE_SIMPLE;
    }

    var valid_types = [
      NativeList.FILTER_TYPE_SIMPLE,
      NativeList.FILTER_TYPE_COLUMN,
      NativeList.FILTER_TYPE_SUB,
      NativeList.FILTER_TYPE_BETWEEN,
      NativeList.FILTER_TYPE_NOT_BETWEEN,
      NativeList.FILTER_TYPE_IN,
      NativeList.FILTER_TYPE_NOT_IN,
      NativeList.FILTER_TYPE_NULL,
      NativeList.FILTER_TYPE_NOT_NULL,
      NativeList.FILTER_TYPE_DATE,
      // NativeList.FILTER_TYPE_YEAR,
      // NativeList.FILTER_TYPE_MONTH,
      // NativeList.FILTER_TYPE_DAY,
      // NativeList.FILTER_TYPE_TIME,
      NativeList.FILTER_TYPE_DATE_BETWEEN,
      NativeList.FILTER_TYPE_TERM,
    ];

    //Verificamos que no sea un array
    if (!Array.isArray(filter.type)) {
      //Chequeamos si está en el array
      if (!valid_types.includes(filter.type)) {
        throw new DevsStudioNodejsqlError(
          `Invalid filter type: ${filter.type}`
        );
      }
    } else {
      throw new DevsStudioNodejsqlError(
        `Filter type shouldn't be an array neither object when filter type is ${filter.type}`
      );
    }
  };

  verifyFilterConnector = function (filter) {
    //Si no existe seteamos por defecto
    if (filter.conn) {
      filter.conn = filter.conn.toUpperCase();
    } else {
      filter.conn = NativeList.FILTER_CONNECTOR_AND;
    }

    //Verificamos que no sea un array
    if (!Array.isArray(filter.conn)) {
      var valid_conn = [
        NativeList.FILTER_CONNECTOR_AND,
        NativeList.FILTER_CONNECTOR_OR,
      ];
      //Chequeamos si está en el array
      if (!valid_conn.includes(filter.conn)) {
        throw new DevsStudioNodejsqlError(
          `Invalid filter connector: ${filter.conn}`
        );
      }
    } else {
      throw new DevsStudioNodejsqlError(
        `Filter connector shouldn't be an array neither object when filter type is ${filter.conn}`
      );
    }
  };

  verifyFilterAttribute = function (filter) {
    var white = filter.type !== NativeList.FILTER_TYPE_SUB;
    //Attr no está permitido cuando el tipo de filtro es sub
    if (filter.attr && !white) {
      throw new DevsStudioNodejsqlError(
        `Attribute filter not allowed when filter type is ${filter.type}`
      );
    }
    //Si debería estar
    if (white) {
      //Verificamos que exista
      if (filter.attr) {
        //Nothing
      } else {
        throw new DevsStudioNodejsqlError(
          `Attribute filter is required when filter type is ${filter.type}`
        );
      }

      //Verificamos tipo
      if (filter.type === NativeList.FILTER_TYPE_TERM) {
        //Verificamos que sea un array
        if (Array.isArray(filter.attr)) {
          //Verificamos si es un valor válido
          for (var i = 0; i < filter.attr; i++) {
            _verifyFilterType(filter[i]);
            var column = this.getColumn(filter.attr[i]);
            if (typeof column === "undefined") {
              throw new DevsStudioNodejsqlError(
                `Attribute filter '${column}' is not allowed`
              );
            }
          }
        } else {
          throw new DevsStudioNodejsqlError(
            `Attribute filter should be array when filter type is ${filter.type}`
          );
        }
      } else {
        //Verificamos que no sea un array
        if (!Array.isArray(filter.attr)) {
          //Verificamos si es un valor válido
          var column = this.getColumn(filter.attr);
          if (typeof column === "undefined") {
            throw new DevsStudioNodejsqlError(
              `Attribute filter '${filter.attr}' is not allowed`
            );
          }
        } else {
          throw new DevsStudioNodejsqlError(
            `Attribute filter shouldn't be array neither object when filter type is ${filter.type}`
          );
        }
      }
    }
  };

  verifyFilterOperator = function (filter) {
    var valid_types = [
      NativeList.FILTER_TYPE_SIMPLE,
      NativeList.FILTER_TYPE_COLUMN,
    ];

    var valid = !valid_types.includes(filter.type);

    //Attr no está permitido cuando el tipo de filtro es diferente a simple y column
    if (filter.opr && valid) {
      throw new DevsStudioNodejsqlError(
        `Operator filter not allowed where filter type is ${filter.type}`
      );
    }

    //Si no está seteado asuminos equal
    if (filter.opr) {
      filter.opr = filter.opr.toUpperCase();
    } else {
      filter.opr = NativeList.FILTER_OPERATOR_EQUAL;
    }

    //Chequeamos si está en el array
    if (!Array.isArray(filter.opr)) {
      var valid_operators = [
        NativeList.FILTER_OPERATOR_EQUAL,
        NativeList.FILTER_OPERATOR_NOT_EQUAL,
        NativeList.FILTER_OPERATOR_MAJOR,
        NativeList.FILTER_OPERATOR_MAJOR_EQUAL,
        NativeList.FILTER_OPERATOR_MINOR,
        NativeList.FILTER_OPERATOR_MINOR_EQUAL,
        NativeList.FILTER_OPERATOR_LIKE,
      ];
      //Verificamos si es un valor válido
      if (!valid_operators.includes(filter.opr)) {
        throw new DevsStudioNodejsqlError(
          `Operator filter '${filter.opr}' not allowed`
        );
      }
    } else {
      throw new DevsStudioNodejsqlError(
        `Operator filter shouldn't be array neither object when filter type is ${filter.type}`
      );
    }
  };

  verifyFilterValue = function (filter) {
    var valid_types = [
      NativeList.FILTER_TYPE_NULL,
      NativeList.FILTER_TYPE_NOT_NULL,
    ];

    var white = !valid_types.includes(filter.type);

    //Val no está permitido cuando el tipo de filtro es null o not_null
    if (filter.val && !white) {
      throw new DevsStudioNodejsqlError(
        `Value is not allowed when filter type is ${filter.type}"`
      );
    }

    //Verificamos que exista (salvo que sea NULL o NOT_NULL)
    if (typeof filter.val === "undefined" && white) {
      throw new DevsStudioNodejsqlError(
        `Value is required when filter type is ${filter.type}`
      );
    }
  };

  _processFilter = function (filter, condition, placeholders) {
    switch (filter.type) {
      case NativeList.FILTER_TYPE_SIMPLE:
        return this._processSimpleFilter(filter, condition, placeholders);
      case NativeList.FILTER_TYPE_COLUMN:
        return this._processColumnFilter(filter, condition, placeholders);
      case NativeList.FILTER_TYPE_BETWEEN:
        return this._processBetweenFilter(
          filter,
          false,
          condition,
          placeholders
        );
      case NativeList.FILTER_TYPE_NOT_BETWEEN:
        return this._processBetweenFilter(
          filter,
          true,
          condition,
          placeholders
        );
      case NativeList.FILTER_TYPE_IN:
        return this._processInFilter(filter, false, condition, placeholders);
      case NativeList.FILTER_TYPE_NOT_IN:
        return this._processInFilter(filter, true, condition, placeholders);
      case NativeList.FILTER_TYPE_NULL:
        return this._processNullFilter(filter, false, condition, placeholders);
      case NativeList.FILTER_TYPE_NOT_NULL:
        return this._processNullFilter(filter, true, condition, placeholders);
      case NativeList.FILTER_TYPE_TERM:
        return this._processTermFilter(filter, condition, placeholders);
      case NativeList.FILTER_TYPE_SUB:
        return this._processSubFilter(filter, condition, placeholders);
      case NativeList.FILTER_TYPE_DATE:
        return this._processDateFilter(filter, condition, placeholders);
      case NativeList.FILTER_TYPE_DATE_BETWEEN:
        return this._processDateBetweenFilter(filter, condition, placeholders);
    }
  };

  _processSimpleFilter = function (filter, condition, placeholders) {
    //Validamos que no sea un array
    if (Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value shouldn't be an array neither object when filter type is ${filter.type}`
      );
    }

    //Creamos
    var column = this.getColumn(filter.attr);

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      column +
      " " +
      filter.opr +
      " " +
      this._setPlaceholder(placeholders, filter.val) +
      ")"
    );
  };

  _processColumnFilter = function (filter, condition, placeholders) {
    //Validamos que no sea un array
    if (Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value shouldn't be an array neither object when filter type is ${filter.type}`
      );
    }
    //Verificamos que sea una columna válida
    var column = this.getColumn(filter.attr);
    var column2 = this.getColumn(filter.val);
    if (typeof column2 === "undefined" || column2 === null) {
      throw new DevsStudioNodejsqlError(
        `Column filter '${filter.val}' is not allowed`
      );
    }

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      column +
      " " +
      filter.opr +
      " " +
      column2 +
      ")"
    );
  };

  _processBetweenFilter = function (filter, not, condition, placeholders) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an array when filter type is ${filter.type}`
      );
    }

    //Debe tener dos valores siempre
    if (filter.val.length !== 2) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an array with two elements, when filter type is ${filter.type}`
      );
    }

    //Cada elemento no debe ser array
    for (var j = 0; j < filter.val.length; j++) {
      if (Array.isArray(filter.val[j])) {
        throw new DevsStudioNodejsqlError(
          `Filter value shouldn't be an array neither object when filter type is ${filter.type}`
        );
      }
    }

    //Creamos
    var column = this.getColumn(filter.attr);
    if (not) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " NOT BETWEEN " +
        this._setPlaceholder(placeholders, filter.val[0]) +
        " AND " +
        this._setPlaceholder(placeholders, filter.val[1]) +
        ")"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " BETWEEN " +
        this._setPlaceholder(placeholders, filter.val[0]) +
        " AND " +
        this._setPlaceholder(placeholders, filter.val[1]) +
        ")"
      );
    }
  };

  _processInFilter = function (filter, not, condition, placeholders) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an array when filter type is ${filter.type}`
      );
    }

    var current_placeholders = [];
    //Cada elemento no debe ser array
    for (var j = 0; j < filter.val.length; j++) {
      if (Array.isArray(filter.val[j])) {
        throw new DevsStudioNodejsqlError(
          `Filter value shouldn't be an array neither object when filter type is ${filter.type}`
        );
      } else {
        current_placeholders.push(
          this._setPlaceholder(placeholders, filter.val[j])
        );
      }
    }

    //Creamos
    var column = this.getColumn(filter.attr);
    if (not) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " NOT IN (" +
        current_placeholders.join(", ") +
        "))"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " IN (" +
        current_placeholders.join(", ") +
        "))"
      );
    }
  };

  _processNullFilter = function (filter, not, condition, placeholders) {
    //Creamos
    var column = this.getColumn(filter.attr);
    if (not) {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " IS NOT NULL)"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " IS NULL)"
      );
    }
  };

  _processTermFilter = function (filter, condition, placeholders) {
    //
    //Recorremos las columnas para filtros OR
    var ors = [];
    for (var j = 0; j < filter.attr.length; j++) {
      if (Array.isArray(filter.val)) {
        throw new DevsStudioNodejsqlError(
          `Filter value shouldn't be an array neither object when filter type is ${filter.type}`
        );
      }

      var column = this.getColumn(filter.attr[j]);
      ors.push(
        column + " LIKE " + this._setPlaceholder(placeholders, filter.val)
      );
    }

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      ors.join(" OR ") +
      ")"
    );
  };

  _processSubFilter = function (filter, condition, placeholders) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an array when filter type is ${filter.type}`
      );
    }

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      this._setFilters(filter.val, "", placeholders) +
      ")"
    );
  };

  _processDateFilter = function (filter, condition, placeholders) {
    //Validamos que no sea un array
    if (Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value shouldn't be an array neither object when filter type is ${filter.type}`
      );
    }

    //Creamos
    var column = this.getColumn(filter.attr);

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      column +
      " BETWEEN DATE(" +
      this._setPlaceholder(placeholders, filter.val) +
      ") AND DATE_ADD(DATE(" +
      this._setPlaceholder(placeholders, filter.val) +
      "), INTERVAL 1 DAY))"
    );
  };

  _processDateBetweenFilter = function (filter, condition, placeholders) {
    //Validamos que sea un array
    if (!Array.isArray(filter.val)) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an array when filter type is ${filter.type}`
      );
    }

    if (!filter.val.length !== 2) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an array with two elements, when filter type is ${filter.type}`
      );
    }

    //Creamos
    var column = this.getColumn(filter.attr);

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      column +
      " BETWEEN DATE(" +
      this._setPlaceholder(placeholders, filter.val[0]) +
      ") AND DATE_ADD(DATE(" +
      this._setPlaceholder(placeholders, filter.val[1]) +
      "), INTERVAL 1 DAY))"
    );
  };
}

exports.NativeList = NativeList;
