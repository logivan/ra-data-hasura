'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildGetListVariables = void 0;
const set_1 = __importDefault(require('lodash/set'));
const omit_1 = __importDefault(require('lodash/omit'));
const getFinalType_1 = __importDefault(require('../helpers/getFinalType'));
const SPLIT_TOKEN = '#';
const MULTI_SORT_TOKEN = ',';
const SPLIT_OPERATION = '@';
const buildGetListVariables = () => (resource, _, params) => {
  const result = {};
  let { filter: filterObj = {} } = params;
  const { customFilters = [] } = params;
  const distinctOnField = 'distinct_on';
  /** Setting "distinct_on" to be the `filters` object attribute to be used inside RA
   * and setting to a `distinct_on` variable
   * and removing from the filter object
   */
  const { distinct_on = '' } = filterObj;
  filterObj = (0, omit_1.default)(filterObj, [distinctOnField]);
  /**
   * Nested entities are parsed by CRA, which returns a nested object
   * { 'level1': {'level2': 'test'}}
   * instead of { 'level1.level2': 'test'}
   * That's why we use a HASH for properties, when we declared nested stuff at CRA:
   * level1#level2@_ilike
   */
  /**
         keys with comma separated values
        {
            'title@ilike,body@like,authors@similar': 'test',
            'col1@like,col2@like': 'val'
        }
     */
  const orFilterKeys = Object.keys(filterObj).filter((e) => e.includes(','));
  /**
        format filters
        {
            'title@ilike': 'test',
            'body@like': 'test',
            'authors@similar': 'test',
            'col1@like': 'val',
            'col2@like': 'val'
        }
    */
  const orFilterObj = orFilterKeys.reduce((acc, commaSeparatedKey) => {
    const keys = commaSeparatedKey.split(',');
    return Object.assign(
      Object.assign({}, acc),
      keys.reduce((acc2, key) => {
        return Object.assign(Object.assign({}, acc2), {
          [key]: filterObj[commaSeparatedKey],
        });
      }, {})
    );
  }, {});
  filterObj = (0, omit_1.default)(filterObj, orFilterKeys);
  const makeNestedFilter = (obj, operation) => {
    if (Object.keys(obj).length === 1) {
      const [key] = Object.keys(obj);
      return { [key]: makeNestedFilter(obj[key], operation) };
    } else {
      return { [operation]: obj };
    }
  };
  const filterReducer = (obj) => (acc, key) => {
    let filter;
    if (key === 'ids') {
      filter = { id: { _in: obj['ids'] } };
    } else if (Array.isArray(obj[key])) {
      let [keyName, operation = '_in', opPath] = key.split(SPLIT_OPERATION);
      let value = opPath
        ? (0, set_1.default)({}, opPath.split(SPLIT_TOKEN), obj[key])
        : obj[key];
      filter = (0, set_1.default)({}, keyName.split(SPLIT_TOKEN), {
        [operation]: value,
      });
    } else if (obj[key] && obj[key].format === 'hasura-raw-query') {
      filter = (0, set_1.default)(
        {},
        key.split(SPLIT_TOKEN),
        obj[key].value || {}
      );
    } else {
      let [keyName, operation = ''] = key.split(SPLIT_OPERATION);
      let operator;
      if (operation === '{}') operator = {};
      const field = resource.type.fields.find((f) => f.name === keyName);
      if (field) {
        switch ((0, getFinalType_1.default)(field.type).name) {
          case 'String':
            operation = operation || '_ilike';
            if (!operator)
              operator = {
                [operation]: operation.includes('like')
                  ? `%${obj[key]}%`
                  : obj[key],
              };
            filter = (0, set_1.default)(
              {},
              keyName.split(SPLIT_TOKEN),
              operator
            );
            break;
          default:
            if (!operator)
              operator = {
                [operation || '_eq']: operation.includes('like')
                  ? `%${obj[key]}%`
                  : obj[key],
              };
            filter = (0, set_1.default)(
              {},
              keyName.split(SPLIT_TOKEN),
              operator
            );
        }
      } else {
        // Else block runs when the field is not found in Graphql schema.
        // Most likely it's nested. If it's not, it's better to let
        // Hasura fail with a message than silently fail/ignore it
        if (!operator)
          operator = {
            [operation || '_eq']: operation.includes('like')
              ? `%${obj[key]}%`
              : obj[key],
          };
        filter = (0, set_1.default)({}, keyName.split(SPLIT_TOKEN), operator);
      }
    }
    return [...acc, filter];
  };
  const andFilters = Object.keys(filterObj)
    .reduce(filterReducer(filterObj), customFilters)
    .filter(Boolean);
  const orFilters = Object.keys(orFilterObj)
    .reduce(filterReducer(orFilterObj), [])
    .filter(Boolean);
  result['where'] = Object.assign(
    { _and: andFilters },
    orFilters.length && { _or: orFilters }
  );
  if (params.pagination) {
    result['limit'] = parseInt(params.pagination.perPage, 10);
    result['offset'] = (params.pagination.page - 1) * params.pagination.perPage;
  }
  if (params.sort) {
    const { field, order } = params.sort;
    const hasMultiSort =
      field.includes(MULTI_SORT_TOKEN) || order.includes(MULTI_SORT_TOKEN);
    if (hasMultiSort) {
      const fields = field.split(MULTI_SORT_TOKEN);
      const orders = order
        .split(MULTI_SORT_TOKEN)
        .map((order) => order.toLowerCase());
      if (fields.length !== orders.length) {
        throw new Error(
          `The ${
            resource.type.name
          } list must have an order value for each sort field. Sort fields are "${fields.join(
            ','
          )}" but sort orders are "${orders.join(',')}"`
        );
      }
      const multiSort = fields.map((field, index) =>
        makeSort(field, orders[index])
      );
      result['order_by'] = multiSort;
    } else {
      result['order_by'] = makeSort(field, order);
    }
  }
  if (distinct_on) {
    result['distinct_on'] = distinct_on;
  }
  return result;
};
exports.buildGetListVariables = buildGetListVariables;
/**
 * if the field contains a SPLIT_OPERATION, it means it's column ordering option.
 *
 * @example
 * ```
 * makeSort('title', 'ASC') => { title: 'asc' }
 * ```
 * @example
 * ```
 * makeSort('title@nulls_last', 'ASC') => { title: 'asc_nulls_last' }
 * ```
 * @example
 * ```
 * makeSort('title@nulls_first', 'ASC') => { title: 'asc_nulls_first' }
 * ```
 *
 */
const makeSort = (field, sort) => {
  const [fieldName, operation] = field.split(SPLIT_OPERATION);
  const fieldSort = operation ? `${sort}_${operation}` : sort;
  return (0, set_1.default)({}, fieldName, fieldSort.toLowerCase());
};
