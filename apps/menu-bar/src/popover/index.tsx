import React, { useEffect } from 'react';

import Core from './Core';
import { ErrorBoundary, FallbackProps } from './ErrorBoundary';
import Footer from './Footer';
import { Text, View } from '../components';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import MenuBarModule from '../modules/MenuBarModule';
import { storage } from '../modules/Storage';
import { useListDevices } from '../providers/DevicesProvider';
import { WindowsNavigator } from '../windows';
import { hasSeenOnboardingStorageKey } from '../windows/Onboarding';

type Props = {
  isDevWindow: boolean;
};

function Popover(props: Props) {
  const { height } = useSafeDisplayDimensions();
  const { hasInitialized } = useListDevices();

  useEffect(() => {
    const hasSeenOnboarding = storage.getBoolean(hasSeenOnboardingStorageKey);
    if (!hasSeenOnboarding) {
      WindowsNavigator.open('Onboarding');
    }
  }, []);

  useEffect(() => {
    if (hasInitialized && storage.getBoolean(hasSeenOnboardingStorageKey)) {
      MenuBarModule.openPopover();
    }
  }, [hasInitialized]);

  if (!hasInitialized) {
    return null;
  }

  return (
    <View
      style={{
        /**
         * Need to check dimensions of the screen on render time as the Popover
         * can be opened from different displays.
         */
        maxHeight: height,
      }}>
      <ErrorBoundary fallback={Fallback}>
        <Core isDevWindow={props.isDevWindow} />
      </ErrorBoundary>
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
