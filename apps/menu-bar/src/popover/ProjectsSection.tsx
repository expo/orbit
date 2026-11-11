import { gql, useApolloClient } from '@apollo/client';
import { Config } from 'common-types';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

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
import { formatRelativeTime, RemoteSimulatorProject } from '../utils/remoteSimulator';
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

// Orbit cannot install an Android App Bundle.
function isInstallable(archiveUrl?: string | null) {
  if (!archiveUrl) {
    return false;
  }
  try {
    return !new URL(archiveUrl).pathname.toLowerCase().endsWith('.aab');
  } catch {
    return false;
  }
}

// What a click on a project tile does. The user chooses it in the section header.
const PROJECT_ACTIONS = [
  { id: 'page', label: 'Open on expo.dev' },
  { id: 'latest', label: 'Launch latest app' },
] as const;
type ProjectAction = (typeof PROJECT_ACTIONS)[number]['id'];

// Not in the generated documents: the generated schema is older than the `statuses` and
// `expired` filters. The archive URL is signed, so the query never goes to the cache.
const LATEST_BUILDS_QUERY = gql`
  query GetLatestBuildsForProject(
    $appId: String!
    $developmentIos: BuildFilterInput
    $developmentAndroid: BuildFilterInput
    $previewIos: BuildFilterInput
    $previewAndroid: BuildFilterInput
  ) {
    app {
      byId(appId: $appId) {
        id
        developmentIos: buildsPaginated(first: 5, filter: $developmentIos) {
          ...LatestBuildsForProject
        }
        developmentAndroid: buildsPaginated(first: 5, filter: $developmentAndroid) {
          ...LatestBuildsForProject
        }
        previewIos: buildsPaginated(first: 5, filter: $previewIos) {
          ...LatestBuildsForProject
        }
        previewAndroid: buildsPaginated(first: 5, filter: $previewAndroid) {
          ...LatestBuildsForProject
        }
      }
    }
  }

  fragment LatestBuildsForProject on AppBuildsConnection {
    edges {
      node {
        __typename
        ... on Build {
          ...LatestBuildForProject
        }
      }
    }
  }

  fragment LatestBuildForProject on Build {
    id
    appVersion
    appBuildVersion
    createdAt
    artifacts {
      applicationArchiveUrl
    }
  }
`;
type LatestBuild = {
  appVersion?: string | null;
  appBuildVersion?: string | null;
  createdAt?: string | null;
  artifacts?: { applicationArchiveUrl?: string | null } | null;
};
type LatestBuilds = { edges: { node: LatestBuild }[] };
type LatestBuildsResult = {
  app: {
    byId: {
      developmentIos: LatestBuilds;
      developmentAndroid: LatestBuilds;
      previewIos: LatestBuilds;
      previewAndroid: LatestBuilds;
    };
  };
};

