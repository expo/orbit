import { FlatList } from 'react-native';

import DebugLogRow from './DebugLogRow';
import MenuBarModule from '../../modules/MenuBarModule';
import { useExpoPalette } from '../../utils/useExpoTheme';
import { Text } from '../Text';
import { Row } from '../View';

export const DebugLogs = () => {
  const palette = useExpoPalette();

  return (
    <FlatList
      data={MenuBarModule.logs.get()}
      contentContainerStyle={{
        backgroundColor: palette['gray']['200'],
        borderRadius: 4,
      }}
      ListHeaderComponent={
        <Row
          flex="1"
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
          <Text style={{ marginRight: 40 }}>Command: </Text>
          <Text style={{ flex: 1 }}>Extra info:</Text>
        </Row>
      }
      keyExtractor={(log, index) => log.command + index}
      renderItem={({ item, index }) => (
        <DebugLogRow
          log={item}
          style={{
            paddingHorizontal: 10,
            backgroundColor: index % 2 === 1 ? palette['gray']['400'] : palette['gray']['200'],
          }}
        />
      )}
    />
  );
};
