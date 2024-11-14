const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const {
  resolver: { sourceExts, assetExts },
} = config;

module.exports = {
  ...config,
  watchFolders: [workspaceRoot],
  resolver: {
    ...config.resolver,
    disableHierarchicalLookup: true,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],

    resolveRequest: (context, moduleName, platform) => {
      if (
        platform === 'macos' &&
        (moduleName === 'react-native' || moduleName.startsWith('react-native/'))
      ) {
        const newModuleName = moduleName.replace('react-native', 'react-native-macos');
        return context.resolveRequest(context, newModuleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
  },
  serializer: {
    ...config.serializer,
    getModulesRunBeforeMainModule() {
      return [
        require.resolve('react-native/Libraries/Core/InitializeCore'),
        require.resolve('react-native-macos/Libraries/Core/InitializeCore'),
        ...config.serializer.getModulesRunBeforeMainModule(),
      ];
    },
  },
};
