import {
  ApolloClient,
  ApolloLink,
  FieldFunctionOptions,
  HttpLink,
  InMemoryCache,
  concat,
  ApolloProvider,
} from '@apollo/client';
import { MMKVWrapper, persistCache } from 'apollo3-cache-persist';
import { Config } from 'common-types';

import possibleTypesData from '../generated/graphql.possibleTypes.json';
import { storage } from '../modules/Storage';

const httpLink = new HttpLink({
  uri: `${Config.api.origin}/graphql`,
});

const mergeBasedOnOffset = (existing: any[], incoming: any[], { args }: FieldFunctionOptions) => {
  const merged = existing ? existing.slice(0) : [];

  for (let i = 0; i < incoming.length; ++i) {
    merged[i + (args?.offset || 0)] = incoming[i];
  }
  return merged;
};

const { possibleTypes } = possibleTypesData;
const cache = new InMemoryCache({
  possibleTypes,
  typePolicies: {
    AppQuery: {
      keyFields: ['byId', ['id']],
    },
    AccountQuery: {
      keyFields: ['byId', ['id']],
    },
    Account: {
      fields: {
        apps: {
          keyArgs: ['limit'],
          merge: mergeBasedOnOffset,
        },
      },
    },
    App: {
      keyFields: ['id'],
      fields: {
        builds: {
          keyArgs: ['limit', 'platform'],
          merge: mergeBasedOnOffset,
        },
      },
    },
  },
});

const authMiddlewareLink = new ApolloLink((operation, forward) => {
  const sessionSecret = storage.getString('sessionSecret');
  if (sessionSecret) {
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        'expo-session': sessionSecret,
      },
    }));
  }

  return forward(operation);
});

async function init() {
  await persistCache({
    cache,
    storage: new MMKVWrapper(storage),
    key: 'apollo-cache-persist',
  });
}
init();

export const apolloClient = new ApolloClient({
  link: concat(authMiddlewareLink, httpLink),
  cache,
});

export function withApolloProvider<P extends object>(Component: React.ComponentType<P>) {
  return (props: P) => {
    return (
      <ApolloProvider client={apolloClient}>
        <Component {...props} />
      </ApolloProvider>
    );
  };
}
