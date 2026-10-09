export type ShellCommandStatus = {
  /** True when `orbit` is exposed on the PATH and points at Orbit's launcher script. */
  installed: boolean;
  /** The launcher script Orbit generates. It points at the CLI bundled in the installed app. */
  shimPath: string;
  /**
   * Where the command is exposed: the `orbit` symlink on macOS/Linux, or the directory added to
   * the user PATH on Windows.
   */
  linkPath: string;
  /** False when `linkPath` isn't on the user's PATH, so `orbit` won't resolve in new shells. */
  onPath: boolean;
  /** Set when `linkPath` is taken by something Orbit didn't install. Orbit never overwrites it. */
  conflict?: string;
};
