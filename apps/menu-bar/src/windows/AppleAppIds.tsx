import { lightTheme, darkTheme } from '@expo/styleguide-native';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { WindowsNavigator } from './index';
import {
  AUTH_REASON_KEY,
  forgetAppleIdSession,
  isAppleAuthExpiredError,
  loadAppleId,
} from '../commands/appleAccountAsync';
import {
  AppleAppId,
  deleteAppleAppIdAsync,
  listAppleAppIdsAsync,
} from '../commands/appleAppIdsAsync';
import { Divider, Row, Text, View } from '../components';
import Button from '../components/Button';
import Alert from '../modules/Alert';
import { storage } from '../modules/Storage';
import { APPLE_APP_IDS_DONE_EVENT, AppleAppIdsEmitter } from '../utils/appleAppIdsEvents';
import { waitForAppleAuthCompleteAsync } from '../utils/appleAuthEvents';
import { describeResignError } from '../utils/resignErrorCopy';
import { useCurrentTheme } from '../utils/useExpoTheme';

/**
 * Lists the App IDs registered to the signed-in Apple ID so the user can free
 * quota slots (free accounts: 10 App IDs per rolling 7 days). Emits
 * `apple-app-ids:done` with the deletion count on close — the resign flow
 * waits on that event to retry.
 */
const AppleAppIds: React.FC = () => {
  const themeName = useCurrentTheme();
  const theme = themeName === 'dark' ? darkTheme : lightTheme;
  const [appleId, setAppleId] = useState<string | null>(() => loadAppleId());
  const [appIds, setAppIds] = useState<AppleAppId[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const deletedCountRef = useRef(0);
  const doneEmittedRef = useRef(false);
  // Re-auth the expired session at most once per load, so a persistent failure
  // can't bounce the sign-in window in a loop.
  const reauthTriedRef = useRef(false);

  const emitDone = useCallback(() => {
    if (doneEmittedRef.current) return;
    doneEmittedRef.current = true;
    AppleAppIdsEmitter.emit(APPLE_APP_IDS_DONE_EVENT, {
      deletedCount: deletedCountRef.current,
    });
  }, []);

  // Also emit when the window is closed via its close button, so the resign
  // flow waiting on the event never hangs.
  useEffect(() => emitDone, [emitDone]);

  const promptReauthAsync = useCallback(async (): Promise<boolean> => {
    storage.set(AUTH_REASON_KEY, 'session-expired');
    WindowsNavigator.open('AppleIdAuth');
    const event = await waitForAppleAuthCompleteAsync();
    return event.status === 'success';
  }, []);

  const load = useCallback(async () => {
    const id = loadAppleId();
    setAppleId(id);
    if (!id) {
      setAppIds([]);
      setError('Sign in with your Apple ID to manage App IDs.');
      return;
    }
    setError(null);
    setAppIds(null);
    try {
      const rows = await listAppleAppIdsAsync(id);
      rows.sort((a, b) => (a.expirationDate ?? '').localeCompare(b.expirationDate ?? ''));
      setAppIds(rows);
      reauthTriedRef.current = false;
    } catch (e) {
      // An expired session is a logout: forget it (every "signed in as" surface
      // updates), then re-sign-in once and retry automatically.
      if (isAppleAuthExpiredError(e)) {
        forgetAppleIdSession();
        setAppleId(null);
        if (!reauthTriedRef.current) {
          reauthTriedRef.current = true;
          if (await promptReauthAsync()) {
            await load();
            return;
          }
        }
        setAppIds([]);
        setError('Your Apple ID session expired. Sign in again to manage App IDs.');
        return;
      }
      setError(describeResignError(e).message);
      setAppIds([]);
    }
  }, [promptReauthAsync]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = (row: AppleAppId) => {
    Alert.alert(
      `Delete "${row.name}"?`,
      `${row.identifier}\n\nApps signed with this App ID keep working until their profile expires, but they can’t be renewed with it anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'default',
          onPress: async () => {
            if (!appleId) return;
            setBusyId(row.appIdId);
            try {
              await deleteAppleAppIdAsync(appleId, row.appIdId);
              deletedCountRef.current += 1;
              await load();
            } catch (e) {
              if (isAppleAuthExpiredError(e)) {
                // Session died mid-session: log out and let load() re-auth.
                forgetAppleIdSession();
                reauthTriedRef.current = false;
                await load();
                return;
              }
              setError(describeResignError(e).message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const done = () => {
    emitDone();
    WindowsNavigator.close('AppleAppIds');
  };

  return (
    <View padding="large" flex="1" style={{ backgroundColor: theme.background.default }}>
      <Text size="large" weight="bold">
        Manage Apple App IDs
      </Text>
      <Text size="small" color="secondary" style={styles.subtitle}>
        Free Apple IDs can register at most 10 App IDs per rolling 7-day window. Delete ones you no
        longer use to free a slot. {appleId ? `Signed in as ${appleId}.` : ''}
      </Text>
      <Divider style={styles.divider} />

      {appIds === null ? (
        <View align="centered" flex="1">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView style={styles.list} alwaysBounceVertical={false}>
          {appIds.length === 0 && !error ? (
            <Text size="small" color="secondary">
              No App IDs are registered to this account.
            </Text>
          ) : (
            appIds.map((row, index) => (
              <Fragment key={row.appIdId}>
                <Row align="center" gap="2" style={styles.row}>
                  <View flex="1">
                    <Text size="small" weight="medium" numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text size="tiny" color="secondary" numberOfLines={1}>
                      {row.identifier}
                      {row.expirationDate
                        ? ` · expires ${new Date(row.expirationDate).toLocaleDateString()}`
                        : ''}
                    </Text>
                  </View>
                  <Button
                    title={busyId === row.appIdId ? 'Deleting…' : 'Delete'}
                    disabled={busyId !== null}
                    onPress={() => onDelete(row)}
                    style={styles.deleteButton}
                  />
                </Row>
                {index < appIds.length - 1 ? <Divider /> : null}
              </Fragment>
            ))
          )}
        </ScrollView>
      )}

      {error ? (
        <Text size="tiny" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Row align="center" style={styles.actions}>
        <View flex="1" />
        <Button title="Done" color="primary" onPress={done} />
      </Row>
    </View>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 12,
  },
  list: {
    flex: 1,
  },
  row: {
    minHeight: 44,
  },
  deleteButton: {
    height: 28,
  },
  error: {
    color: '#cc3333',
    marginTop: 8,
  },
  actions: {
    marginTop: 12,
  },
});

export default AppleAppIds;
