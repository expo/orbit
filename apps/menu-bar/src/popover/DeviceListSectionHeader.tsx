import { SymbolView } from 'expo-symbols';
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
  /** The name of the default device of the section. Shows a control that opens a menu. */
  defaultLabel?: string;
  onPressDefault?: () => void;
};

const DeviceListSectionHeader = ({
  label,
  errorMessage,
  onPressAdd,
  defaultLabel,
  onPressDefault,
}: Props) => {
  const theme = useCurrentTheme();
  const iconOpacity = theme === 'dark' ? 0.65 : 0.85;

  return (
    <View>
      <SectionHeader
        label={label}
        accessoryLeft={
          onPressDefault ? (
            <TouchableOpacity
              style={[
                styles.defaultButton,
                { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.1)' },
              ]}
              onPress={onPressDefault}
              testID="section-default-device">
              <Text size="tiny" style={styles.defaultCaption}>
                Default
              </Text>
              <Text size="tiny" numberOfLines={1} style={styles.defaultName}>
                {defaultLabel ?? 'None'}
              </Text>
              <SymbolView
                name="chevron.up.chevron.down"
                size={9}
                tintColor={PlatformColor('labelColor')}
                fallback={
                  <Text size="tiny" color="secondary">
                    ▾
                  </Text>
                }
              />
            </TouchableOpacity>
          ) : null
        }
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
  // A small pill. System colors, so the text stays readable when the popover material changes
  // between light and dark.
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  defaultCaption: { color: PlatformColor('labelColor'), opacity: 0.6 },
  defaultName: { maxWidth: 180, flexShrink: 1, color: PlatformColor('labelColor') },
});
