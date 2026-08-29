import { useCallback, useEffect, useState } from 'react';

import { AppPlatform, useGetSimulatorBuildsForAppLazyQuery } from '../generated/graphql';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import {
  AgentDeviceConnection,
  installFromSourceAsync,
  probeAsync,
} from '../utils/agentDeviceClient';
import { CloudSimulatorSession, getAgentDeviceConnection } from '../utils/cloudSimulator';

function formatBuildLabel(build: {
  appVersion?: string | null;
  appBuildVersion?: string | null;
  buildProfile?: string | null;
  completedAt?: string | null;
}): string {
  const version = [build.appVersion, build.appBuildVersion].filter(Boolean).join(' · ');
  const completed = build.completedAt
    ? new Date(build.completedAt).toLocaleDateString()
    : undefined;
  return [build.buildProfile ?? 'build', version, completed].filter(Boolean).join(' — ');
}

/**
 * Installing onto a running cloud simulator goes through the agent-device daemon,
 * which asks the remote VM to download the artifact itself. That is what lets a
 * Windows or Linux user run an iOS build without a Mac.
 *
 * The daemon protocol is not a published contract, so this probes `/health` first
 * and reports the session as preview-only when the probe fails, rather than
 * offering an action that cannot work.
 */
export function useCloudSimulatorInstall(session: CloudSimulatorSession | undefined) {
  const [connection, setConnection] = useState<AgentDeviceConnection | undefined>();
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [fetchBuilds] = useGetSimulatorBuildsForAppLazyQuery();

  useEffect(() => {
    let cancelled = false;
    const nextConnection = session ? getAgentDeviceConnection(session) : undefined;
    setConnection(nextConnection);

    if (!nextConnection) {
      setIsSupported(false);
      return;
    }

    probeAsync(nextConnection).then((reachable) => {
      if (!cancelled) {
        setIsSupported(reachable);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const installBuild = useCallback(async () => {
    if (!session || !connection) {
      return;
    }

    setIsInstalling(true);
    try {
      const { data } = await fetchBuilds({
        variables: {
          appId: session.app.id,
          limit: 10,
          platform: session.platform ?? AppPlatform.Ios,
        },
        fetchPolicy: 'network-only',
      });

      const builds = (data?.app.byId.builds ?? []).filter(
        (build) => build.artifacts?.applicationArchiveUrl
      );

      if (!builds.length) {
        Alert.alert(
          'No simulator builds found',
          'A cloud simulator can only run simulator builds. Create one with EAS Build and try again.'
        );
        return;
      }

      const selectedIndex = await MenuBarModule.showMultiOptionAlert(
        'Install a build',
        'The simulator downloads the build itself, so nothing is uploaded from this machine.',
        builds.map(formatBuildLabel)
      );

      const url = builds[selectedIndex]?.artifacts?.applicationArchiveUrl;
      if (!url) {
        return;
      }

      await installFromSourceAsync(connection, { url, platform: 'ios' });
      Alert.alert('Build installed', 'Open it from the simulator’s home screen.');
    } catch (error) {
      Alert.alert(
        'Could not install the build',
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setIsInstalling(false);
    }
  }, [connection, fetchBuilds, session]);

  return { isSupported, isInstalling, installBuild };
}
