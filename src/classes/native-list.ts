import { isNumber, isNumberString, validate } from "class-validator";
import { ListParams } from "../dto/params/list.params";
import { FilterRequest } from "../dto/request/filter.request";
import { FindRequest } from "../dto/request/find.request";
import { InfiniteScrollRequest } from "../dto/request/infinite-scroll.request";
import { PaginationOffsetRequest } from "../dto/request/pagination-offset.request";
import { PaginationRequest } from "../dto/request/pagination.request";
import { ListOffsetResponse } from "../dto/response/list-offset.response";
import { ListResponse } from "../dto/response/list.response";
import { Select2Response } from "../dto/response/select2.response";
import { Columns, Order, Row } from "../interfaces/interfaces";
import { DevsStudioNodejsqlError } from "./error";
import { NodeJSQLFilterConnector, NodeJSQLFilterOperator, NodeJSQLFilterType } from "../dto/enums/enums";
import { plainToInstance } from "class-transformer";


export class NativeList {

  static SORT_RAND = "RAND";

  columns: Columns;
  table: string;
  original_where: string;
  where: string;
  group: string;
  order: string = "";
  offsetLimit: string = "";

  private connection: any;


  constructor(con: any, baseParams: ListParams) {
    this.connection = con;

    this.columns = baseParams.columns;
    this.table = "FROM " + baseParams.table;
    //Adding WHERE
    if (baseParams.where && Object.values(baseParams).length > 0) {
      this.original_where = baseParams.where;
      this.where = baseParams.where;
    } else {
      this.original_where = "1 = 1";
      this.where = "1 = 1";
    }
    //Adding GROUP
    if (baseParams.group) {
      this.group = "GROUP BY " + baseParams.group;
    } else {
      this.group = "";
    }
  }

  async findAll(filters: FilterRequest[], findRequest: FindRequest, exclusions?: string[]): Promise<Row[]> {
    var placeholders: string[] = [];
    this.where = await this._setFilters(filters, this.original_where, placeholders);
    this.offsetLimit = await this._setLimit(findRequest);
    this.order = this._setOrder(findRequest.order);

    var selectPairs = this.getSelectPairs(exclusions ?? []);
    var sql = this.getSql(selectPairs);
    //Obtenemos ítems
    return await this.connection.query(sql, placeholders);
  }

  async findSelect2(filters: FilterRequest[], infiniteScroll: InfiniteScrollRequest, valueAttribute: string, textAttribute: string): Promise<Select2Response> {
    var placeholders: string[] = [];
    this.where = await this._setFilters(filters, this.original_where, placeholders);
    this.offsetLimit = await this._setInfiniteScroll(infiniteScroll);
    this.order = this._setOrder(infiniteScroll.order);

    var selectPairs = this.getSelect2Pairs(valueAttribute, textAttribute);
    var sql = this.getSql(selectPairs);
    //Obtenemos ítems
    var items = await this.connection.query(sql, placeholders);

    //COUNT
    return {
      items: items,
    };
  }

