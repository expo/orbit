import { useMemo } from 'react';

import { AppForPinnedListFragment, useGetAppsForPinnedListQuery } from '../generated/graphql';

// The Projects row has space for this number of projects.
export const minNumberOfApps = 4;

export type PinnedApp = AppForPinnedListFragment & {
  isPinned: boolean;
};

/** With `accountName`, `apps` holds only the projects of that account. */
export const useGetPinnedApps = (accountName?: string) => {
  const { data, loading, refetch } = useGetAppsForPinnedListQuery({
    fetchPolicy: 'cache-and-network',
  });

  const pinnedApps = data?.meUserActor?.pinnedApps;
  const accounts = data?.meUserActor?.accounts;

  const apps = useMemo(() => {
    let apps: PinnedApp[] = [];

    const isInAccount = (app: AppForPinnedListFragment) =>
      !accountName || app.ownerAccount.name === accountName;

    if (pinnedApps?.length) {
      apps = apps.concat(pinnedApps.filter(isInAccount).map((app) => ({ ...app, isPinned: true })));
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
        ?.filter((app) => isInAccount(app) && !apps.find(({ id }) => id === app.id))
        ?.slice(0, appsToAdd)
        ?.forEach((app) => {
          apps.push(app);
        });
    }

    return apps;
  }, [accounts, pinnedApps, accountName]);

  return {
    refetch,
    loading,
    apps,
    pinnedApps,
    accounts,
  };
};
