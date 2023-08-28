import { ApolloProvider } from '@apollo/client';
import React from 'react';

import Core from './Core';
import { ErrorBoundary, FallbackProps } from './ErrorBoundary';
import Footer from './Footer';
import { useApolloClient } from '../api/ApolloClient';
import { Text, View } from '../components';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import { storage } from '../modules/Storage';

type Props = {
  isDevWindow: boolean;
};

function Popover(props: Props) {
  const { height } = useSafeDisplayDimensions();
  const sessionSecret = storage.getString('sessionSecret');
  const { client } = useApolloClient({ sessionSecret });

  if (!client) return null;

  return (
    <View
      style={{
        /**
         * Need to check dimensions of the screen on render time as the Popover
         * can be opened from different displays.
         */
        maxHeight: height,
      }}>
      <ApolloProvider client={client}>
        <ErrorBoundary fallback={Fallback}>
          <Core isDevWindow={props.isDevWindow} />
        </ErrorBoundary>
      </ApolloProvider>
      <Footer />
    </View>
  );
}

export default Popover;

const Fallback = ({ error }: FallbackProps) => {
  return (
    <View px="medium" pb="small" gap="2">
      <Text weight="medium">Something went wrong, please restart the app</Text>
      <Text color="secondary">Error message: {error?.message}</Text>
    </View>
  );
};
