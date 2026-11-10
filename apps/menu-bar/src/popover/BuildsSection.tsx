import { SymbolView } from 'expo-symbols';

import SectionHeader from './SectionHeader';
import * as FilePicker from '../../modules/file-picker';
import { Analytics, Event } from '../analytics';
import Earth02Icon from '../assets/icons/earth-02.svg';
import File05Icon from '../assets/icons/file-05.svg';
import { View } from '../components';
import AddDeviceItem from '../components/AddDeviceItem';
import { DEVICE_ITEM_HEIGHT } from '../components/DeviceItem';
import MenuBarModule from '../modules/MenuBarModule';
import { openProjectsSelectorURL } from '../utils/constants';
import { useExpoTheme } from '../utils/useExpoTheme';

// The header, two rows, and the same gap below as a device section.
export const BUILDS_SECTION_HEIGHT = 42 + DEVICE_ITEM_HEIGHT * 2;

interface Props {
  installAppFromURI: (appURI: string) => Promise<void>;
  /** Hides the section. */
  onPressHide?: () => void;
}

const BuildsSection = ({ installAppFromURI, onPressHide }: Props) => {
  const theme = useExpoTheme();

  async function openFilePicker() {
    const appPath = await FilePicker.getAppAsync();
    MenuBarModule.openPopover();
    Analytics.track(Event.LAUNCH_BUILD_FROM_LOCAL_FILE);
    await installAppFromURI(appPath);
  }

  return (
    <View style={{ minHeight: BUILDS_SECTION_HEIGHT }} testID="builds-section">
      <View pt="2.5" pb="tiny">
        <SectionHeader label="Builds" onPressHide={onPressHide} />
      </View>
      <AddDeviceItem
        title="Open from expo.dev"
        subtitle="Choose a build of your projects"
        onPress={openProjectsSelectorURL}
        testID="select-build-eas"
        icon={
          <SymbolView
            name="globe"
            size={17}
            tintColor={theme.text.default}
            fallback={<Earth02Icon width={17} height={17} stroke={theme.text.default} />}
          />
        }
      />
      <AddDeviceItem
        title="Open from a file"
        subtitle=".app, .ipa, .apk or .tar.gz"
        onPress={openFilePicker}
        testID="select-build-local"
        icon={
          <SymbolView
            name="text.document"
            size={17}
            tintColor={theme.text.default}
            fallback={<File05Icon width={17} height={17} stroke={theme.text.default} />}
          />
        }
      />
    </View>
  );
};

export default BuildsSection;
