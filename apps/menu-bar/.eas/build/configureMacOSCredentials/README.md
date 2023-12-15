# My EAS Build function

This is an EAS Build function written in TypeScript. It can be used as a step in a [custom build](https://docs.expo.dev/preview/custom-build-config/).

## How to use it

1. Install dependencies: `npm install`.
2. Implement your function in `src/index.ts`.
3. Install [`ncc`](https://github.com/vercel/ncc) if not yet installed: `npm install -g @vercel/ncc`.
4. Compile the function with `ncc` by running `npm run build`. Ensure that the `build` directory is not ignored by `.gitignore` / `.easignore`, it must be included in the [archive uploaded when running `eas build`](https://expo.fyi/eas-build-archive).
5. Use the function in a custom build YAML config. For example:

    ```yml
    build:
        name: Custom build
        steps:
            - run:
                name: Hi!
                command: echo "Hello! Let's run a custom function!"
            - my_function:
                id: my-function-call
            - run:
                name: Bye!
                command: echo "Bye! The custom function has finished its job."

    functions:
        my_function:
            name: my-function
            path: ./my-function # The path is resolved relative to this config file.
    ```
## Learn more

Refer to the [custom builds documentation](https://docs.expo.dev/preview/custom-build-config/).