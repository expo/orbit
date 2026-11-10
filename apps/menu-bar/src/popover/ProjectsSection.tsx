import { gql, useApolloClient } from '@apollo/client';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import SectionHeader, { SECTION_HEADER_HEIGHT } from './SectionHeader';
import SectionHeaderMenu from './SectionHeaderMenu';
import { Row, Text, View } from '../components';
import { ProjectIcon } from '../components/ProjectIcon';
import { AppForPinnedListFragment } from '../generated/graphql';
import { PinnedApp, minNumberOfApps } from '../hooks/useGetPinnedApps';
import Alert from '../modules/Alert';
import { Linking } from '../modules/Linking';
import MenuBarModule from '../modules/MenuBarModule';
import { PlatformColor } from '../modules/PlatformColor';
import { getProjectAction, saveProjectAction } from '../modules/Storage';
import { useCurrentTheme } from '../utils/useExpoTheme';

const TILE_ICON_SIZE = 48;
const TILE_GAP = 5;
const TILE_NAME_HEIGHT = 14;
// The space inside the hover fill: more above the icon, so the fill has an even margin.
const TILE_PADDING_TOP = 7;
const TILE_PADDING_BOTTOM = 4;
const TILE_HEIGHT =
  TILE_ICON_SIZE + TILE_GAP + TILE_NAME_HEIGHT + TILE_PADDING_TOP + TILE_PADDING_BOTTOM;

export function getProjectSectionHeight(numberOfApps: number) {
  if (numberOfApps === 0) {
    return 0;
  }

  // The paddings of the section and the gap between the header and the row.
  return SECTION_HEADER_HEIGHT + TILE_HEIGHT + 12;
}

// What a click on a project tile does. The user chooses it in the section header.
const PROJECT_ACTIONS = [
  { id: 'page', label: 'Open on expo.dev' },
  { id: 'development', label: 'Launch latest development build' },
  { id: 'preview', label: 'Launch latest preview build' },
] as const;
type ProjectAction = (typeof PROJECT_ACTIONS)[number]['id'];

// Not in the generated documents: the generated schema is older than the `statuses` and
// `expired` filters. The archive URL is signed, so the query never goes to the cache.
const LATEST_BUILDS_QUERY = gql`
  query GetLatestBuildsForProject($appId: String!, $filter: BuildFilterInput) {
    app {
      byId(appId: $appId) {
        id
        buildsPaginated(first: 10, filter: $filter) {
          edges {
            node {
              __typename
              ... on Build {
                id
                artifacts {
                  applicationArchiveUrl
                }
              }
            }
          }
        }
      }
    }
  }
`;
type LatestBuildsResult = {
  app: {
    byId: {
      buildsPaginated: {
        edges: { node: { artifacts?: { applicationArchiveUrl?: string | null } | null } }[];
      };
    };
  };
};

interface Props {
  apps?: PinnedApp[];
  /** The selected account. "See all" opens its projects. */
  accountName?: string;
  /** Installs and launches a build, as for a build that the user opens from expo.dev. */
  installAppFromURI: (appURI: string) => Promise<void>;
  /** Hides the section. */
  onPressHide: () => void;
}

type TileProps = {
  label: string;
  secondary?: boolean;
  onPress: () => void;
  testID?: string;
  children: React.ReactNode;
};

