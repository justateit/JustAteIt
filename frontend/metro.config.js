const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Fix: EINVAL readlink crash on Windows / OneDrive — Metro symlink resolution
// fails when the project lives inside a cloud-synced folder that virtualises
// the filesystem. Disabling symlinks avoids the ensureFileSystemPatched error
// thrown by nativewind/metro without affecting functionality.
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: false,
};

module.exports = withNativeWind(config, { input: './app/globals.css' });