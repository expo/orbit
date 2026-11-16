# Contributing to Expo Orbit

## 📦 Download and Setup

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device. (`git remote add upstream git@github.com:expo/orbit.git` 😉).
2. Make sure you have the following packages globally installed on your system:
   - [node](https://nodejs.org/) (Node 20 or higher is recommended)
   - [yarn](https://yarnpkg.com/) (1.22 or higher is recommended)
   - [ruby](https://www.ruby-lang.org/) (3.2 or higher is recommended)
3. Install the Node packages (`yarn install`).
4. Install the Ruby packages (`bundle install`) inside the `apps/menu-bar` directory.
5. Install the Pods (`npx pod-install`) inside the `apps/menu-bar` directory.
6. Build `common-types`, `eas-shared` and `cli` by running `yarn build` at the root of the project.
7. Inside the `apps/cli` directory run `yarn archive` to generate the standalone executable used by the `menu-bar`.
8. Finally, run `yarn update-cli` inside the `apps/menu-bar` directory to update the local CLI file.

### Experimental: the CLI on Hermes (`ORBIT_HERMES_CLI`)

By default the macOS app bundles the CLI as `pkg`-built Node binaries. Running `pod install` with `ORBIT_HERMES_CLI=1` (or setting `"hermesCli": "true"` in `apps/menu-bar/macos/Podfile.properties.json`) opts into running it on the app's own Hermes through [hermes-node](https://github.com/gabrieldonadel/hermes-node) instead. The Xcode "Build CLI" phase then builds `apps/cli` to Hermes bytecode plus a small `orbit-cli` launcher (`apps/cli/hermes-launcher/`) in every configuration.

Hermes and hermes-node are downloaded prebuilt for the hermes-node commit pinned in `apps/menu-bar/macos/scripts/hermes-node.sh` (`HERMES_NODE_REF`), from that commit's release in [hermes-node](https://github.com/gabrieldonadel/hermes-node/releases), where hermes-node's CI publishes them. They're only used if the release's `SHA256SUMS` matches `HERMES_NODE_PREBUILT_SHA256`, pinned next to the ref; update both together. If that commit has no release yet, they're built from source instead, which needs `cmake` and `ninja` and takes ~10–15 min the first time. Set `HERMES_NODE_DIR` to work against a local hermes-node checkout. Running `pod install` without the flag goes back to the default.

## 🏎️ Start the Development Environment

1. From the `apps/menu-bar` directory, run `yarn start` to start Metro Bundler.
2. Run `yarn macos` and build the `menu-bar` app with Xcode.
3. Orbit should automatically show up in your menu bar.

## 📝 Writing a Commit Message

> [!note]
> If this is your first time committing to a large public repo, you could look through this neat tutorial: ["How to Write a Git Commit Message"](https://chris.beams.io/posts/git-commit/)

Commit messages are formatted like so: `[menu-bar] Title`. Examples:

```
[cli] Fix typo in xxx
[devices-manager] Add test-case for custom devices
[menu-bar] Update loading icon
```

## 🔎 Before Submitting a PR

To help keep CI green, please make sure of the following:

- Run `yarn lint --fix` to fix the formatting of the code. Ensure that `yarn lint` succeeds without errors or warnings.

## 📚 Additional Resources

Hungry for more? Check out these great guides:

- [Expo JavaScript/TypeScript Style Guide](https://github.com/expo/expo/blob/master/guides/Expo%20JavaScript%20Style%20Guide.md)
- [Git and Code Reviews at Expo](https://github.com/expo/expo/blob/master/guides/Git%20and%20Code%20Reviews.md)
- [Our Open Source Standards](https://github.com/expo/expo/blob/master/guides/Our%20Open%20Source%20Standards.md)
