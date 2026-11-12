import type { CodegenConfig } from '@graphql-codegen/cli';
import { Config } from 'common-types';

const config: CodegenConfig = {
  overwrite: true,
  schema: `${Config.api.origin}/graphql`,
  documents: './src/graphql/**/*.gql',
  generates: {
    './src/graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
      // Only the enums and inputs the documents use. The full schema no longer compiles:
      // `AppObserve.navigationRoutes` and `AppObserveNavigation.routes` generate the same
      // `AppObserveNavigationRoutesArgs` name.
      config: { onlyOperationTypes: true },
    },
  },
};

export default config;
