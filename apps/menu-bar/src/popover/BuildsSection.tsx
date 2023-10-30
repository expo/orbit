import Item from './Item';
import SectionHeader from './SectionHeader';
import Earth02Icon from '../assets/icons/earth-02.svg';
import File05Icon from '../assets/icons/file-05.svg';
import { Text, View } from '../components';
import ProgressIndicator from '../components/ProgressIndicator';
import FilePicker from '../modules/FilePickerModule';
import MenuBarModule from '../modules/MenuBarModule';
import { openProjectsSelectorURL } from '../utils/constants';
import { MenuBarStatus } from '../utils/helpers';
import { useExpoTheme } from '../utils/useExpoTheme';

export const BUILDS_SECTION_HEIGHT = 88;

interface Props {
  status: MenuBarStatus;
  installAppFromURI: (appURI: string) => Promise<void>;
  progress: number;
}

const BuildsSection = ({ status, installAppFromURI, progress }: Props) => {
  const theme = useExpoTheme();

  async function openFilePicker() {
    const appPath = await FilePicker.getAppAsync();
    MenuBarModule.openPopover();
    await installAppFromURI(appPath);
  }

  function getDescription() {
    switch (status) {
      case MenuBarStatus.BOOTING_DEVICE:
        return 'Initializing device...';
      case MenuBarStatus.DOWNLOADING:
        return 'Downloading build...';
      case MenuBarStatus.INSTALLING_APP:
        return 'Installing...';
      case MenuBarStatus.INSTALLING_SNACK:
        return 'Installing Snack...';
      case MenuBarStatus.OPENING_SNACK_PROJECT:
        return 'Opening project in Snack...';
      default:
        return '';
    }
  }

  return (
    <View style={{ height: BUILDS_SECTION_HEIGHT }}>
      <View pt="2.5" pb="tiny">
        <SectionHeader label="Builds" />
      </View>
      {status === MenuBarStatus.LISTENING ? (
        <>
          <Item onPress={openProjectsSelectorURL}>
            <Earth02Icon stroke={theme.text.default} />
            <Text>Select build from EAS…</Text>
          </Item>
          <Item onPress={openFilePicker}>
            <File05Icon stroke={theme.text.default} />
            <Text>Select build from local file…</Text>
          </Item>
        </>
      ) : (
        <View px="medium">
          <ProgressIndicator
            progress={status === MenuBarStatus.DOWNLOADING ? progress : undefined}
            indeterminate={status !== MenuBarStatus.DOWNLOADING}
            key={status}
          />
          <Text>{getDescription()}</Text>
        </View>
      )}
    </View>
  );
};

export default BuildsSection;