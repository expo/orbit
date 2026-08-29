import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { apolloClient } from '../api/ApolloClient';
import {
  AppPlatform,
  CreateDeviceRunSessionDocument,
  CreateDeviceRunSessionMutation,
  CreateDeviceRunSessionMutationVariables,
  DeviceRunSessionType,
  GetDeviceRunSessionDocument,
  GetDeviceRunSessionQuery,
  GetDeviceRunSessionQueryVariables,
  StopDeviceRunSessionDocument,
  StopDeviceRunSessionMutation,
  StopDeviceRunSessionMutationVariables,
} from '../generated/graphql';
import { getCloudSimulatorSessionIds, saveCloudSimulatorSessionIds } from '../modules/Storage';
import {
  CloudSimulatorSession,
  SESSION_POLL_INTERVAL_MS,
  SESSION_READY_TIMEOUT_MS,
  buildSessionName,
  getPreviewUrl,
  isSessionActive,
  isSessionTerminal,
} from '../utils/cloudSimulator';

export type StartSessionOptions = {
  appId: string;
  appSlug: string;
  name?: string;
  platform?: AppPlatform;
  maxRunTimeMinutes?: number;
};

type CloudSimulatorContextValue = {
  sessions: CloudSimulatorSession[];
  /** Sessions still running, so still billing. */
  activeSessions: CloudSimulatorSession[];
  startingAppIds: string[];
  startSession: (options: StartSessionOptions) => Promise<CloudSimulatorSession>;
  stopSession: (sessionId: string) => Promise<void>;
  refetchSession: (sessionId: string) => Promise<CloudSimulatorSession | undefined>;
};

const defaultValue: CloudSimulatorContextValue = {
  sessions: [],
  activeSessions: [],
  startingAppIds: [],
  startSession: async () => {
    throw new Error('CloudSimulatorProvider is not mounted');
  },
  stopSession: async () => {},
  refetchSession: async () => undefined,
};

const CloudSimulatorContext = React.createContext<CloudSimulatorContextValue>(defaultValue);
export const useCloudSimulators = () => React.useContext(CloudSimulatorContext);

async function fetchSessionAsync(sessionId: string): Promise<CloudSimulatorSession | undefined> {
  const { data } = await apolloClient.query<
    GetDeviceRunSessionQuery,
    GetDeviceRunSessionQueryVariables
  >({
    query: GetDeviceRunSessionDocument,
    variables: { deviceRunSessionId: sessionId },
    fetchPolicy: 'network-only',
  });

  return data.deviceRunSessions.byId ?? undefined;
}

function sleepAsync(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CloudSimulatorProvider({ children }: { children: React.ReactNode }) {
  const [sessionsById, setSessionsById] = useState<Map<string, CloudSimulatorSession>>(new Map());
  const [startingAppIds, setStartingAppIds] = useState<string[]>([]);

  const upsertSession = useCallback((session: CloudSimulatorSession) => {
    setSessionsById((prev) => {
      const next = new Map(prev);
      next.set(session.id, session);
      saveCloudSimulatorSessionIds(
        Array.from(next.values())
          .filter(isSessionActive)
          .map(({ id }) => id)
      );
      return next;
    });
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setSessionsById((prev) => {
      const next = new Map(prev);
      next.delete(sessionId);
      saveCloudSimulatorSessionIds(
        Array.from(next.values())
          .filter(isSessionActive)
          .map(({ id }) => id)
      );
      return next;
    });
  }, []);

  // Reconcile sessions persisted by a previous run. Anything already finished is
  // dropped; anything still running stays visible so it can be stopped.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const persistedIds = getCloudSimulatorSessionIds();
      for (const sessionId of persistedIds) {
        try {
          const session = await fetchSessionAsync(sessionId);
          if (cancelled || !session) {
            continue;
          }
          if (isSessionActive(session)) {
            upsertSession(session);
          } else {
            removeSession(sessionId);
          }
        } catch {
          // A session that can no longer be read is not actionable. Drop it rather
          // than leaving a row that cannot be stopped.
          if (!cancelled) {
            removeSession(sessionId);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [removeSession, upsertSession]);

  const refetchSession = useCallback(
    async (sessionId: string) => {
      const session = await fetchSessionAsync(sessionId);
      if (session) {
        upsertSession(session);
      }
      return session;
    },
    [upsertSession]
  );

  const stopSession = useCallback(
    async (sessionId: string) => {
      await apolloClient.mutate<
        StopDeviceRunSessionMutation,
        StopDeviceRunSessionMutationVariables
      >({
        mutation: StopDeviceRunSessionDocument,
        variables: { deviceRunSessionId: sessionId },
      });
      removeSession(sessionId);
    },
    [removeSession]
  );

  const startSession = useCallback(
    async ({ appId, appSlug, name, platform, maxRunTimeMinutes }: StartSessionOptions) => {
      setStartingAppIds((prev) => (prev.includes(appId) ? prev : [...prev, appId]));

      let sessionId: string | undefined;
      try {
        const { data } = await apolloClient.mutate<
          CreateDeviceRunSessionMutation,
          CreateDeviceRunSessionMutationVariables
        >({
          mutation: CreateDeviceRunSessionDocument,
          variables: {
            deviceRunSessionInput: {
              appId,
              name: name?.trim() || buildSessionName(appSlug),
              platform: platform ?? AppPlatform.Ios,
              // AGENT_DEVICE runs serve-sim for the preview *and* exposes the
              // daemon, which is what installing a build onto the session needs.
              type: DeviceRunSessionType.AgentDevice,
              maxRunTimeMinutes,
            },
          },
        });

        const created = data?.deviceRunSession.createDeviceRunSession;
        if (!created) {
          throw new Error('EAS did not return a simulator session.');
        }

        sessionId = created.id;
        upsertSession(created);

        // The session is created before the VM has booted; the preview URL only
        // appears once it is ready.
        const deadline = Date.now() + SESSION_READY_TIMEOUT_MS;
        while (Date.now() < deadline) {
          const session = await fetchSessionAsync(created.id);
          if (!session) {
            throw new Error('The simulator session disappeared while starting.');
          }
          upsertSession(session);

          if (isSessionTerminal(session)) {
            throw new Error(
              `The simulator session ${session.status.toLowerCase()} before it was ready.`
            );
          }
          if (getPreviewUrl(session)) {
            return session;
          }

          await sleepAsync(SESSION_POLL_INTERVAL_MS);
        }

        throw new Error('Timed out waiting for the simulator session to be ready.');
      } catch (error) {
        // Never leave a billing session behind because the UI gave up on it.
        if (sessionId) {
          try {
            await stopSession(sessionId);
          } catch {
            // Surfacing the original failure matters more than this cleanup.
          }
        }
        throw error;
      } finally {
        setStartingAppIds((prev) => prev.filter((id) => id !== appId));
      }
    },
    [stopSession, upsertSession]
  );

  const sessions = useMemo(() => Array.from(sessionsById.values()), [sessionsById]);
  const activeSessions = useMemo(() => sessions.filter(isSessionActive), [sessions]);

  const value = useMemo(
    () => ({
      sessions,
      activeSessions,
      startingAppIds,
      startSession,
      stopSession,
      refetchSession,
    }),
    [sessions, activeSessions, startingAppIds, startSession, stopSession, refetchSession]
  );

  return <CloudSimulatorContext value={value}>{children}</CloudSimulatorContext>;
}
