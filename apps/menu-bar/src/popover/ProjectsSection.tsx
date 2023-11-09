import { spacing } from '@expo/styleguide-native';
import { Linking, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

import Item from './Item';
import SectionHeader from './SectionHeader';
import { Row, Text, View } from '../components';
import { ProjectIcon } from '../components/ProjectIcon';
import { AppForPinnedListFragment } from '../generated/graphql';
import { PinnedApp, minNumberOfApps } from '../hooks/useGetPinnedApps';
import MenuBarModule from '../modules/MenuBarModule';

export const PROJECTS_SECTION_HEIGHT = 192;

interface Props {
  apps: PinnedApp[];
}

export const ProjectsSection = ({ apps }: Props) => {
  const openProjectURL = (app: AppForPinnedListFragment) => {
    Linking.openURL(
      `https://expo.dev/accounts/${app.ownerAccount.name}/projects/${app.slug}/builds`
    );
    MenuBarModule.closePopover();
  };

  return (
    <View pt="2.5" pb="tiny" gap="1" style={styles.container}>
      <SectionHeader
        label="Projects"
        accessoryRight={
          <TouchableOpacity
            onPress={() => {
              Linking.openURL('https://expo.dev/accounts/[account]/projects/');
              MenuBarModule.closePopover();
            }}>
            <Text size="tiny" color="default">
              See all
            </Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={apps}
        alwaysBounceVertical={apps.length > minNumberOfApps}
        renderItem={({ item: app, index }) => (
          <Item
            style={apps.length - 1 !== index && styles.itemMargin}
            key={app.id}
            onPress={() => openProjectURL(app)}>
            <Row gap="2" align="center">
              <ProjectIcon name={app.name} iconUrl={app.icon?.url} isPinned={app.isPinned} />
              <View>
                <Text size="small" color="default">
                  {app.name}
                </Text>
                <Text size="tiny" color="secondary">
                  {app.slug}
                </Text>
              </View>
            </Row>
          </Item>
        )}
      />
    </View>
  );
};

export default ProjectsSection;

const styles = StyleSheet.create({
  container: {
    height: PROJECTS_SECTION_HEIGHT,
  },
  itemMargin: {
    marginBottom: spacing[1],
  },
});