  async findPaginated(filters: FilterRequest[], pagination: PaginationRequest, exclusions?: string[]): Promise<ListResponse> {
    var placeholders: string[] = [];
    this.where = await this._setFilters(filters, this.original_where, placeholders);
    this.offsetLimit = await this._setPagination(pagination);
    this.order = this._setOrder(pagination.order);

    var selectPairs = this.getSelectPairs(exclusions ?? []);
    var sql = this.getSql(selectPairs);
    //Obtenemos ítems
    var items = await this.connection.query(sql, placeholders);

    //COUNT
    if (pagination.count) {
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

  async findPaginatedOffset(filters: FilterRequest[], pagination: PaginationOffsetRequest, exclusions?: string[]): Promise<ListOffsetResponse> {

    //Contamos sin filtros (solo con el original where)
    var total_items = 0;
    if (filters.length > 0) {
      total_items = await this._count([]);
    }

    var placeholders: string[] = [];
    this.where = await this._setFilters(filters, this.original_where, placeholders);
    this.offsetLimit = await this._setPaginationOffset(pagination);
    this.order = this._setOrder(pagination.order);

    var selectPairs = this.getSelectPairs(exclusions ?? []);
    var sql = this.getSql(selectPairs);
    //Obtenemos ítems
    var items = await this.connection.query(sql, placeholders);

    //COUNT
    var filtered_items = await this._count(placeholders);
    if (filters.length === 0) {
      total_items = filtered_items;
    }

    return {
      offset: pagination.offset * 1,
      limit: pagination.limit * 1,
      total_items: total_items,
      filtered_items: filtered_items,
      items: items,
    };
  }

  async count(filters: FilterRequest[]) {
    var placeholders: string[] = [];
    this.where = await this._setFilters(filters, this.original_where, placeholders);

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

  getSelectPairs(exclusions: string[]) {

    var selectPairs = Object.entries(this.columns)
      .filter(([key]) => !exclusions.includes(key))
      .map(([key, value]) => `${value} as ${key}`);

    if (selectPairs.length === 0) {
      selectPairs = Object.entries(this.columns).map(([key, value]) => `${value} as ${key}`);
    }

    return selectPairs;
  }

  getSelect2Pairs(valueAttribute: string, textAttribute: string) {
    var selectPairs = [];
    selectPairs.push(this.columns[valueAttribute] + " as value");
    selectPairs.push(this.columns[textAttribute] + " as label");
    return selectPairs;
  }

  getSql(selectPairs: string[]) {

    var sql =
      "SELECT " +
      selectPairs.join(", ") +
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

  private _getColumnCount() {
    if (this.group.trim().length > 0) {
      var distinct = [];
      var parts = this.group.trim().replace("GROUP BY", "").split(",");

      for (var i = 0; i < parts.length; i++) {
        distinct.push(
          parts[i]
            .replace(" ASC", "")
            .replace(" DESC", "")
            .replace(" asc", "")
            .replace(" desc", "")
            .trim()
        );
      }

      return "COUNT(DISTINCT " + distinct.join(", ") + ") AS count";
    } else {
      return "COUNT(*) AS count";
    }
  };

  private async _count(placeholders: string[]): Promise<number> {
    var sql = this.getCountSql();
    var items = await this.connection.query(sql, placeholders);
    return items[0].count * 1;
  };

  private _setPlaceholder(placeholders: string[], value: string) {
    placeholders.push(value);

    switch (this.connection.connection.driver.constructor.name) {
      case 'MysqlDriver':
        return '?';
      case 'PostgresDriver':
      default:
        return "$" + (placeholders.length).toString();
    }
  };

  private async _setFilters(filters: FilterRequest[], condition: string, placeholders: string[]) {
    if (Array.isArray(filters)) {
      for (var i = 0; i < filters.length; i++) {
        if (typeof filters[i] === "object" && filters[i] !== null) {

          filters[i] = plainToInstance(FilterRequest, filters[i]);
          var errors = await validate(filters[i]);
          if (errors.length > 0) {
            throw DevsStudioNodejsqlError.fromValidationErrors(errors);
          }

          this.verifyFilterOperator(filters[i]);
          this.verifyFilterAttribute(filters[i]);
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

  async _setPagination(pagination: PaginationRequest) {
    if (typeof pagination.count === "undefined" || pagination.count === null) {
      pagination.count = false;
    }

    if (typeof pagination.limit === "undefined" || pagination.limit === null) {
      pagination.limit = 10;
    }

    if (typeof pagination.page === "undefined" || pagination.page === null) {
      pagination.page = 1;
    }

    if (pagination.limit > 0) {
      var offset = Math.floor(
        pagination.limit * pagination.page - pagination.limit
      );
      return "LIMIT " + pagination.limit + " OFFSET " + offset;
    } else {
      return "";
    }
  };

  async _setPaginationOffset(pagination: PaginationOffsetRequest) {

    if (typeof pagination.limit === "undefined" || pagination.limit === null) {
      pagination.limit = 10;
    }

    if (typeof pagination.offset === "undefined" || pagination.offset === null) {
      pagination.offset = 0;
    }

    if (pagination.limit > 0) {
      return "LIMIT " + pagination.limit + " OFFSET " + pagination.offset;
    } else {
      return "OFFSET " + pagination.offset;
    }
  };

  async _setInfiniteScroll(infiniteScroll: InfiniteScrollRequest) {
    if (typeof infiniteScroll.limit === "undefined" || infiniteScroll.limit === null) {
      infiniteScroll.limit = 10;
    }

    if (typeof infiniteScroll.page === "undefined" || infiniteScroll.page === null) {
      infiniteScroll.page = 1;
    }

    if (infiniteScroll.limit > 0) {
      var offset = Math.floor(
        infiniteScroll.limit * infiniteScroll.page - infiniteScroll.limit
      );
      return "LIMIT " + infiniteScroll.limit + " OFFSET " + offset;
    } else {
      return "";
    }
  };

  async _setLimit(findRequest: FindRequest) {
    if (findRequest.limit > 0) {
      return "LIMIT " + findRequest.limit;
    } else {
      return "";
    }
  };

  private _setOrder(order: Order) {
    //Setting order
    var orderSql = [];
    for (const [key, value] of Object.entries(order)) {
      orderSql.push(this.columns[key] + " " + value);
    }
    if (orderSql.length > 0) {
      return "ORDER BY " + orderSql.join(", ");
    } else {
      return "";
    }
  }

  getColumn(alias: string) {
    return this.columns[alias];
  };

  private _getConn(conn: NodeJSQLFilterConnector, condition: string) {
    return condition.trim().length > 0 ? conn : "";
  };

  verifyFilterAttribute(filter: FilterRequest) {
    //Verificamos tipo
    if (filter.type === NodeJSQLFilterType.TERM) {
      //Verificamos si es un valor válido
      for (let attr of filter.attr.split(",")) {
        var column = this.getColumn(attr);
        if (typeof column === "undefined") {
          throw new DevsStudioNodejsqlError(
            `Attribute filter '${column}' is not allowed`
          );
        }
      }
    } else {
      //Verificamos si es un valor válido
      var column = this.getColumn(filter.attr);
      if (typeof column === "undefined") {
        throw new DevsStudioNodejsqlError(
          `Attribute filter '${filter.attr}' is not allowed`
        );
      }
    }

  };

  verifyFilterOperator(filter: FilterRequest) {
    //Si está en la lista se verifica, de lo contrario no hay problema porque será ignorado
    switch (filter.type) {
      case NodeJSQLFilterType.SIMPLE:
      case NodeJSQLFilterType.COLUMN:
        var valid_operators = [
          NodeJSQLFilterOperator.EQUAL,
          NodeJSQLFilterOperator.NOT_EQUAL,
          NodeJSQLFilterOperator.MAJOR,
          NodeJSQLFilterOperator.MAJOR_EQUAL,
          NodeJSQLFilterOperator.MINOR,
          NodeJSQLFilterOperator.MINOR_EQUAL,
          NodeJSQLFilterOperator.LIKE,
          NodeJSQLFilterOperator.ILIKE,
        ];
        //Verificamos si es un valor válido
        if (!valid_operators.includes(filter.opr)) {
          throw new DevsStudioNodejsqlError(
            `Operator filter '${filter.opr}' not allowed`
          );
        }
        break;
      case NodeJSQLFilterType.NUMERIC:
        var valid_operators = [
          NodeJSQLFilterOperator.EQUAL,
          NodeJSQLFilterOperator.NOT_EQUAL,
          NodeJSQLFilterOperator.MAJOR,
          NodeJSQLFilterOperator.MAJOR_EQUAL,
          NodeJSQLFilterOperator.MINOR,
          NodeJSQLFilterOperator.MINOR_EQUAL,
        ];
        //Verificamos si es un valor válido
        if (!valid_operators.includes(filter.opr)) {
          throw new DevsStudioNodejsqlError(
            `Operator filter '${filter.opr}' not allowed`
          );
        }
        break;
      case NodeJSQLFilterType.TERM:
        var valid_operators = [
          NodeJSQLFilterOperator.LIKE,
          NodeJSQLFilterOperator.ILIKE,
        ];
        //Verificamos si es un valor válido
        if (!valid_operators.includes(filter.opr)) {
          throw new DevsStudioNodejsqlError(
            `Operator filter '${filter.opr}' not allowed in term condition`
          );
        }
        break;
    }
  };

  _processFilter(filter: FilterRequest, condition: string, placeholders: string[]) {
    switch (filter.type) {
      case NodeJSQLFilterType.SIMPLE:
        return this._processSimpleFilter(filter, condition, placeholders);
      case NodeJSQLFilterType.COLUMN:
        return this._processColumnFilter(filter, condition, placeholders);
      case NodeJSQLFilterType.BETWEEN:
        return this._processBetweenFilter(
          filter,
          false,
          condition,
          placeholders
        );
      case NodeJSQLFilterType.NOT_BETWEEN:
        return this._processBetweenFilter(
          filter,
          true,
          condition,
          placeholders
        );
      case NodeJSQLFilterType.IN:
        return this._processInFilter(filter, false, condition, placeholders);
      case NodeJSQLFilterType.NOT_IN:
        return this._processInFilter(filter, true, condition, placeholders);
      case NodeJSQLFilterType.NULL:
        return this._processNullFilter(filter, false, condition, placeholders);
      case NodeJSQLFilterType.NOT_NULL:
        return this._processNullFilter(filter, true, condition, placeholders);
      case NodeJSQLFilterType.TERM:
        return this._processTermFilter(filter, condition, placeholders);
      case NodeJSQLFilterType.DATE:
        return this._processDateFilter(filter, condition, placeholders);
      case NodeJSQLFilterType.NUMERIC:
        return this._processNumericFilter(filter, condition, placeholders);
      case NodeJSQLFilterType.DATE_BETWEEN:
        return this._processDateBetweenFilter(filter, condition, placeholders);
    }
  };

  private _processSimpleFilter(filter: FilterRequest, condition: string, placeholders: string[]) {

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
      this._setPlaceholder(placeholders, filter.val!) +
      ")"
    );
  };

  private _processNumericFilter(filter: FilterRequest, condition: string, placeholders: string[]) {

    //Creamos
    var column = this.getColumn(filter.attr);
    const is_number = isNumber(filter.val) || isNumberString(filter.val);

    return (
      " " +
      this._getConn(filter.conn, condition) +
      " (" +
      column +
      " " +
      filter.opr +
      " " +
      this._setPlaceholder(placeholders, (is_number ? filter.val! : '0')) +
      ")"
    );
  };

  private _processColumnFilter(filter: FilterRequest, condition: string, placeholders: string[]) {

    //Verificamos que sea una columna válida
    var column = this.getColumn(filter.attr);
    var column2 = this.getColumn(filter.val!);
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

  private _processBetweenFilter(filter: FilterRequest, not: boolean, condition: string, placeholders: string[]) {

    //Hacemos split de los campos
    var vals = filter.val!.split(",");

    //Debe tener dos valores siempre
    if (vals.length !== 2) {
      throw new DevsStudioNodejsqlError(
        `Filter value should be an string with two elements separated by comma, when filter type is ${filter.type}`
      );
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
        this._setPlaceholder(placeholders, vals[0]) +
        " AND " +
        this._setPlaceholder(placeholders, vals[1]) +
        ")"
      );
    } else {
      return (
        " " +
        this._getConn(filter.conn, condition) +
        " (" +
        column +
        " BETWEEN " +
        this._setPlaceholder(placeholders, vals[0]) +
        " AND " +
        this._setPlaceholder(placeholders, vals[1]) +
        ")"
      );
    }
  };

  _processInFilter(filter: FilterRequest, not: boolean, condition: string, placeholders: string[]) {

    var vals = filter.val!.split(",");

    var current_placeholders = [];
    //Cada elemento no debe ser array
    for (var j = 0; j < vals.length; j++) {
      current_placeholders.push(
        this._setPlaceholder(placeholders, vals[j])
      );
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

  _processNullFilter(filter: FilterRequest, not: boolean, condition: string, placeholders: string[]) {
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

  _processTermFilter(filter: FilterRequest, condition: string, placeholders: string[]) {
    var attrs = filter.attr.split(",");
    //Recorremos las columnas para filtros OR
    var ors = [];
    for (var j = 0; j < attrs.length; j++) {

      var column = this.getColumn(attrs[j]);
      ors.push(
        column + " " + filter.opr + " " + this._setPlaceholder(placeholders, filter.val!)
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

  _processDateFilter(filter: FilterRequest, condition: string, placeholders: string[]) {

    //Creamos
    var column = this.getColumn(filter.attr);

    switch (this.connection.connection.driver.constructor.name) {
      case 'MysqlDriver':
        return (
          " " +
          this._getConn(filter.conn, condition) +
          " (" +
          column +
          " BETWEEN " +
          this._setPlaceholder(placeholders, filter.val!) +
          " AND DATE_ADD(" +
          this._setPlaceholder(placeholders, filter.val!) +
          ", INTERVAL 1 DAY))"
        );
      case 'PostgresDriver':
      default:
        return (
          " " +
          this._getConn(filter.conn, condition) +
          " (" +
          column +
          " BETWEEN (" +
          this._setPlaceholder(placeholders, filter.val!) +
          ")::TIMESTAMP AND (" +
          this._setPlaceholder(placeholders, filter.val!) +
          ")::TIMESTAMP + interval '1 days')"
        );
    }
  };

  _processDateBetweenFilter(filter: FilterRequest, condition: string, placeholders: string[]) {

    var vals = filter.val!.split(",");

    if (vals.length !== 2) {
      throw new DevsStudioNodejsqlError(
        `Splitted filter value should be an array with two elements, when filter type is ${filter.type}`
      );
    }

    //Creamos
    var column = this.getColumn(filter.attr);

    switch (this.connection.connection.driver.constructor.name) {
      case 'MysqlDriver':
        return (
          " " +
          this._getConn(filter.conn, condition) +
          " (" +
          column +
          " BETWEEN " +
          this._setPlaceholder(placeholders, vals[0]) +
          " AND DATE_ADD(" +
          this._setPlaceholder(placeholders, vals[1]) +
          ", INTERVAL 1 DAY))"
        );
      case 'PostgresDriver':
      default:
        return (
          " " +
          this._getConn(filter.conn, condition) +
          " (" +
          column +
          " BETWEEN (" +
          this._setPlaceholder(placeholders, vals[0]) +
          ")::TIMESTAMP AND (" +
          this._setPlaceholder(placeholders, vals[1]) +
          ")::TIMESTAMP + interval '1 days')"
        );
    }
  };
}