const Tile = ({ label, secondary, onPress, testID, children }: TileProps) => {
  const [isHovered, setHovered] = useState(false);
  const theme = useCurrentTheme();

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      testID={testID}
      style={[
        styles.tile,
        isHovered && {
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)',
        },
      ]}>
      {children}
      <Text
        size="tiny"
        numberOfLines={1}
        style={[styles.tileName, secondary && styles.tileNameSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
};

export const ProjectsSection = ({ apps, accountName, installAppFromURI, onPressHide }: Props) => {
  const theme = useCurrentTheme();
  const client = useApolloClient();
  const [action, setAction] = useState<ProjectAction>(
    () => PROJECT_ACTIONS.find(({ id }) => id === getProjectAction())?.id ?? 'page'
  );

  const chooseAction = async () => {
    // The first item is the title of the menu.
    const index = await MenuBarModule.showMenu([
      { title: 'Default action for a project', header: true },
      ...PROJECT_ACTIONS.map(({ id, label }) => ({ title: label, checked: id === action })),
    ]);
    const chosen = PROJECT_ACTIONS[index - 1];
    if (chosen) {
      setAction(chosen.id);
      saveProjectAction(chosen.id);
    }
  };

  // The latest finished build of the kind that the user chose, on any platform.
  const launchLatestBuild = async (
    app: AppForPinnedListFragment,
    kind: 'development' | 'preview'
  ) => {
    try {
      const { data } = await client.query<LatestBuildsResult>({
        query: LATEST_BUILDS_QUERY,
        fetchPolicy: 'no-cache',
        variables: {
          appId: app.id,
          filter: {
            ...(kind === 'development' ? { developmentClient: true } : { buildProfile: 'preview' }),
            statuses: ['FINISHED'],
            expired: false,
          },
        },
      });
      const url = data.app.byId.buildsPaginated.edges
        .map(({ node }) => node.artifacts?.applicationArchiveUrl)
        .find(Boolean);
      if (!url) {
        Alert.alert(
          `No ${kind} build found`,
          `${app.name} has no finished ${kind} build that Orbit can launch.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open on expo.dev', onPress: () => openProjectURL(app) },
          ]
        );
        return;
      }
      await installAppFromURI(url);
    } catch (error) {
      Alert.alert(
        'Could not get the latest build',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const onPressProject = (app: AppForPinnedListFragment) =>
    action === 'page' ? openProjectURL(app) : launchLatestBuild(app, action);

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
    <View pt="2.5" style={styles.section}>
      <SectionHeader
        label="Projects"
        onPressHide={onPressHide}
        accessoryLeft={
          <SectionHeaderMenu
            label={PROJECT_ACTIONS.find(({ id }) => id === action)!.label}
            onPress={chooseAction}
            testID="projects-action"
          />
        }
      />
      <Row style={styles.row}>
        {apps.slice(0, minNumberOfApps).map((app) => (
          <Tile key={app.id} label={app.name} onPress={() => onPressProject(app)}>
            <ProjectIcon app={app} size={TILE_ICON_SIZE} />
          </Tile>
        ))}
        <Tile
          label="See all"
          secondary
          onPress={() => {
            // `[account]` is literal: expo.dev then asks which account to open.
            Linking.openURL(`https://expo.dev/accounts/${accountName ?? '[account]'}/projects/`);
            MenuBarModule.closePopover();
          }}
          testID="projects-see-all">
          <View
            style={[
              styles.seeAllIcon,
              { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)' },
            ]}>
            {[0, 1, 2].map((dot) => (
              <View key={dot} style={styles.dot} />
            ))}
          </View>
        </Tile>
      </Row>
    </View>
  );
};

export default ProjectsSection;

const styles = StyleSheet.create({
  row: { paddingHorizontal: 8 },
  // Five equal slots: with fewer projects, the tiles stay in their columns.
  // The tile has its own space above the icon, so the gap below the header is small.
  section: { gap: 2 },
  tile: {
    width: '20%',
    height: TILE_HEIGHT,
    paddingTop: TILE_PADDING_TOP,
    paddingBottom: TILE_PADDING_BOTTOM,
    paddingHorizontal: 3,
    cursor: 'pointer',
    gap: TILE_GAP,
    alignItems: 'center',
    borderRadius: 8,
  },
  tileName: {
    alignSelf: 'stretch',
    height: TILE_NAME_HEIGHT,
    lineHeight: TILE_NAME_HEIGHT,
    textAlign: 'center',
  },
  tileNameSecondary: { color: PlatformColor('labelColor'), opacity: 0.6 },
  seeAllIcon: {
    width: TILE_ICON_SIZE,
    height: TILE_ICON_SIZE,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PlatformColor('labelColor'),
    opacity: 0.6,
  },
});
