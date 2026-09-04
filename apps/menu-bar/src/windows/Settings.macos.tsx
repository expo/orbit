import {
  Button as SwiftUIButton,
  Group,
  HStack,
  Host,
  Label,
  List,
  NavigationSplitView,
  RNHostView,
  Spacer,
  Text as SwiftUIText,
  VStack,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  ignoreSafeArea,
  labelStyle,
  listStyle,
  navigationSplitViewColumnWidth,
  padding,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { Pane, SettingsPane, panes, useSettingsPane } from './SettingsPanes';
import { WindowsNavigator } from './index';
import { withApolloProvider } from '../api/ApolloClient';
import MenuBarModule from '../modules/MenuBarModule';

// macOS uses a native SwiftUI sidebar. Settings.tsx is the JS fallback used by Electron.
const Settings = () => {
  const [pane, setPane] = useSettingsPane();

  return (
    <Host style={styles.host}>
      <NavigationSplitView columnVisibility="all">
        <NavigationSplitView.Sidebar>
          <VStack spacing={0} modifiers={[navigationSplitViewColumnWidth(200)]}>
            <List
              selection={[pane]}
              onSelectionChange={([selected]) => selected && setPane(selected as Pane)}
              modifiers={[listStyle('sidebar')]}>
              {panes.map(({ key, label, symbol }) => (
                <Label key={key} title={label} systemImage={symbol} modifiers={[tag(key)]} />
              ))}
            </List>
            <HStack modifiers={[padding({ horizontal: 16, bottom: 12 })]}>
              <SwiftUIText
                modifiers={[
                  font({ size: 11, design: 'monospaced' }),
                  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                ]}>
                {`Expo Orbit ${MenuBarModule.appVersion}`}
              </SwiftUIText>
              <Spacer />
              <SwiftUIButton
                label="Debug"
                systemImage="ladybug"
                onPress={() => WindowsNavigator.open('DebugMenu')}
                modifiers={[labelStyle('iconOnly'), buttonStyle('borderless')]}
              />
            </HStack>
          </VStack>
        </NavigationSplitView.Sidebar>
        <NavigationSplitView.Detail>
          {/* Run the pane under the toolbar so its header lines up with the traffic lights. */}
          <Group modifiers={[ignoreSafeArea({ edges: 'top' })]}>
            <RNHostView>
              <SettingsPane pane={pane} />
            </RNHostView>
          </Group>
        </NavigationSplitView.Detail>
      </NavigationSplitView>
    </Host>
  );
};

export default withApolloProvider(Settings);

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
