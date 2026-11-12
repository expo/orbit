import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Row, Text } from '../components';
import { useTheme } from '../providers/ThemeProvider';

export const SECTION_HEADER_HEIGHT = 20;

type Props = {
  label: string;
  /** Shows directly after the label. */
  accessoryLeft?: React.ReactNode;
  accessoryRight?: React.ReactNode;
  testID?: string;
};

const SectionHeader = ({ accessoryLeft, accessoryRight, label }: Props) => {
  const theme = useTheme();

  return (
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
      </Row>
    </Row>
  );
};

export default memo(SectionHeader);

const styles = StyleSheet.create({
  row: { height: SECTION_HEADER_HEIGHT },
});
