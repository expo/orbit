import {
  Checkmark12Regular,
  ChevronDown12Regular,
  ChevronRight12Regular,
  Copy16Regular,
} from '@fluentui/react-icons';
import { memo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { HoverPressable, Icon, RoundButton, formatTime, useCopied, useDebugColors } from './ui';
import { Log } from '../../modules/Logs';
import { Text } from '../Text';
import { View } from '../View';

// Advance width of one character of the 11.5pt monospaced detail font (Menlo is 0.6em).
const MONO_CHAR_WIDTH = 6.9;

function formatDetail(info: string) {
  try {
    return { text: JSON.stringify(JSON.parse(info), null, 2), isJson: true };
  } catch {
    return { text: info, isJson: false };
  }
}

// One line of JSON.stringify output: a string (a key when a colon follows), a number, or a keyword.
const JSON_TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function highlightJson(line: string, colors: ReturnType<typeof useDebugColors>) {
  const parts: React.ReactNode[] = [];
  let end = 0;
  for (const match of line.matchAll(JSON_TOKEN)) {
    const [token, string, colon, number] = match;
    const color = colon
      ? colors.jsonKey
      : string
        ? colors.jsonString
        : number
          ? colors.jsonNumber
          : colors.jsonKeyword;
    parts.push(
      line.slice(end, match.index),
      <Text key={match.index} style={{ color }}>
        {string ?? token}
      </Text>,
      colon ?? ''
    );
    end = match.index + token.length;
  }
  parts.push(line.slice(end));
  return parts;
}

const DebugLogRow = ({ log }: { log: Log }) => {
  const colors = useDebugColors();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, copy] = useCopied();
  const isError = log.level === 'error';
  const dotColor = isError ? colors.danger : log.level === 'info' ? colors.accent : colors.success;
  const detail = isOpen ? formatDetail(log.info) : null;

  return (
    <View style={isError && { backgroundColor: colors.errorRow }}>
      <HoverPressable
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((prev) => !prev)}
        disabled={!log.info}
        style={styles.header}
        hoverStyle={{ backgroundColor: colors.hover }}>
        <Icon
          name={isOpen ? 'chevron.down' : 'chevron.right'}
          fallback={isOpen ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
          size={12}
          style={styles.chevron}
        />
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text type="mono" color="secondary" style={styles.mono}>
          {formatTime(log.time)}
        </Text>
        <View style={[styles.command, { backgroundColor: colors.track }]}>
          <Text type="mono" style={styles.mono} numberOfLines={1}>
            {log.command}
          </Text>
        </View>
        <Text style={[styles.summary, isError && { color: colors.danger }]} numberOfLines={1}>
          {/* The row shows just one line; skip laying out the full multi-KB output */}
          {log.info?.slice(0, 300)}
        </Text>
      </HoverPressable>
      {detail ? (
        <View style={styles.detail}>
          <ScrollView
            style={[styles.code, { backgroundColor: colors.code, borderColor: colors.fieldBorder }]}
            contentContainerStyle={styles.codeContent}>
            {detail.text.split('\n').map((line, index) => {
              // Indent each line as a block, so a wrapped value stays at its nesting level.
              const content = line.trimStart();
              const indent = (line.length - content.length) * MONO_CHAR_WIDTH;
              return (
                <Text
                  key={index}
                  type="mono"
                  selectable
                  style={[styles.codeText, { marginLeft: indent }]}>
                  {detail.isJson ? highlightJson(content, colors) : content || ' '}
                </Text>
              );
            })}
          </ScrollView>
          <RoundButton
            label="Copy entry"
            size={24}
            style={styles.copy}
            onPress={() => copy(log.info)}
            icon={
              copied ? (
                <Icon name="checkmark" fallback={<Checkmark12Regular />} size={12} />
              ) : (
                <Icon name="doc.on.doc" fallback={<Copy16Regular />} size={12} />
              )
            }
          />
        </View>
      ) : null}
    </View>
  );
};

export default memo(DebugLogRow);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  chevron: {
    opacity: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mono: {
    fontSize: 11,
    lineHeight: 14,
  },
  command: {
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  summary: {
    flex: 1,
    fontSize: 13,
  },
  detail: {
    marginLeft: 42,
    marginRight: 12,
    marginBottom: 12,
  },
  code: {
    maxHeight: 200,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeContent: {
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 40,
  },
  codeText: {
    fontSize: 11.5,
    lineHeight: 18,
  },
  copy: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});
