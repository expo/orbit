import type { CodegenConfig } from '@graphql-codegen/cli';
import { Config } from 'common-types';

const config: CodegenConfig = {
  overwrite: true,
  schema: `${Config.api.origin}/graphql`,
  documents: './src/graphql/**/*.gql',
  generates: {
    './src/generated/graphql.tsx': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        skipTypename: false,
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
    './src/generated/schema.graphql': {
      plugins: ['schema-ast'],
    },
    './src/generated/graphql.possibleTypes.json': {
      plugins: ['fragment-matcher'],
    },
  },
};

export default config;
