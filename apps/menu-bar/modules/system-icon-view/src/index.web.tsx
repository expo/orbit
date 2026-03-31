import { Bug16Filled, Question16Filled } from '@fluentui/react-icons';
import { ImageProps } from 'react-native';

import IphoneIcon from '../../../src/assets/icons/iphone.svg';
import TvosIcon from '../../../src/assets/icons/tvos.svg';
import WatchIcon from '../../../src/assets/icons/watch.svg';

type Props = Omit<ImageProps, 'source'> & { systemIconName: string };

function SystemIconView({ systemIconName, ...props }: Props) {
  switch (systemIconName) {
    case 'ladybug':
      return <Bug16Filled />;
    case 'applewatch':
      return <WatchIcon {...props} />;
    case 'iphone':
      return <IphoneIcon {...props} />;
    case 'tv':
      return <TvosIcon {...props} />;
    default:
      return <Question16Filled />;
  }
}

export default SystemIconView;
