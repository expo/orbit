import { Bug16Regular, Checkmark12Regular, Copy16Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { clearAppleIdLoginAsync } from '../commands/appleAccountAsync';
import { View, Row, Text } from '../components';
import { DebugLogs } from '../components/DebugLogs';
import { HoverPressable, Icon, useCopied, useDebugColors } from '../components/DebugLogs/ui';
import NativeColorPalette from '../components/NativeColorPalette';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import {
  RESIGNED_APPS_CHECK_REQUEST_EVENT,
  listResignedApps,
  updateResignedApp,
} from '../modules/ResignedApps';
import { resetApolloStore, resetStorage } from '../modules/Storage';

type Action = {
  label: string;
  description: string;
  button: string;
  // The command name the result is logged under.
  command: string;
  // Asks for a second press before it runs.
  danger?: boolean;
  // Returns the message to log.
  run: () => string | Promise<string>;
};

const actionGroups: { title: string; actions: Action[] }[] = [
  {
    title: 'Storage',
    actions: [
      {
        label: 'Reset MMKV storage',
        description: 'Clears saved preferences and cached state.',
        button: 'Reset',
        command: 'reset-mmkv',
        run: () => {
          resetStorage();
          return 'MMKV storage reset.';
        },
      },
      {
        label: 'Clear Apollo store',
        description: 'Drops cached GraphQL responses.',
        button: 'Clear',
        command: 'clear-apollo-store',
        run: () => {
          resetApolloStore();
          return 'Apollo store cleared.';
        },
      },
    ],
  },
  {
    title: 'Apple ID',
    actions: [
      {
        label: 'Sign out of Apple ID',
        description: 'Removes the stored signing session.',
        button: 'Sign out',
        command: 'apple-sign-out',
        run: async () => {
          const appleId = await clearAppleIdLoginAsync();
          return appleId
            ? `Signed out ${appleId}. The next resign will ask you to sign in again.`
            : 'No Apple ID was signed in.';
        },
      },
    ],
  },
  {
    title: 'Resigned apps',
    actions: [
      {
        label: 'Force renewal check',
        description: 'Runs the auto-renew job now.',
        button: 'Run',
        command: 'renewal-check',
        run: () => {
          DeviceEventEmitter.emit(RESIGNED_APPS_CHECK_REQUEST_EVENT);
          return 'Renewal check started.';
        },
      },
      {
        label: 'Expire resigned apps now',
        description: 'Marks all resigned apps as expired to test renewal.',
        button: 'Expire',
        danger: true,
        command: 'expire-resigned-apps',
        run: () => {
          const expired = new Date(Date.now() - 1000).toISOString();
          for (const record of listResignedApps()) {
            updateResignedApp(record.id, { profileExpiresAt: expired, lastAttemptAt: undefined });
          }
          return 'All resigned apps marked as expired. Run a renewal check to watch them renew.';
        },
      },
    ],
  },
];

const versionInfo = `Expo Orbit ${MenuBarModule.appVersion} (${MenuBarModule.buildVersion})`;

const DebugMenu = () => {
  const colors = useDebugColors();
  const [copied, copy] = useCopied();
  const [copiedColor, copyColor] = useCopied();

  return (
    <View flex="1" style={{ backgroundColor: colors.window }}>
      <Row align="center" style={styles.header}>
        <Text style={styles.title}>Debug Menu</Text>
        <View flex="1" />
        <HoverPressable
          accessibilityLabel="Copy version info"
          onPress={() => copy(versionInfo)}
          style={[
            styles.version,
            { backgroundColor: colors.button, borderColor: colors.buttonBorder },
          ]}
          hoverStyle={{ backgroundColor: colors.buttonHover }}>
          <Text style={styles.versionText}>{`Expo Orbit ${MenuBarModule.appVersion}`}</Text>
          <Text color="secondary" style={styles.versionText}>
            {`Build ${MenuBarModule.buildVersion}`}
          </Text>
          <Icon
            name={copied ? 'checkmark' : 'doc.on.doc'}
            fallback={copied ? <Checkmark12Regular /> : <Copy16Regular />}
            size={12}
            style={styles.versionIcon}
          />
        </HoverPressable>
      </Row>
      <Row flex="1" style={styles.body}>
        <DebugLogs />
        <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
          {actionGroups.map((group) => (
            <Section key={group.title} title={group.title}>
              {group.actions.map((action, index) => (
                <View key={action.command}>
                  {index > 0 ? (
                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                  ) : null}
                  <ActionRow action={action} />
                </View>
              ))}
            </Section>
          ))}
          <View gap="2">
            <Section title="System colors" contentStyle={styles.palette}>
              <NativeColorPalette onPress={copyColor} />
            </Section>
            <Text color="secondary" style={styles.hint}>
              {copiedColor ? `Copied ${copiedColor}` : 'Click a swatch to copy its name.'}
            </Text>
          </View>
        </ScrollView>
      </Row>
    </View>
  );
};

export default DebugMenu;

function Section({
  title,
  contentStyle,
  children,
}: {
  title: string;
  contentStyle?: object;
  children: React.ReactNode;
}) {
  const colors = useDebugColors();
  return (
    <View gap="2">
      <Text style={styles.sectionTitle}>{title}</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: colors.group, borderColor: colors.groupBorder },
          contentStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

function ActionRow({ action }: { action: Action }) {
  const colors = useDebugColors();
  const [state, setState] = useState<'idle' | 'confirm' | 'busy' | 'done'>('idle');

  const run = async () => {
    if (action.danger && state !== 'confirm') {
      setState('confirm');
      return;
    }
    setState('busy');
    try {
      const info = await action.run();
      MenuBarModule.logs.push({ command: action.command, info, level: 'info' });
      setState('done');
      setTimeout(() => setState('idle'), 1400);
    } catch (error) {
      const info = error instanceof Error ? error.message : String(error);
      MenuBarModule.logs.push({ command: action.command, info, level: 'error' });
      setState('idle');
    }
  };

  const isConfirming = state === 'confirm';
  const label = {
    idle: action.button,
    confirm: 'Confirm',
    busy: 'Working…',
    done: 'Done ✓',
  }[state];

  return (
    <Row align="center" gap="2.5" style={styles.action}>
      <View flex="1" style={styles.actionText}>
        <Text style={styles.actionLabel}>{action.label}</Text>
        <Text color="secondary" style={styles.actionDescription}>
          {action.description}
        </Text>
      </View>
      <HoverPressable
        onPress={run}
        disabled={state === 'busy'}
        style={[
          styles.actionButton,
          isConfirming
            ? { backgroundColor: colors.danger, borderColor: 'transparent' }
            : { backgroundColor: colors.button, borderColor: colors.buttonBorder },
        ]}
        hoverStyle={!isConfirming && { backgroundColor: colors.buttonHover }}>
        <Text
          style={[
            styles.actionButtonLabel,
            isConfirming ? { color: '#fff' } : action.danger && { color: colors.danger },
          ]}>
          {label}
        </Text>
      </HoverPressable>
    </Row>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    gap: 8,
    // On macOS the header shares the title bar with the traffic lights.
    paddingLeft: Platform.OS === 'macos' ? 90 : 16,
    paddingRight: 16,
  },
  bugTile: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#ff9f0a',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionText: {
    fontSize: 12,
  },
  versionIcon: {
    opacity: 0.7,
  },
  body: {
    minHeight: 0,
  },
  sidebar: {
    width: 280,
    flexGrow: 0,
  },
  sidebarContent: {
    gap: 18,
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  group: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  separator: {
    height: 1,
    marginHorizontal: 12,
  },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: {
    gap: 1,
  },
  actionLabel: {
    fontSize: 13,
  },
  actionDescription: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionButton: {
    height: 24,
    minWidth: 64,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  palette: {
    padding: 12,
  },
  hint: {
    fontSize: 11,
    paddingHorizontal: 4,
  },
});
