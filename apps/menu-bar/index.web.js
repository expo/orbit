import registerRootComponent from 'expo/build/launch/registerRootComponent';
import { AppRegistry } from 'react-native';

import App from './src/App';
import './src/windows';

const params = new URL(document.location).searchParams;
const module = params.get('moduleName');

if (module) {
  const rootTag = document.getElementById('root');
  AppRegistry.runApplication(module, {
    rootTag,
  });
} else {
  registerRootComponent(App);
}
