import { useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { Text } from '../Text';
import { View } from '../View';

export const ObjectInspector = ({ obj, name }: { obj: any; name?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isObject = typeof obj === 'object';
  const isArray = Array.isArray(obj);

  return (
    <TouchableOpacity onPress={() => setIsOpen((prev) => !prev)}>
      <View
        style={{
          flexDirection: 'row',
          paddingVertical: 5,
          flex: 1,
        }}>
        {isObject ? (
          <Text>
            {isOpen ? '▼' : '▶'} {name ? `${name}: ` : ''}
          </Text>
        ) : (
          <Text>
            {name ? `${name}: ` : ''}
            {String(obj)}
          </Text>
        )}
        {isObject && !isOpen ? (
          <Text style={{ opacity: 0.6, marginLeft: 6 }} numberOfLines={1}>
            {JSON.stringify(obj)}
          </Text>
        ) : null}
      </View>
      {isObject && isOpen ? (
        <View style={{ marginLeft: 10 }}>
          {Object.keys(obj).map((key) => (
            <ObjectInspector obj={obj[key]} name={isArray ? `[${key}]` : key} />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};
