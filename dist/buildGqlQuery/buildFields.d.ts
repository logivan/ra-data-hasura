import { IntrospectionObjectType, FieldNode } from 'graphql';
import { FetchType, IntrospectionResult } from '../types';
export type BuildFields = (
  type: IntrospectionObjectType,
  aorFetchType?: FetchType,
  introspectionResult?: IntrospectionResult
) => FieldNode[];
export declare const buildFields: BuildFields;
//# sourceMappingURL=buildFields.d.ts.map
