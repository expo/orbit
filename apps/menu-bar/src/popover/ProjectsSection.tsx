import { Linking, StyleSheet, TouchableOpacity } from 'react-native';

import Item from './Item';
import SectionHeader from './SectionHeader';
import { Row, Text, View } from '../components';
import { ProjectIcon } from '../components/ProjectIcon';
import { AppForPinnedListFragment } from '../generated/graphql';
import { PinnedApp } from '../hooks/useGetPinnedApps';

export const PROJECTS_SECTION_HEIGHT = 192;

interface Props {
  apps: PinnedApp[];
}

export const ProjectsSection = ({ apps }: Props) => {
  const openProjectURL = (app: AppForPinnedListFragment) =>
    Linking.openURL(`https://expo.dev/accounts/${app.ownerAccount.name}/projects/${app.slug}`);

  return (
    <View style={styles.container}>
      <View pt="2.5" pb="tiny">
        <SectionHeader
          label="Projects"
          accessoryRight={
            <TouchableOpacity onPress={() => {}}>
              <Text size="tiny" color="default">
                See all
              </Text>
            </TouchableOpacity>
          }
        />
        <View pt="1" gap="1">
          {apps?.map((app) => {
            return (
              <Item key={app.id} onPress={() => openProjectURL(app)}>
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
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default ProjectsSection;

const styles = StyleSheet.create({
  container: {
    height: PROJECTS_SECTION_HEIGHT,
  },
});
