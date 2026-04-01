import { Bug16Filled, Question16Filled } from '@fluentui/react-icons';

function SystemIconView({ systemIconName }: { systemIconName: string }) {
  switch (systemIconName) {
    case 'ladybug':
      return <Bug16Filled />;
    default:
      return <Question16Filled />;
  }
}

export default SystemIconView;
