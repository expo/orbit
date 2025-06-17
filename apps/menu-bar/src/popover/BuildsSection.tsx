import Item from './Item';
import SectionHeader from './SectionHeader';
import * as FilePicker from '../../modules/file-picker';
import { ProgressIndicator } from '../../modules/progress-indicator';
import { Analytics, Event } from '../analytics';
import Earth02Icon from '../assets/icons/earth-02.svg';
import File05Icon from '../assets/icons/file-05.svg';
import { Text, View } from '../components';
import MenuBarModule from '../modules/MenuBarModule';
import { openProjectsSelectorURL } from '../utils/constants';
import { MenuBarStatus, Task } from '../utils/helpers';
import { useExpoTheme } from '../utils/useExpoTheme';

export const BUILDS_SECTION_HEIGHT = 88;

interface Props {
  tasks: Map<string, Task>;
  installAppFromURI: (appURI: string) => Promise<void>;
}

const BuildsSection = ({ installAppFromURI, tasks }: Props) => {
  const theme = useExpoTheme();

  async function openFilePicker() {
    const appPath = await FilePicker.getAppAsync();
    MenuBarModule.openPopover();
    Analytics.track(Event.LAUNCH_BUILD_FROM_LOCAL_FILE);
    await installAppFromURI(appPath);
  }

  return (
    <View style={{ minHeight: BUILDS_SECTION_HEIGHT }}>
      <View pt="2.5" pb="tiny">
        <SectionHeader label="Builds" />
      </View>
      {tasks.size === 0 ? (
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
        [...tasks.values()].map((task) => {
          return (
            <View px="medium" key={task.id}>
              <ProgressIndicator
                progress={task.status === MenuBarStatus.DOWNLOADING ? task.progress : undefined}
                indeterminate={task.status !== MenuBarStatus.DOWNLOADING}
                key={task.status}
              />
              <Text>{getDescription(task.status)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
};

export default BuildsSection;

function getDescription(status: MenuBarStatus): string {
  switch (status) {
    case MenuBarStatus.BOOTING_DEVICE:
      return 'Initializing device...';
    case MenuBarStatus.DOWNLOADING:
      return 'Downloading build...';
    case MenuBarStatus.INSTALLING_APP:
      return 'Installing...';
    case MenuBarStatus.INSTALLING_EXPO_GO:
      return 'Installing Expo Go...';
    case MenuBarStatus.OPENING_PROJECT_IN_EXPO_GO:
      return 'Opening project in Expo Go...';
    case MenuBarStatus.OPENING_UPDATE:
      return 'Opening update...';
    default:
      return '';
  }
}
