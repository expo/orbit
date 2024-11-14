import { useState } from 'react';
import { TouchableOpacity, StyleProp, ViewStyle } from 'react-native';

import { ObjectInspector } from './ObjectInspector';
import { Log } from '../../modules/Logs';
import { Text } from '../Text';
import { View, Row } from '../View';

interface Props {
  log: Log;
  style?: StyleProp<ViewStyle>;
}

const DebugLogRow = ({ log, style }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={style}>
      <TouchableOpacity onPress={() => setIsOpen((prev) => !prev)} disabled={!log.info}>
        <Row
          flex="1"
          style={{
            paddingVertical: 5,
          }}>
          <Text style={{ marginRight: 40 }}>{log.command}</Text>
          <Text style={{ flex: 1 }} numberOfLines={1}>
            {log.info}
          </Text>
        </Row>
        {isOpen ? <ExtraInfo log={log} /> : null}
      </TouchableOpacity>
    </View>
  );
};

const ExtraInfo = ({ log }: Props) => {
  let extraInfo = log.info;
  const looksLikeJSON = extraInfo?.startsWith('{') || extraInfo?.startsWith('[');

  if (looksLikeJSON) {
    try {
      extraInfo = JSON.parse(log.info);
    } catch {}
  }

  return <ObjectInspector obj={extraInfo} />;
};

export default DebugLogRow;
