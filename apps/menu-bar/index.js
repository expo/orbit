/**
 * @format
 */

import { registerRootComponent } from 'expo';
import 'react-native-url-polyfill/auto';

import App from './src/App';
import './src/windows';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in the Expo client or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
