import React, { memo } from 'react';

import { Row, Text } from '../components';
import { useTheme } from '../providers/ThemeProvider';

export const SECTION_HEADER_HEIGHT = 20;

type Props = {
  label: string;
  accessoryRight?: React.ReactNode;
};

const SectionHeader = ({ accessoryRight, label }: Props) => {
  const theme = useTheme();
  return (
    <Row px="medium" justify="between">
      <Text
        weight="semibold"
        size="tiny"
        color="default"
        style={{ opacity: theme === 'dark' ? 0.65 : 0.85 }}>
        {label}
      </Text>
      {accessoryRight ? accessoryRight : null}
    </Row>
  );
};

export default memo(SectionHeader);
