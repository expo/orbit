import React from 'react';
import {StyleSheet, Dimensions} from 'react-native';

import {Text, View} from '../components';
import Footer from './Footer';
import Header from './Header';
import Core from './Core';
import {ErrorBoundary, FallbackProps} from './ErrorBoundary';

type Props = {
  isDevWindow: boolean;
};

function Popover(props: Props) {
  return (
    <View style={styles.container}>
      <Header />
      <ErrorBoundary fallback={Fallback}>
        <Core isDevWindow={props.isDevWindow} />
      </ErrorBoundary>
      <Footer />
    </View>
  );
}

export default Popover;

const Fallback = ({error}: FallbackProps) => {
  return (
    <View px="medium" pb="small" gap="2">
      <Text weight="medium">Something went wrong, please restart the app</Text>
      <Text color="secondary">Error message: {error?.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: Dimensions.get('screen').height * 0.85,
  },
});
