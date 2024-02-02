import type { CodegenConfig } from '@graphql-codegen/cli';
import { Config } from 'common-types';

const config: CodegenConfig = {
  overwrite: true,
  schema: `${Config.api.origin}/graphql`,
  documents: './src/graphql/**/*.gql',
  generates: {
    './src/graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
    },
  },
};

export default config;
