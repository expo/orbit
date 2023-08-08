import React, {memo} from 'react';

import {Text} from '../components';
import {useTheme} from '../providers/ThemeProvider';

type Props = {
  label: string;
};

const SectionHeader = ({label}: Props) => {
  const theme = useTheme();
  return (
    <Text
      weight="semibold"
      size="tiny"
      color="default"
      // @ts-ignore
      // eslint-disable-next-line react-native/no-inline-styles
      style={{opacity: theme === 'dark' ? 0.65 : 0.85}}>
      {label}
    </Text>
  );
};

export default memo(SectionHeader);
