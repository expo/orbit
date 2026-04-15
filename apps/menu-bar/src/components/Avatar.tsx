import { UserIcon, iconSize } from '@expo/styleguide-native';
import React from 'react';

import { Image } from './Image';
import { View } from './View';
import { scale } from '../utils/theme';

type Props = {
  profileImageUrl?: string | null;
  size?: React.ComponentProps<typeof Image>['size'];
};

export function Avatar({ profileImageUrl, size = 'large' }: Props) {
  const viewSize = getViewSize(size);

  if (!profileImageUrl) {
    return (
      <View
        style={{ height: viewSize, width: viewSize }}
        rounded="full"
        align="centered"
        bg="secondary">
        <UserIcon height={viewSize * 0.6} width={viewSize * 0.6} />
      </View>
    );
  }

  return (
    <View rounded="full" bg="secondary">
      <Image
        rounded="full"
        source={{
          uri: profileImageUrl,
        }}
        size={size}
      />
    </View>
  );
}

function getViewSize(size?: React.ComponentProps<typeof Image>['size']) {
  switch (size) {
    case 'tiny':
      return scale.small;
    case 'small':
      return iconSize.small;
    case 'large':
      return scale['12'];
    case 'xl':
      return scale['20'];
    default:
      return scale['12'];
  }
}
