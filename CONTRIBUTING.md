# Contributing to Expo Orbit

## 📦 Download and Setup

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device. (`git remote add upstream git@github.com:expo/orbit.git` 😉).
2. Make sure you have the following packages globally installed on your system:
   - [node](https://nodejs.org/) (Node 20 or higher is recommended)
   - [yarn](https://yarnpkg.com/) (1.22 or higher is recommended)
   - [ruby](https://www.ruby-lang.org/) (3.2 or higher is recommended)
   - [cmake](https://cmake.org/) and [ninja](https://ninja-build.org/) (`brew install cmake ninja`), to build Hermes and [hermes-node](https://github.com/gabrieldonadel/hermes-node), which the macOS CLI runs on
3. Install the Node packages (`yarn install`).
4. Install the Ruby packages (`bundle install`) inside the `apps/menu-bar` directory.
5. Install the Pods (`npx pod-install`) inside the `apps/menu-bar` directory. The first run fetches the pinned hermes-node and Hermes sources into `apps/menu-bar/macos/vendor/`.
6. Build `common-types`, `eas-shared` and `cli` by running `yarn build` at the root of the project.

The macOS app builds the CLI itself (Xcode's "Build CLI" phase, `apps/menu-bar/macos/scripts/archive_cli.sh`): it bundles `apps/cli` to Hermes bytecode and builds the `orbit-cli` launcher against the app's Hermes framework. The first build also compiles hermes-node and OpenSSL, which takes a while; later builds reuse them.

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
