import { TouchableOpacity, StyleSheet } from 'react-native';

import SectionHeader from './SectionHeader';
import AlertIcon from '../assets/icons/AlertTriangle';
import { Row, Text } from '../components';
import { View } from '../components/View';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Props = {
  label: string;
  errorMessage?: string;
  onPressAdd?: () => void;
};

const DeviceListSectionHeader = ({ label, errorMessage, onPressAdd }: Props) => {
  const theme = useCurrentTheme();
  const iconOpacity = theme === 'dark' ? 0.65 : 0.85;

  return (
    <View>
      <SectionHeader
        label={label}
        accessoryRight={
          errorMessage || onPressAdd ? (
            <Row align="center" gap="2">
              {errorMessage ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => Alert.alert('Something went wrong', errorMessage)}>
                  <AlertIcon
                    height={15}
                    width={15}
                    fill={PlatformColor('labelColor')}
                    style={{ opacity: iconOpacity }}
                  />
                </TouchableOpacity>
              ) : null}
              {onPressAdd ? (
                <TouchableOpacity style={styles.button} onPress={onPressAdd}>
                  <Text size="medium" style={{ opacity: iconOpacity, lineHeight: 16 }}>
                    +
                  </Text>
                </TouchableOpacity>
              ) : null}
            </Row>
          ) : null
        }
      />
    </View>
  );
};

export default DeviceListSectionHeader;

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
