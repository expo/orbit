import { TouchableOpacity, StyleSheet } from 'react-native';

import SectionHeader from './SectionHeader';
import SectionHeaderMenu from './SectionHeaderMenu';
import AlertIcon from '../assets/icons/AlertTriangle';
import { Row } from '../components';
import { View } from '../components/View';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Props = {
  label: string;
  errorMessage?: string;
  /** The name of the default device of the section. It shows after the label and opens a menu. */
  defaultLabel?: string;
  onPressDefault?: () => void;
  /** Hides the section. */
  onPressHide?: () => void;
};

const DeviceListSectionHeader = ({
  label,
  errorMessage,
  defaultLabel,
  onPressDefault,
  onPressHide,
}: Props) => {
  const theme = useCurrentTheme();
  const iconOpacity = theme === 'dark' ? 0.65 : 0.85;

  return (
    <View>
      <SectionHeader
        label={label}
        onPressHide={onPressHide}
        accessoryLeft={
          onPressDefault ? (
            <SectionHeaderMenu
              label={defaultLabel ?? 'No default device'}
              onPress={onPressDefault}
              testID="section-default-device"
            />
          ) : null
        }
        accessoryRight={
          errorMessage ? (
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
