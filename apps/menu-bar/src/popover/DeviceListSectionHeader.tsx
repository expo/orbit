import { TouchableOpacity } from 'react-native';

import SectionHeader from './SectionHeader';
import AlertIcon from '../assets/icons/AlertTriangle';
import { View } from '../components/View';
import Alert from '../modules/Alert';
import { PlatformColor } from '../modules/PlatformColor';
import { useCurrentTheme } from '../utils/useExpoTheme';

type Props = {
  label: string;
  errorMessage?: string;
};

const DeviceListSectionHeader = ({ label, errorMessage }: Props) => {
  const theme = useCurrentTheme();

  return (
    <View>
      <SectionHeader
        label={label}
        accessoryRight={
          errorMessage ? (
            <TouchableOpacity
              style={{ alignItems: 'center', justifyContent: 'center' }}
              onPress={() => Alert.alert('Something went wrong', errorMessage)}>
              <AlertIcon
                height={15}
                width={15}
                fill={PlatformColor('labelColor')}
                style={{ opacity: theme === 'dark' ? 0.65 : 0.85 }}
              />
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
};

export default DeviceListSectionHeader;
