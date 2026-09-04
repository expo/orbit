import Item from './Item';
import { Text } from '../components';
import { ResignAttention } from '../modules/ResignedApps';
import { useExpoTheme } from '../utils/useExpoTheme';
import { WindowsNavigator } from '../windows';

export const ATTENTION_ROW_HEIGHT = 30;

/**
 * One-line popover row shown only when renewals need the user: Apple session
 * expired (opens the sign-in window) or a renewal failed (opens Settings).
 */
const ResignedAppsAttentionRow = ({ attention }: { attention: ResignAttention }) => {
  const theme = useExpoTheme();
  const onPress = () => {
    if (attention.kind === 'auth-required') {
      WindowsNavigator.open('AppleIdAuth');
    } else {
      WindowsNavigator.open('Settings');
    }
  };
  return (
    <Item onPress={onPress} style={{ minHeight: ATTENTION_ROW_HEIGHT }}>
      <Text size="tiny" style={{ color: theme.text.warning }} numberOfLines={2}>
        {attention.message} Click to fix.
      </Text>
    </Item>
  );
};

export default ResignedAppsAttentionRow;
