import React, { memo } from 'react';

import { Text, View } from '../components';
import { useTheme } from '../providers/ThemeProvider';

export const SECTION_HEADER_HEIGHT = 20;

type Props = {
  label: string;
};

const SectionHeader = ({ label }: Props) => {
  const theme = useTheme();
  return (
    <View px="medium">
      <Text
        weight="semibold"
        size="tiny"
        color="default"
        style={{ opacity: theme === 'dark' ? 0.65 : 0.85 }}>
        {label}
      </Text>
    </View>
  );
};

export default memo(SectionHeader);
