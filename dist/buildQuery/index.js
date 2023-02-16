'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildQueryFactory = void 0;
const buildVariables_1 = require('../buildVariables');
const buildGqlQuery_1 = __importDefault(require('../buildGqlQuery'));
const getResponseParser_1 = require('../getResponseParser');
const buildQueryFactory =
  (buildVariablesImpl, buildGqlQueryImpl, getResponseParserImpl) =>
  (introspectionResults) => {
    const knownResources = introspectionResults.resources.map(
      (r) => r.type.name
    );
    return (aorFetchType, resourceName, params) => {
      const resource = introspectionResults.resources.find(
        (r) => r.type.name === resourceName
      );
      if (!resource) {
        if (knownResources.length) {
          throw new Error(
            `Unknown resource ${resourceName}. Make sure it has been declared on your server side schema. Known resources are ${knownResources.join(
              ', '
            )}`
          );
        } else {
          throw new Error(
            `Unknown resource ${resourceName}. No resources were found. Make sure it has been declared on your server side schema and check if your Authorization header is properly set up.`
          );
        }
      }
      const queryType = resource[aorFetchType];
      if (!queryType) {
        throw new Error(
          `No query or mutation matching fetch type ${aorFetchType} could be found for resource ${resource.type.name}`
        );
      }
      const variables = buildVariablesImpl(introspectionResults)(
        resource,
        aorFetchType,
        params,
        queryType
      );
      const query = buildGqlQueryImpl(introspectionResults)(
        resource,
        aorFetchType,
        queryType,
        variables
      );
      const parseResponse = getResponseParserImpl(introspectionResults)(
        aorFetchType,
        resource
      );
      return {
        query,
        variables,
        parseResponse,
      };
    };
  };
exports.buildQueryFactory = buildQueryFactory;
exports.default = (0, exports.buildQueryFactory)(
  buildVariables_1.buildVariables,
  buildGqlQuery_1.default,
  getResponseParser_1.getResponseParser
);
