import {
  ApolloClient,
  ApolloLink,
  FieldFunctionOptions,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  concat,
} from '@apollo/client';
import { MMKVWrapper, persistCache } from 'apollo3-cache-persist';
import { useEffect, useState } from 'react';

import Config from './Config';
import { storage } from '../modules/Storage';

const httpLink = new HttpLink({
  uri: `${Config.api.origin}/--/graphql`,
});

const mergeBasedOnOffset = (existing: any[], incoming: any[], { args }: FieldFunctionOptions) => {
  const merged = existing ? existing.slice(0) : [];

  for (let i = 0; i < incoming.length; ++i) {
    merged[i + (args?.offset || 0)] = incoming[i];
  }
  return merged;
};

const cache = new InMemoryCache({
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

interface UseApolloClientParams {
  sessionSecret?: string;
}

export const useApolloClient = ({ sessionSecret }: UseApolloClientParams) => {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject>>();

  useEffect(() => {
    async function init() {
      await persistCache({
        cache,
        storage: new MMKVWrapper(storage),
        key: 'apollo-cache-persist',
      });

      const authMiddlewareLink = new ApolloLink((operation, forward) => {
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

      setClient(
        new ApolloClient({
          link: concat(authMiddlewareLink, httpLink),
          cache,
        })
      );
    }

    init();
  }, [sessionSecret]);

  return {
    client,
  };
};
