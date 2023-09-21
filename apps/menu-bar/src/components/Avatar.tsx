import { UserIcon, iconSize } from '@expo/styleguide-native';
import React from 'react';

import { Image } from './Image';
import { View } from './View';
import { scale } from '../utils/theme';

type Props = {
  name?: string;
  profilePhoto?: string;
  size?: React.ComponentProps<typeof Image>['size'];
};

export function Avatar({ profilePhoto, size = 'large', name = '' }: Props) {
  const firstLetter = name?.charAt(0).toLowerCase();
  const viewSize = getViewSize(size);

  if (!profilePhoto || !firstLetter) {
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

  let _profilePhoto = profilePhoto;
  if (profilePhoto.match('gravatar.com')) {
    const defaultProfilePhoto = encodeURIComponent(
      `https://storage.googleapis.com/expo-website-default-avatars-2023/${firstLetter}.png`
    );
    _profilePhoto = `${profilePhoto}&d=${defaultProfilePhoto}`;
  }

  return (
    <View rounded="full" bg="secondary">
      <Image
        rounded="full"
        source={{
          uri: _profilePhoto,
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
