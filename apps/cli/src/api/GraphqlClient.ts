import { GraphQLClient } from 'graphql-request';
import { Config } from 'common-types';

import { getSdk } from '../graphql/generated/graphql';
import { getSessionSecret } from '../storage';

const endpoint = `${Config.api.origin}/graphql`;
const sessionSecret = getSessionSecret();

const client = new GraphQLClient(endpoint, {
  headers: sessionSecret
    ? {
        'expo-session': sessionSecret,
      }
    : undefined,
});

export const graphqlSdk = getSdk(client);
