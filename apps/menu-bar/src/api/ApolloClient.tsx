import {
  ApolloClient,
  ApolloLink,
  FieldFunctionOptions,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  concat,
  ApolloProvider,
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

export const useApolloClient = () => {
  const [sessionSecret, setSessionSecret] = useState(storage.getString('sessionSecret'));
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

  useEffect(() => {
    const listener = storage.addOnValueChangedListener((changedKey) => {
      if (changedKey === 'sessionSecret') {
        setSessionSecret(storage.getString('sessionSecret'));
      }
    });

    return () => {
      listener.remove();
    };
  });

  return {
    client,
  };
};

export function withApolloProvider<P extends object>(Component: React.ComponentType<P>) {
  return (props: P) => {
    const { client } = useApolloClient();

    if (!client) {
      return null;
    }

    return (
      <ApolloProvider client={client}>
        <Component {...props} />
      </ApolloProvider>
    );
  };
}
