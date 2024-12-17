import { buildVariables } from '../buildVariables';
import buildGqlQuery, { BuildGqlQueryFactory } from '../buildGqlQuery';
import { getResponseParser, GetResponseParser } from '../getResponseParser';
import type {
  FetchType,
  IntrospectedResource,
  IntrospectionResult,
} from '../types';
import { IntrospectionObjectType } from 'graphql';
import { GET_LIST } from 'ra-core';

export type QueryResponse = {
  data: any;
  total?: number;
  pageInfo?: {
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export type BuildQuery = (introspectionResults: IntrospectionResult) => (
  aorFetchType: FetchType,
  resourceName: string,
  params: any
) => {
  query: any;
  variables: any;
  parseResponse: ({ data }: any) => QueryResponse;
};

export type BuildQueryFactory = (
  buildVariablesImpl: any,
  buildGqlQueryImpl: BuildGqlQueryFactory,
  getResponseParserImpl: GetResponseParser
) => BuildQuery;

const getLocationNearToQuery = (introspectionResults: IntrospectionResult) => {
  const locations = introspectionResults.resources.find(
    (r) => r.type.name === 'locations'
  );
  if (!locations) return null;
  const location_near_to_queries = introspectionResults.queries.find(
    (r) => r.name === 'locations_near_to'
  ) as IntrospectionObjectType;
  if (!location_near_to_queries) return null;
  if (typeof locations === 'string') return null;
  const locations_deep_copy = JSON.parse(
    JSON.stringify(locations)
  ) as IntrospectedResource;
  const location_near_to: IntrospectedResource = {
    ...locations_deep_copy,
    type: { ...locations_deep_copy.type, name: 'locations_near_to' },
    GET_LIST: {
      ...locations_deep_copy.GET_LIST,
      ...location_near_to_queries,
    },
  };
  return location_near_to;
};

export const buildQueryFactory: BuildQueryFactory =
  (buildVariablesImpl, buildGqlQueryImpl, getResponseParserImpl) =>
  (introspectionResults) => {
    const knownResources = introspectionResults.resources.map(
      (r) => r.type.name
    );

    const location_near_to = getLocationNearToQuery(introspectionResults);

    return (aorFetchType, resourceName, params) => {
      const nearResource =
        aorFetchType === GET_LIST && resourceName === 'locations_near_to'
          ? location_near_to
          : null;
      const resource =
        nearResource ||
        introspectionResults.resources.find(
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

export default buildQueryFactory(
  buildVariables,
  buildGqlQuery,
  getResponseParser
);
