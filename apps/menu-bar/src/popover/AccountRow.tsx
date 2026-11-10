import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

import { Divider, Row, Text, View } from '../components';
import { secondaryText } from '../components/Text';
import { OrbitAccount, useAccounts } from '../hooks/useAccounts';
import Alert from '../modules/Alert';
import { Linking } from '../modules/Linking';
import MenuBarModule from '../modules/MenuBarModule';
import { PlatformColor } from '../modules/PlatformColor';
import { resetApolloStore, saveSessionSecret } from '../modules/Storage';
import { authenticateAsync } from '../utils/auth';
import { getProjectBackgroundColor } from '../utils/theme';
import { useCurrentTheme } from '../utils/useExpoTheme';

export const ACCOUNT_ROW_HEIGHT = 41;

type Props = ReturnType<typeof useAccounts>;

type AccountAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size: number;
  /** An organization has a square avatar with round corners. A person has a circle. */
  isOrganization?: boolean;
};

const AccountAvatar = ({ name, imageUrl, size, isOrganization }: AccountAvatarProps) => {
  const shape = {
    width: size,
    height: size,
    borderRadius: isOrganization ? size * 0.27 : size / 2,
  };
  return imageUrl ? (
    <Image source={{ uri: imageUrl }} style={shape} />
  ) : (
    <View style={[shape, styles.initial, { backgroundColor: getProjectBackgroundColor(name) }]}>
      <Text weight="semibold" style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>
        {name[0]?.toUpperCase()}
      </Text>
    </View>
  );
};

const login = (type: 'login' | 'signup') =>
  authenticateAsync(type)
    // A different user can be signed in now: drop the data of the old one.
    .then(() => resetApolloStore())
    .catch((error) => Alert.alert('Could not log in', error.message));

type TextButtonProps = { title: string; onPress: () => void; testID: string };

const TextButton = ({ title, onPress, testID }: TextButtonProps) => {
  const theme = useCurrentTheme();
  const [isHovered, setIsHovered] = useState(false);
  const backgroundColor =
    theme === 'dark'
      ? `rgba(255,255,255,${isHovered ? 0.34 : 0.18})`
      : `rgba(255,255,255,${isHovered ? 1 : 0.7})`;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.button, { backgroundColor }]}
      testID={testID}>
      <Text size="tiny" weight="semibold">
        {title}
      </Text>
    </Pressable>
  );
};

/**
 * The first row of the popover: the selected account, with a menu to change it. It follows
 * the account selector of the expo.dev sidebar. The signed-in user shows at the right when
 * the selected account is not their personal account.
 */
const AccountRow = ({
  isSignedIn,
  user,
  accounts,
  selectedAccount,
  isPersonalAccount,
  selectAccount,
}: Props) => {
  const theme = useCurrentTheme();
  const [isHovered, setIsHovered] = useState(false);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const getTitle = (account: OrbitAccount) =>
    account.displayName ?? (isPersonalAccount(account) && fullName ? fullName : account.name);

  const chooseAccount = async () => {
    const actions: (() => void)[] = [];
    const items = [
      { title: 'Account', header: true },
      ...accounts.map((account) => ({
        title: getTitle(account),
        detail: getTitle(account) === account.name ? undefined : account.name,
        checked: account.id === selectedAccount?.id,
      })),
      { separator: true },
      { title: 'Create organization…' },
      { title: 'Log in as another user…' },
      { title: 'Log out' },
    ];
    actions[0] = () => {};
    accounts.forEach((account, index) => {
      actions[index + 1] = () => selectAccount(account);
    });
    const afterAccounts = accounts.length + 2;
    actions[afterAccounts] = () => {
      Linking.openURL('https://expo.dev/create-organization');
      MenuBarModule.closePopover();
    };
    actions[afterAccounts + 1] = () => login('login');
    actions[afterAccounts + 2] = () => {
      saveSessionSecret(undefined);
      resetApolloStore();
    };

    const index = await MenuBarModule.showMenu(items);
    actions[index]?.();
  };

  if (!isSignedIn) {
    return (
      <View style={styles.container} testID="account-row">
        <Row align="center" justify="between" style={styles.row}>
          <Row align="center" gap="2" style={styles.signedOut}>
            <View
              style={[
                styles.signedOutIcon,
                { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.23)' : 'rgba(0,0,0,.16)' },
              ]}>
              <SymbolView
                name="person.fill"
                size={13}
                tintColor={PlatformColor('labelColor')}
                style={styles.dimmed}
                fallback={<Text size="tiny">?</Text>}
              />
            </View>
            <Text size="small" style={secondaryText}>
              Not logged in
            </Text>
          </Row>
          <Row align="center" gap="1.5">
            <TextButton title="Log in" onPress={() => login('login')} testID="account-log-in" />
            <TextButton title="Sign up" onPress={() => login('signup')} testID="account-sign-up" />
          </Row>
        </Row>
        <View style={styles.divider}>
          <Divider />
        </View>
      </View>
    );
  }

  // The accounts load after the popover opens.
  if (!selectedAccount || !user) {
    return <View style={styles.container} testID="account-row" />;
  }

  const showsUser = !isPersonalAccount(selectedAccount);
  return (
    <View style={styles.container} testID="account-row">
      <Row align="center" justify="between" style={styles.row}>
        <Pressable
          onPress={chooseAccount}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          style={[
            styles.selector,
            isHovered && {
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)',
            },
          ]}
          testID="account-selector">
          <AccountAvatar
            name={selectedAccount.name}
            imageUrl={selectedAccount.profileImageUrl}
            size={22}
            isOrganization={showsUser}
          />
          <Text size="small" weight="medium" numberOfLines={1} style={styles.accountName}>
            {getTitle(selectedAccount)}
          </Text>
          <SymbolView
            name="chevron.up.chevron.down"
            size={9}
            tintColor={PlatformColor('labelColor')}
            style={styles.dimmed}
            fallback={<Text size="tiny">▾</Text>}
          />
        </Pressable>
        {showsUser ? (
          <Row align="center" gap="1.5">
            <Text size="tiny" numberOfLines={1} style={secondaryText}>
              {user.username}
            </Text>
            <AccountAvatar
              name={user.username}
              imageUrl={user.primaryAccountProfileImageUrl}
              size={20}
            />
          </Row>
        ) : null}
      </Row>
      <View style={styles.divider}>
        <Divider />
      </View>
    </View>
  );
};

export default AccountRow;

const styles = StyleSheet.create({
  container: { height: ACCOUNT_ROW_HEIGHT, paddingTop: 6 },
  row: { height: 30, paddingLeft: 10, paddingRight: 14 },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 28,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 7,
    flexShrink: 1,
    cursor: 'pointer',
  },
  accountName: { flexShrink: 1, maxWidth: 200 },
  initial: { alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.6 },
  signedOut: { paddingLeft: 4 },
  signedOutIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  divider: { marginTop: 4, marginHorizontal: 14 },
});
