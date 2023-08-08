import {Text} from './Text';
import React from 'react';
import {StyleSheet} from 'react-native';

type Props = {
  icon: string;
  size?: 'md';
};

export function SFIcon({icon, size = 'md'}: Props) {
  return <Text style={[styles.icon, getSizing(size)]}>{icon}</Text>;
}

function getSizing(size: Props['size']) {
  switch (size) {
    case 'md':
    default:
      return {
        fontSize: 15,
        minWidth: 18,
      };
  }
}

const styles = StyleSheet.create({
  icon: {textAlign: 'center'},
});
