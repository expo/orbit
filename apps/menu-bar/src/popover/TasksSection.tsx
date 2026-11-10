import { ProgressIndicator } from '../../modules/progress-indicator';
import { Text, View } from '../components';
import { MenuBarStatus, Task } from '../utils/helpers';

// An estimate of the height of one task, for the size of the device list.
export const TASK_HEIGHT = 44;

interface Props {
  tasks: Map<string, Task>;
}

/**
 * The progress of the builds that Orbit downloads, installs or launches. It shows above the
 * sections while there is a task, so no section goes away during an install.
 */
const TasksSection = ({ tasks }: Props) => {
  if (tasks.size === 0) {
    return null;
  }

  return (
    <View pt="2.5" pb="1" gap="1.5" testID="tasks-section">
      {[...tasks.values()].map((task) => {
        const determinate =
          task.status === MenuBarStatus.DOWNLOADING ||
          (task.status === MenuBarStatus.RESIGNING_APP && task.progress > 0);
        return (
          <View px="medium" key={task.id}>
            {task.status !== MenuBarStatus.WARNING && (
              <ProgressIndicator
                progress={determinate ? task.progress : undefined}
                indeterminate={!determinate}
                key={`${task.status}-${determinate}`}
              />
            )}
            <Text
              size="small"
              color={task.status === MenuBarStatus.WARNING ? 'warning' : undefined}>
              {getDescription(task)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default TasksSection;

function getDescription(task: Task): string {
  switch (task.status) {
    case MenuBarStatus.BOOTING_DEVICE:
      return 'Initializing device...';
    case MenuBarStatus.DOWNLOADING:
      return 'Downloading build...';
    case MenuBarStatus.INSTALLING_APP:
      return task.message ?? 'Installing...';
    case MenuBarStatus.INSTALLING_EXPO_GO:
      return 'Installing Expo Go...';
    case MenuBarStatus.OPENING_PROJECT_IN_EXPO_GO:
      return 'Opening project in Expo Go...';
    case MenuBarStatus.OPENING_UPDATE:
      return 'Opening update...';
    case MenuBarStatus.RESIGNING_APP:
      return task.message ?? 'Re-signing app...';
    case MenuBarStatus.WARNING:
      return task.message ?? '';
    default:
      return '';
  }
}
