import {
  Checkmark16Regular,
  Copy16Regular,
  Delete16Regular,
  DocumentText20Regular,
  Search16Regular,
} from '@fluentui/react-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import DebugLogRow from './DebugLogRow';
import { Icon, RoundButton, formatTime, useCopied, useDebugColors } from './ui';
import { Log } from '../../modules/Logs';
import MenuBarModule from '../../modules/MenuBarModule';
import { PlatformColor } from '../../modules/PlatformColor';
import { Text } from '../Text';
import { Row, View } from '../View';

const noFocusRing = { enableFocusRing: false } as object;

export const DebugLogs = () => {
  const colors = useDebugColors();
  const [logs, setLogs] = useState(() => MenuBarModule.logs.get());
  const [query, setQuery] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [copiedAll, copy] = useCopied();

  useEffect(() => MenuBarModule.logs.subscribe(() => setLogs(MenuBarModule.logs.get())), []);

  const errorCount = logs.filter((log) => log.level === 'error').length;
  const search = query.trim().toLowerCase();
  const shown = logs.filter(
    (log) =>
      (!errorsOnly || log.level === 'error') &&
      (!search || `${log.command} ${log.info}`.toLowerCase().includes(search))
  );

  // Follow new logs while the list is at the bottom; scrolling up stops it until you scroll back.
  const listRef = useRef<FlatList<Log>>(null);
  const isAtBottom = useRef(true);
  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    isAtBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
  };

  const renderItem = useCallback(({ item }: { item: Log }) => <DebugLogRow log={item} />, []);

  return (
    <View style={styles.column}>
      <Row align="center" gap="2">
        <Row
          align="center"
          style={[
            styles.search,
            { backgroundColor: colors.field, borderColor: colors.fieldBorder },
          ]}>
          <Icon
            name="magnifyingglass"
            fallback={<Search16Regular />}
            size={13}
            style={styles.searchIcon}
          />
          <TextInput
            {...noFocusRing}
            accessibilityLabel="Filter logs"
            value={query}
            onChangeText={setQuery}
            placeholder="Filter by command or message"
            placeholderTextColor={PlatformColor('placeholderTextColor')}
            style={[styles.searchInput, { color: PlatformColor('labelColor') }]}
          />
        </Row>
        <Row style={[styles.segments, { backgroundColor: colors.track }]}>
          {[false, true].map((isErrors) => {
            const isSelected = errorsOnly === isErrors;
            return (
              <Pressable
                key={String(isErrors)}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setErrorsOnly(isErrors)}
                style={[
                  styles.segment,
                  isSelected && {
                    backgroundColor: colors.button,
                    borderColor: colors.buttonBorder,
                  },
                ]}>
                <Text style={styles.segmentLabel}>{isErrors ? 'Errors' : 'All'}</Text>
                {isErrors && errorCount > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.badgeLabel}>{errorCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </Row>
        <RoundButton
          label="Copy all logs"
          onPress={() =>
            copy(logs.map((log) => `${formatTime(log.time)} ${log.command} ${log.info}`).join('\n'))
          }
          icon={
            copiedAll ? (
              <Icon name="checkmark" fallback={<Checkmark16Regular />} />
            ) : (
              <Icon name="doc.on.doc" fallback={<Copy16Regular />} />
            )
          }
        />
        <RoundButton
          label="Clear logs"
          onPress={() => MenuBarModule.logs.clear()}
          icon={<Icon name="trash" fallback={<Delete16Regular />} />}
        />
      </Row>
      <FlatList
        ref={listRef}
        data={shown}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (isAtBottom.current) listRef.current?.scrollToEnd({ animated: false });
        }}
        style={[styles.list, { backgroundColor: colors.group, borderColor: colors.groupBorder }]}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <View align="centered" gap="1.5" style={styles.empty}>
            <Icon
              name="text.page"
              fallback={<DocumentText20Regular />}
              size={22}
              style={styles.emptyIcon}
            />
            <Text color="secondary" style={styles.small}>
              {logs.length === 0 ? 'No log entries yet' : 'No entries match this filter'}
            </Text>
          </View>
        }
        // Entries saved by older builds (Electron keeps them in localStorage) have no id.
        keyExtractor={(log, index) => log.id ?? String(index)}
        renderItem={renderItem}
      />
      <Text color="secondary" style={styles.footer}>
        {`${shown.length} of ${logs.length} entries · ${errorCount} error${errorCount === 1 ? '' : 's'}`}
      </Text>
    </View>
  );
};

const Separator = () => {
  const colors = useDebugColors();
  return <View style={[styles.separator, { backgroundColor: colors.separator }]} />;
};

const styles = StyleSheet.create({
  column: {
    flex: 1,
    minWidth: 0,
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 16,
  },
  search: {
    flex: 1,
    height: 28,
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: {
    opacity: 0.55,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  segments: {
    height: 28,
    padding: 2,
    borderRadius: 9,
  },
  segment: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    marginHorizontal: 12,
  },
  empty: {
    flex: 1,
    padding: 40,
  },
  emptyIcon: {
    opacity: 0.4,
  },
  small: {
    fontSize: 13,
  },
  footer: {
    fontSize: 11,
    paddingHorizontal: 4,
  },
});
