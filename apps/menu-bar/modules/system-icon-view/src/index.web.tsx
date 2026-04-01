import { Bug16Filled, Question16Filled } from '@fluentui/react-icons';
import { ImageProps } from 'react-native';

import Earth02Icon from '../../../src/assets/icons/earth-02.svg';
import File05Icon from '../../../src/assets/icons/file-05.svg';
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
    case 'globe':
      return <Earth02Icon {...props} stroke={props.tintColor} />;
    case 'iphone':
      return <IphoneIcon {...props} />;
    case 'text.document':
      return <File05Icon {...props} stroke={props.tintColor} />;
    case 'tv':
      return <TvosIcon {...props} />;
    default:
      return <Question16Filled />;
  }
}

export default SystemIconView;
