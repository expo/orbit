import { useMemo } from 'react';

import { AppForPinnedListFragment, useGetAppsForPinnedListQuery } from '../generated/graphql';

const minNumberOfApps = 3;

export type PinnedApp = AppForPinnedListFragment & {
  isPinned: boolean;
};

export const useGetPinnedApps = () => {
  const { data, loading } = useGetAppsForPinnedListQuery({
    fetchPolicy: 'cache-and-network',
  });

  const pinnedApps = data?.viewer?.pinnedApps;
  const accounts = data?.viewer?.accounts;

  const apps = useMemo(() => {
    let apps: PinnedApp[] = [];

    if (pinnedApps?.length) {
      apps = apps.concat(pinnedApps.map((app) => ({ ...app, isPinned: true })));
    }

    if (apps.length < minNumberOfApps) {
      const appsByLatestActivity = accounts
        ?.reduce((acc: PinnedApp[], account) => {
          account.appsPaginated?.edges?.forEach((edge) => {
            if (edge?.node) {
              acc.push({ ...edge.node, isPinned: false });
            }
          });

          return acc;
        }, [])
        ?.sort((a, b) => (b.latestActivity || '').localeCompare(a.latestActivity || ''));

      const appsToAdd = minNumberOfApps - apps.length;
      appsByLatestActivity
        ?.filter((app) => !apps.find(({ id }) => id === app.id))
        ?.slice(0, appsToAdd)
        ?.forEach((app) => {
          apps.push(app);
        });
    }

    return apps;
  }, [accounts, pinnedApps]);

  return {
    loading,
    apps,
  };
};
