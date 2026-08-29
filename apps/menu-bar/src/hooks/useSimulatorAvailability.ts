import { useMemo } from 'react';

import { useGetSimulatorAvailabilityQuery } from '../generated/graphql';
import { DEVICE_RUN_SESSIONS_FEATURE_GATE } from '../utils/cloudSimulator';

type SimulatorAvailability = {
  loading: boolean;
  /** True only when the owning account has the EAS Simulator feature gate. */
  available: boolean;
  accountName?: string;
};

/**
 * EAS Simulator is limited access. Starting a session for an account without the
 * gate fails server-side, so the UI checks first and stays out of the way when it
 * is not enabled.
 */
export function useSimulatorAvailability(appId: string | undefined): SimulatorAvailability {
  const { data, loading } = useGetSimulatorAvailabilityQuery({
    variables: { appId: appId ?? '', filter: [DEVICE_RUN_SESSIONS_FEATURE_GATE] },
    skip: !appId,
    fetchPolicy: 'cache-and-network',
  });

  return useMemo(() => {
    const ownerAccount = data?.app.byId.ownerAccount;
    const gates = (ownerAccount?.accountFeatureGates ?? {}) as Record<string, boolean>;

    return {
      loading,
      available: gates[DEVICE_RUN_SESSIONS_FEATURE_GATE] === true,
      accountName: ownerAccount?.name,
    };
  }, [data, loading]);
}
