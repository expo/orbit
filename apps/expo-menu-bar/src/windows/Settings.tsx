import {useState} from 'react';
import {Switch, Text, View} from 'react-native';

import MenuBarModule from '../modules/MenuBarModule';

const Settings = () => {
  const [launchOnLogin, setLaunchOnLogin] = useState(false);
  return (
    <View style={{flex: 1, padding: 10}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text>Launch on login</Text>
        <Switch value={launchOnLogin} onValueChange={setLaunchOnLogin} />
      </View>
      <View style={{marginTop: 'auto', alignItems: 'center'}}>
        <Text>
          Version: {MenuBarModule.constants.appVersion} (
          {MenuBarModule.constants.buildVersion})
        </Text>
        <Text>Copyright © 2023 650 Industries, Inc. All rights reserved.</Text>
      </View>
    </View>
  );
};

export default Settings;
