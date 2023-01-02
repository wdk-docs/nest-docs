# 热重载

对应用程序的引导过程影响最大的是 **TypeScript 编译** 。
幸运的是，使用[webpack](https://github.com/webpack/webpack) HMR(热模块替换)，我们不需要在每次发生更改时重新编译整个项目。
这大大减少了实例化应用程序所需的时间，并使迭代开发变得更容易。

!!! warning

    注意 `webpack` 不会自动复制你的资源(例如: `graphql` 文件)到 `dist` 文件夹。

> 类似地， `webpack` 不兼容 glob 的静态路径(例如， `TypeOrmModule` 中的 `entities` 属性)。

# 使用 CLI

如果使用[Nest CLI](https://docs.nestjs.com/cli/overview)，配置过程非常简单。
CLI 包装了 `webpack` ，它允许使用 `HotModuleReplacementPlugin` 。

## 安装

首先安装所需的软件包:

```bash
$ npm i --save-dev webpack-node-externals run-script-webpack-plugin webpack
```

!!! info "**Hint**"

    If you use **Yarn Berry** (not classic Yarn), install the `webpack-pnp-externals` package instead of the `webpack-node-externals`.

## 配置

Once the installation is complete, create a `webpack-hmr.config.js` file in the root directory of your application.

```typescript
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: ['webpack/hot/poll?100', options.entry],
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      new RunScriptWebpackPlugin({ name: options.output.filename }),
    ],
  };
};
```

!!! info "**Hint**"

    With **Yarn Berry** (not classic Yarn), instead of using the `nodeExternals` in the `externals` configuration property, use the `WebpackPnpExternals` from `webpack-pnp-externals` package: `WebpackPnpExternals({{ '{' }} exclude: ['webpack/hot/poll?100'] {{ '}' }})`.

This function takes the original object containing the default webpack configuration as a first argument, and the reference to the underlying `webpack` package used by the Nest CLI as the second one.
Also, it returns a modified webpack configuration with the `HotModuleReplacementPlugin`, `WatchIgnorePlugin`, and `RunScriptWebpackPlugin` plugins.

## Hot-Module Replacement

To enable **HMR** , open the application entry file (`main.ts`) and add the following webpack-related instructions:

```typescript
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
```

To simplify the execution process, add a script to your `package.json` file.

```json
"start:dev": "nest build --webpack --webpackPath webpack-hmr.config.js --watch"
```

Now simply open your command line and run the following command:

```bash
$ npm run start:dev
```

# 不实用 CLI

如果你没有使用[Nest CLI](https://docs.nestjs.com/cli/overview)，配置会稍微复杂一些(需要更多的手动步骤)。

## 安装

First install the required packages:

```bash
$ npm i --save-dev webpack webpack-cli webpack-node-externals ts-loader run-script-webpack-plugin
```

!!! info "**Hint**"

    If you use **Yarn Berry** (not classic Yarn), install the `webpack-pnp-externals` package instead of the `webpack-node-externals`.

## 配置

Once the installation is complete, create a `webpack.config.js` file in the root directory of your application.

```typescript
const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = {
  entry: ['webpack/hot/poll?100', './src/main.ts'],
  target: 'node',
  externals: [
    nodeExternals({
      allowlist: ['webpack/hot/poll?100'],
    }),
  ],
  module: {
    rules: [
      {
        test: /.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  mode: 'development',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new RunScriptWebpackPlugin({ name: 'server.js' }),
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'server.js',
  },
};
```

!!! info "**Hint**"

    With **Yarn Berry** (not classic Yarn), instead of using the `nodeExternals` in the `externals` configuration property, use the `WebpackPnpExternals` from `webpack-pnp-externals` package: `WebpackPnpExternals({{ '{' }} exclude: ['webpack/hot/poll?100'] {{ '}' }})`.

This configuration tells webpack a few essential things about your application: location of the entry file, which directory should be used to hold **compiled** files, and what kind of loader we want to use to compile source files.
Generally, you should be able to use this file as-is, even if you don't fully understand all of the options.

## Hot-Module Replacement

To enable **HMR** , open the application entry file (`main.ts`) and add the following webpack-related instructions:

```typescript
declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
```

To simplify the execution process, add a script to your `package.json` file.

```json
"start:dev": "webpack --config webpack.config.js --watch"
```

Now simply open your command line and run the following command:

```bash
$ npm run start:dev
```

## 示例

A working example is available [here](https://github.com/nestjs/nest/tree/master/sample/08-webpack).

## TypeORM

If you're using `@nestjs/typeorm`, you'll need to add `keepConnectionAlive: true` to your TypeORM configuration.
