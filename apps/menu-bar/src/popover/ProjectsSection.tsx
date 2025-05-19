import { spacing } from '@expo/styleguide-native';
import { StyleSheet, TouchableOpacity, FlatList } from 'react-native';

import Item from './Item';
import SectionHeader, { SECTION_HEADER_HEIGHT } from './SectionHeader';
import { Row, Text, View } from '../components';
import { ProjectIcon } from '../components/ProjectIcon';
import { AppForPinnedListFragment } from '../generated/graphql';
import { PinnedApp, minNumberOfApps } from '../hooks/useGetPinnedApps';
import { Linking } from '../modules/Linking';
import MenuBarModule from '../modules/MenuBarModule';

const PROJECTS_ITEM_HEIGHT = 50;
const PROJECTS_ITEM_MARGIN_BOTTOM = spacing[1];
const MAX_NUMBER_OF_VISIBLE_ITEMS = 3;

export function getProjectSectionHeight(numberOfApps: number) {
  if (numberOfApps === 0) {
    return 0;
  }

  return (
    SECTION_HEADER_HEIGHT +
    PROJECTS_ITEM_HEIGHT * Math.min(numberOfApps, MAX_NUMBER_OF_VISIBLE_ITEMS) +
    PROJECTS_ITEM_MARGIN_BOTTOM * Math.min(numberOfApps, MAX_NUMBER_OF_VISIBLE_ITEMS - 1) +
    18
  );
}

interface Props {
  apps?: PinnedApp[];
}

export const ProjectsSection = ({ apps }: Props) => {
  const openProjectURL = (app: AppForPinnedListFragment) => {
    Linking.openURL(
      `https://expo.dev/accounts/${app.ownerAccount.name}/projects/${app.slug}/builds`
    );
    MenuBarModule.closePopover();
  };

  if (!apps?.length) {
    return null;
  }

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
        contentContainerStyle={styles.listContentContainer}
        alwaysBounceVertical={apps.length > minNumberOfApps}
        renderItem={({ item: app, index }) => (
          <Item
            style={[styles.item, apps.length - 1 !== index && styles.itemMargin]}
            key={app.id}
            onPress={() => openProjectURL(app)}>
            <Row gap="2" align="center">
              <ProjectIcon app={app} />
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
    maxHeight: getProjectSectionHeight(MAX_NUMBER_OF_VISIBLE_ITEMS),
  },
  item: {
    height: PROJECTS_ITEM_HEIGHT,
  },
  itemMargin: {
    marginBottom: spacing[1],
  },
  listContentContainer: {
    width: '100%',
  },
});
