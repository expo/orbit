import React, { memo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import SectionVisibilityButton from './SectionVisibilityButton';
import { Row, Text } from '../components';
import { useTheme } from '../providers/ThemeProvider';

export const SECTION_HEADER_HEIGHT = 20;

type Props = {
  label: string;
  /** Shows directly after the label. */
  accessoryLeft?: React.ReactNode;
  accessoryRight?: React.ReactNode;
  /** Hides the section. The control shows only while the pointer is on the header. */
  onPressHide?: () => void;
  testID?: string;
};

const SectionHeader = ({ accessoryLeft, accessoryRight, label, onPressHide, testID }: Props) => {
  const theme = useTheme();
  const [isHovered, setHovered] = useState(false);

  return (
    <Pressable onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
      <Row px="medium" justify="between" style={styles.row}>
        <Row align="center" gap="1.5" shrink="1">
          <Text
            weight="semibold"
            size="tiny"
            color="default"
            style={{ opacity: theme === 'dark' ? 0.65 : 0.85 }}>
            {label}
          </Text>
          {accessoryLeft ? accessoryLeft : null}
        </Row>
        <Row align="center" gap="2">
          {accessoryRight ? accessoryRight : null}
          {onPressHide && isHovered ? (
            <SectionVisibilityButton onPress={onPressHide} testID={`hide-section-${label}`} />
          ) : null}
        </Row>
      </Row>
    </Pressable>
  );
};

export default memo(SectionHeader);

const styles = StyleSheet.create({
  row: { height: SECTION_HEADER_HEIGHT },
});
