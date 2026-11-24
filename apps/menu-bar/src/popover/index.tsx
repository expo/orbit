import React, { useEffect, useState } from 'react';

import Core from './Core';
import { ErrorBoundary, FallbackProps } from './ErrorBoundary';
import Footer from './Footer';
import { Text, View } from '../components';
import { useSafeDisplayDimensions } from '../hooks/useSafeDisplayDimensions';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import { storage } from '../modules/Storage';
import { useListDevices } from '../providers/DevicesProvider';
import { ONBOARDING_COMPLETED_EVENT, hasSeenOnboardingStorageKey } from '../utils/onboarding';
import { WindowsNavigator } from '../windows';

type Props = {
  isDevWindow: boolean;
};

function Popover(props: Props) {
  const { height } = useSafeDisplayDimensions();
  const { hasInitialized } = useListDevices();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    () => !!storage.getBoolean(hasSeenOnboardingStorageKey)
  );

  useEffect(() => {
    if (hasSeenOnboarding) {
      return;
    }
    WindowsNavigator.open('Onboarding');
    const listener = DeviceEventEmitter.addListener(ONBOARDING_COMPLETED_EVENT, () =>
      setHasSeenOnboarding(true)
    );
    return () => listener.remove();
  }, [hasSeenOnboarding]);

  useEffect(() => {
    if (hasInitialized && hasSeenOnboarding) {
      MenuBarModule.openPopover();
    }
  }, [hasInitialized, hasSeenOnboarding]);

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
      <Footer isDevWindow={props.isDevWindow} />
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
