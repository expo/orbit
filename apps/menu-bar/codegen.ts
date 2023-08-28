import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://exp.host/--/graphql',
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
  },
};

export default config;
