# Contributing to Expo Orbit

## 📦 Download and Setup

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device. (`git remote add upstream git@github.com:expo/orbit.git` 😉).
2. Make sure you have the following packages globally installed on your system:
   - [node](https://nodejs.org/) (Node 12 or higher is recommended)
   - [yarn](https://yarnpkg.com/)
3. Install the Node packages (`yarn install`).
4. Build `common-types`, `eas-shared` and `cli` by running `yarn build` at the root of the project.
5. Inside the `apps/cli` directory run `yarn archive` to generate the standalone executable used by the `menu-bar`.
6. Finally, run `yarn update-cli` inside the `apps/menu-bar` directory to update the local CLI file.

## 🏎️ Start the Development environment

1. From the `apps/menu-bar` directory, run `yarn start` to start Metro Bundler.
2. Run `xed macos` and build the `menu-bar` app with Xcode.
3. And Orbit should automatically show up in your menu bar.

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

Hungry for more, check out these great guides:

- [Expo JavaScript/TypeScript Style Guide](https://github.com/expo/expo/blob/master/guides/Expo%20JavaScript%20Style%20Guide.md)
- [Git and Code Reviews at Expo](https://github.com/expo/expo/blob/master/guides/Git%20and%20Code%20Reviews.md)
- [Our Open Source Standards](https://github.com/expo/expo/blob/master/guides/Our%20Open%20Source%20Standards.md)