// The line of a build in the menu that asks for the platform: "1.2.0 (100) · 2w ago".
const describeBuild = ({ appVersion, appBuildVersion, createdAt }: LatestBuild) =>
  [
    [appVersion, appBuildVersion ? `(${appBuildVersion})` : undefined].filter(Boolean).join(' '),
    createdAt ? formatRelativeTime(createdAt) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

interface Props {
  apps?: PinnedApp[];
  /** The selected account. "See all" opens its projects. */
  accountName?: string;
  /** Installs and launches a build, as for a build that the user opens from expo.dev. */
  installAppFromURI: (
    appURI: string,
    launchURL?: string,
    deviceId?: string,
    project?: RemoteSimulatorProject
  ) => Promise<void>;
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
    // A stored value that is not `page` is a launch action, also from an earlier version.
    () => (!getProjectAction() || getProjectAction() === 'page' ? 'page' : 'latest')
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

  // The latest finished development build and preview build of the project, for iOS and for
  // Android. With more than one, a menu asks which one to launch.
  const launchLatestBuild = async (app: AppForPinnedListFragment) => {
    type MenuItems = Parameters<typeof MenuBarModule.showMenu>[0];
    const title = { title: `${app.name} · latest builds`, header: true };
    // On macOS the menu opens at once with a loading line, and the builds replace that line.
    // On the other platforms a menu cannot change while it is open, so it opens after.
    const canUpdateMenu = Platform.OS === 'macos';
    const openMenu = canUpdateMenu
      ? MenuBarModule.showMenu([title, { title: 'Loading builds…', disabled: true }])
      : undefined;
    let isMenuOpen = true;
    openMenu?.then(() => {
      isMenuOpen = false;
    });

    let builds: { platform: string; build: LatestBuild }[] = [];
    let items: MenuItems = [];
    let choices: ((typeof builds)[number] | 'page' | undefined)[] = [];
    try {
      const finished = { statuses: ['FINISHED'], expired: false };
      const development = { ...finished, developmentClient: true };
      const preview = { ...finished, buildProfile: 'preview' };
      const { data } = await client.query<LatestBuildsResult>({
        query: LATEST_BUILDS_QUERY,
        fetchPolicy: 'no-cache',
        variables: {
          appId: app.id,
          developmentIos: { ...development, platforms: ['IOS'] },
          developmentAndroid: { ...development, platforms: ['ANDROID'] },
          previewIos: { ...preview, platforms: ['IOS'] },
          previewAndroid: { ...preview, platforms: ['ANDROID'] },
        },
      });
      // The latest build of each kind and platform that has a file to install.
      const latest = (platform: string, { edges }: LatestBuilds) => {
        const build = edges
          .map(({ node }) => node)
          .find((item) => isInstallable(item.artifacts?.applicationArchiveUrl));
        return build ? [{ platform, build }] : [];
      };
      const result = data.app.byId;
      const groups = [
        {
          title: 'Development build',
          builds: [
            ...latest('iOS', result.developmentIos),
            ...latest('Android', result.developmentAndroid),
          ],
        },
        {
          title: 'Preview build',
          builds: [
            ...latest('iOS', result.previewIos),
            ...latest('Android', result.previewAndroid),
          ],
        },
      ].filter((group) => group.builds.length);
      builds = groups.flatMap((group) => group.builds);

      // The items of the menu, and the choice that each item stands for.
      const add = (item: MenuItems[number], choice?: (typeof choices)[number]) => {
        items.push(item);
        choices.push(choice);
      };
      add(title);
      for (const group of groups) {
        add({ separator: true });
        add({ title: group.title, header: true });
        group.builds.forEach((item) =>
          add({ title: item.platform, detail: describeBuild(item.build) }, item)
        );
      }
      if (!builds.length) {
        add({ title: 'No development build or preview build found', disabled: true });
        add({ separator: true });
        add({ title: 'Open on expo.dev' }, 'page');
      }
    } catch (error) {
      items = [title, { title: 'Could not get the builds', disabled: true }];
      choices = [];
      if (!canUpdateMenu) {
        Alert.alert(
          'Could not get the latest build',
          error instanceof Error ? error.message : String(error)
        );
        return;
      }
    }

    let index: number;
    if (openMenu) {
      if (!isMenuOpen) {
        return; // The user closed the menu before the builds came.
      }
      await MenuBarModule.updateMenu(items);
      index = await openMenu;
    } else if (builds.length === 1) {
      // One build and no open menu: launch it with no question.
      index = choices.indexOf(builds[0]);
    } else {
      index = await MenuBarModule.showMenu(items);
    }

    const choice = choices[index];
    if (choice === 'page') {
      openProjectURL(app);
    } else if (choice?.build.artifacts?.applicationArchiveUrl) {
      // A new remote session for this build runs under this project.
      await installAppFromURI(choice.build.artifacts.applicationArchiveUrl, undefined, undefined, {
        id: app.id,
        label: `${app.ownerAccount.name}/${app.slug}`,
      });
    }
  };

  const onPressProject = (app: AppForPinnedListFragment) =>
    action === 'page' ? openProjectURL(app) : launchLatestBuild(app);

  const openProjectURL = (app: AppForPinnedListFragment) => {
    Linking.openURL(
      `${Config.website.origin}/accounts/${app.ownerAccount.name}/projects/${app.slug}/builds`
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
            Linking.openURL(
              `${Config.website.origin}/accounts/${accountName ?? '[account]'}/projects/`
            );
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
