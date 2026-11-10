import { gql, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';

import {
  getSelectedAccountName,
  saveSelectedAccountName,
  selectedAccountNameStorageKey,
  sessionSecretStorageKey,
  storage,
} from '../modules/Storage';

// Not in the generated documents: the app's code generation does not run against the current
// schema.
const ACCOUNTS_QUERY = gql`
  query GetAccountsForAccountRow {
    meUserActor {
      id
      username
      firstName
      lastName
      primaryAccountProfileImageUrl
      accounts {
        id
        name
        displayName
        profileImageUrl
        ownerUserActor {
          id
        }
      }
    }
  }
`;

export type OrbitAccount = {
  id: string;
  name: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
  ownerUserActor?: { id: string } | null;
};
type AccountsResult = {
  meUserActor?: {
    id: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    primaryAccountProfileImageUrl?: string | null;
    accounts: OrbitAccount[];
  } | null;
};

/**
 * The signed-in user, their accounts, and the account that is selected in the popover. The
 * personal account comes first, then the other accounts by name, as on expo.dev. With no
 * stored choice, the personal account is selected.
 */
export function useAccounts() {
  const [isSignedIn, setIsSignedIn] = useState(Boolean(storage.getString(sessionSecretStorageKey)));
  const [selectedName, setSelectedName] = useState(getSelectedAccountName());
  useEffect(() => {
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === sessionSecretStorageKey) {
        setIsSignedIn(Boolean(storage.getString(sessionSecretStorageKey)));
      }
      if (key === selectedAccountNameStorageKey) {
        setSelectedName(getSelectedAccountName());
      }
    });
    return () => listener.remove();
  }, []);

  const { data } = useQuery<AccountsResult>(ACCOUNTS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !isSignedIn,
  });
  const user = isSignedIn ? (data?.meUserActor ?? undefined) : undefined;

  const isPersonal = (account: OrbitAccount) => account.ownerUserActor?.id === user?.id;
  const accounts = [...(user?.accounts ?? [])].sort(
    (a, b) => Number(isPersonal(b)) - Number(isPersonal(a)) || a.name.localeCompare(b.name)
  );
  const selectedAccount = accounts.find(({ name }) => name === selectedName) ?? accounts[0];

  return {
    isSignedIn,
    user,
    accounts,
    selectedAccount,
    isPersonalAccount: (account: OrbitAccount) => isPersonal(account),
    selectAccount: (account: OrbitAccount) => {
      saveSelectedAccountName(account.name);
      setSelectedName(account.name);
    },
  };
}
