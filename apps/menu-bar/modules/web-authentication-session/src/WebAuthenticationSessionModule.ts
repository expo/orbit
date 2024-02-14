import { requireNativeModule } from 'expo-modules-core';

import { WebAuthenticationSessionModuleType } from './WebAuthenticationSession.types';

export default requireNativeModule<WebAuthenticationSessionModuleType>('WebAuthenticationSession');
