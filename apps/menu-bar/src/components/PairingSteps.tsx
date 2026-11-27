import { lightTheme } from '@expo/styleguide-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import Button from './Button';
import { Text } from './Text';
import { Row, Spacer, View } from './View';
import { addOpacity } from '../utils/theme';

export const NumberedStep = ({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) => (
  <Row gap="2" align="start">
    <View rounded="large" align="centered" style={styles.stepBadge}>
      <Text size="tiny" weight="semibold" color="secondary">
        {number}
      </Text>
    </View>
    <Text size="tiny" color="secondary" style={styles.flex}>
      {children}
    </Text>
  </Row>
);

export const SuccessState = ({
  deviceName,
  onDone,
}: {
  deviceName: string;
  onDone: () => void;
}) => (
  <View align="centered" pt="2" gap="1">
    <StatusBadge glyph="✓" color={lightTheme.text.success} />
    <Spacer.Vertical size="tiny" />
    <Text size="medium" weight="semibold">
      Device paired
    </Text>
    <Text size="tiny" color="secondary" align="center" style={styles.stateSubtitle}>
      {deviceName} is now available in your device list.
    </Text>
    <Button title="Done" color="primary" onPress={onDone} style={[styles.wideButton, styles.mt3]} />
  </View>
);

export const StatusBadge = ({ glyph, color }: { glyph: string; color: string }) => (
  <View align="centered" style={[styles.statusBadge, { backgroundColor: addOpacity(color, 0.14) }]}>
    <Text style={{ color, fontSize: 28, lineHeight: 32 }}>{glyph}</Text>
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  wideButton: {
    alignSelf: 'stretch',
    height: 36,
  },
  mt3: {
    marginTop: 12,
  },
  stepBadge: {
    width: 18,
    height: 18,
    backgroundColor: addOpacity(lightTheme.text.default, 0.07),
  },
  statusBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  stateSubtitle: {
    lineHeight: 16,
    maxWidth: 280,
  },
});
