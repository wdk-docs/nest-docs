# 工作区

Nest 有两种组织代码的模式:

- **标准模式** : 对于构建具有自己的依赖项和设置、不需要为共享模块进行优化或优化复杂构建的独立项目应用程序非常有用。这是默认模式。
- **monorepo 模式** : 这种模式将代码工件视为轻量级的单一项目的一部分，可能更适合开发团队和/或多项目环境。
  它自动化了部分构建过程，使创建和组合模块化组件变得更容易，促进了代码重用，使集成测试更容易，使它更容易共享项目范围内的工件，如 eslint 规则和其他配置策略，比 github 子模块更容易使用。
  Monorepo 模式使用了一个 **workspace** 的概念，在`nest-cli.json`文件中表示，以协调 Monorepo 组件之间的关系。

需要注意的是，实际上 Nest 的所有特性都是独立于代码组织模式的。
这个选择的 **唯一的** 影响是项目是如何组成的，以及构建构件是如何生成的。
所有其他功能，从 CLI 到核心模块再到附加模块，在两种模式下都是一样的。

此外，您可以在任何时候轻松地从 **标准模式**切换到**monorepo 模式** ，所以您可以推迟这个决定，直到其中一种或另一种方法的好处变得更清楚。

## 标准模式

当你运行`nest new`时，一个新的 **项目** 会使用一个内置原理图为你创建。
Nest 做了以下工作:

1.  创建一个新文件夹，对应于你提供给`nest new`的`name`参数
2.  用与最小基础级 Nest 应用程序对应的默认文件填充该文件夹。
    你可以在[typescript-starter](https://github.com/nestjs/typescript-starter)库中查看这些文件。
3.  提供额外的文件，如 `nest-cli.json` ， `package.json` 和 `tsconfig.json` ，配置和启用各种工具来编译，测试和服务您的应用程序。

从那里，你可以修改启动器文件，添加新组件，添加依赖项(例如， `npm install` )，或者开发你的应用程序，如本文档其余部分所述。

## Monorepo 模式

要启用 monorepo 模式，你需要从一个 _standard mode_ 结构开始，然后添加 **projects** 。
一个项目可以是一个完整的 **应用程序**(你可以用命令 `nest generate app` 添加到工作区中)或者一个**库** (你可以用命令 `nest generate library` 添加到工作区中)。
我们将在下面详细讨论这些特定类型的项目组件。
现在要注意的关键点是，将项目添加到现有的标准模式结构的行为将其转换为 Monorepo 模式。
让我们看一个例子。

如果我们运行:

```bash
nest new my-project
```

我们已经构造了一个 _standard mode_ 结构，其文件夹结构如下:

<div class="file-tree">
  <div class="item">node_modules</div>
  <div class="item">src</div>
  <div class="children">
    <div class="item">app.controller.ts</div>
    <div class="item">app.module.ts</div>
    <div class="item">app.service.ts</div>
    <div class="item">main.ts</div>
  </div>
  <div class="item">nest-cli.json</div>
  <div class="item">package.json</div>
  <div class="item">tsconfig.json</div>
  <div class="item">.eslintrc.js</div>
</div>

我们可以将其转换为如下的单模态结构:

```bash
cd my-project
nest generate app my-app
```

此时， `nest` 将现有结构转换为 **monorepo 模式** 结构。
这导致了一些重要的变化。
文件夹结构现在看起来像这样:

<div class="file-tree">
  <div class="item">apps</div>
    <div class="children">
      <div class="item">my-app</div>
      <div class="children">
        <div class="item">src</div>
        <div class="children">
          <div class="item">app.controller.ts</div>
          <div class="item">app.module.ts</div>
          <div class="item">app.service.ts</div>
          <div class="item">main.ts</div>
        </div>
        <div class="item">tsconfig.app.json</div>
      </div>
      <div class="item">my-project</div>
      <div class="children">
        <div class="item">src</div>
        <div class="children">
          <div class="item">app.controller.ts</div>
          <div class="item">app.module.ts</div>
          <div class="item">app.service.ts</div>
          <div class="item">main.ts</div>
        </div>
        <div class="item">tsconfig.app.json</div>
      </div>
    </div>
  <div class="item">nest-cli.json</div>
  <div class="item">package.json</div>
  <div class="item">tsconfig.json</div>
  <div class="item">.eslintrc.js</div>
</div>

The `generate app` schematic has reorganized the code - moving each **application** project under the `apps` folder, and adding a project-specific `tsconfig.app.json` file in each project's root folder.
Our original `my-project` app has become the **default project** for the monorepo, and is now a peer with the just-added `my-app`, located under the `apps` folder.
We'll cover default projects below.

> error **Warning** The conversion of a standard mode structure to monorepo only works for projects that have followed the canonical Nest project structure.
> Specifically, during conversion, the schematic attempts to relocate the `src` and `test` folders in a project folder beneath the `apps` folder in the root.
> If a project does not use this structure, the conversion will fail or produce unreliable results.

## 工作区项目

A monorepo uses the concept of a workspace to manage its member entities.
Workspaces are composed of **projects** .
A project may be either:

- an **application** : a full Nest application including a `main.ts` file to bootstrap the application.
  Aside from compile and build considerations, an application-type project within a workspace is functionally identical to an application within a _standard mode_ structure.
- a **library** : a library is a way of packaging a general purpose set of features (modules, providers, controllers, etc.) that can be used within other projects.
  A library cannot run on its own, and has no `main.ts` file.
  Read more about libraries [here](/cli/libraries).

All workspaces have a **default project** (which should be an application-type project).
This is defined by the top-level `"root"` property in the `nest-cli.json` file, which points at the root of the default project (see [CLI properties](/cli/monorepo#cli-properties) below for more details).
Usually, this is the **standard mode** application you started with, and later converted to a monorepo using `nest generate app`.
When you follow these steps, this property is populated automatically.

Default projects are used by `nest` commands like `nest build` and `nest start` when a project name is not supplied.

For example, in the above monorepo structure, running

```bash
$ nest start
```

will start up the `my-project` app.
To start `my-app`, we'd use:

```bash
$ nest start my-app
```

## 应用程序

Application-type projects, or what we might informally refer to as just "applications", are complete Nest applications that you can run and deploy.
You generate an application-type project with `nest generate app`.

This command automatically generates a project skeleton, including the standard `src` and `test` folders from the [typescript starter](https://github.com/nestjs/typescript-starter).
Unlike standard mode, an application project in a monorepo does not have any of the package dependency (`package.json`) or other project configuration artifacts like `.prettierrc` and `.eslintrc.js`.
Instead, the monorepo-wide dependencies and config files are used.

However, the schematic does generate a project-specific `tsconfig.app.json` file in the root folder of the project.
This config file automatically sets appropriate build options, including setting the compilation output folder properly.
The file extends the top-level (monorepo) `tsconfig.json` file, so you can manage global settings monorepo-wide, but override them if needed at the project level.

## 库

As mentioned, library-type projects, or simply "libraries", are packages of Nest components that need to be composed into applications in order to run.
You generate a library-type project with `nest generate library`.
Deciding what belongs in a library is an architectural design decision.
We discuss libraries in depth in the [libraries](/cli/libraries) chapter.

## CLI 属性

Nest keeps the metadata needed to organize, build and deploy both standard and monorepo structured projects in the `nest-cli.json` file.
Nest automatically adds to and updates this file as you add projects, so you usually do not have to think about it or edit its contents.
However, there are some settings you may want to change manually, so it's helpful to have an overview understanding of the file.

After running the steps above to create a monorepo, our `nest-cli.json` file looks like this:

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/my-project/src",
  "monorepo": true,
  "root": "apps/my-project",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "apps/my-project/tsconfig.app.json"
  },
  "projects": {
    "my-project": {
      "type": "application",
      "root": "apps/my-project",
      "entryFile": "main",
      "sourceRoot": "apps/my-project/src",
      "compilerOptions": {
        "tsConfigPath": "apps/my-project/tsconfig.app.json"
      }
    },
    "my-app": {
      "type": "application",
      "root": "apps/my-app",
      "entryFile": "main",
      "sourceRoot": "apps/my-app/src",
      "compilerOptions": {
        "tsConfigPath": "apps/my-app/tsconfig.app.json"
      }
    }
  }
}
```

The file is divided into sections:

- a global section with top-level properties controlling standard and monorepo-wide settings
- a top level property (`"projects"`) with metadata about each project.
  This section is present only for monorepo-mode structures.

The top-level properties are as follows:

- `"collection"`: points at the collection of schematics used to generate components; you generally should not change this value
- `"sourceRoot"`: points at the root of the source code for the single project in standard mode structures, or the _default project_ in monorepo mode structures
- `"compilerOptions"`: a map with keys specifying compiler options and values specifying the option setting; see details below
- `"generateOptions"`: a map with keys specifying global generate options and values specifying the option setting; see details below
- `"monorepo"`: (monorepo only) for a monorepo mode structure, this value is always `true`
- `"root"`: (monorepo only) points at the project root of the _default project_

## 全局的编译器选项

These properties specify the compiler to use as well as various options that affect **any** compilation step, whether as part of `nest build` or `nest start`, and regardless of the compiler, whether `tsc` or webpack.

| Property Name | Property Value Type | Description                                                 |
| ------------- | ------------------- | ----------------------------------------------------------- |
| `webpack`     | boolean             | If `true`, use [webpack compiler](https://webpack.js.org/). |

If `false` or not present, use `tsc`.
In monorepo mode, the default is `true` (use webpack), in standard mode, the default is `false` (use `tsc`).
See below for details.
|
| `tsConfigPath` | string | ( **monorepo only** ) Points at the file containing the `tsconfig.json` settings that will be used when `nest build` or `nest start` is called without a `project` option (e.g., when the default project is built or started).
|
| `webpackConfigPath` | string | Points at a webpack options file.
If not specified, Nest looks for the file `webpack.config.js`.
See below for more details.
|
| `deleteOutDir` | boolean | If `true`, whenever the compiler is invoked, it will first remove the compilation output directory (as configured in `tsconfig.json`, where the default is `./dist`).
|
| `assets` | array | Enables automatically distributing non-TypeScript assets whenever a compilation step begins (asset distribution does **not** happen on incremental compiles in `--watch` mode).
See below for details.
|
| `watchAssets` | boolean | If `true`, run in watch-mode, watching **all** non-TypeScript assets.
(For more fine-grained control of the assets to watch, see [Assets](cli/monorepo#assets) section below).
|

## 全局生成选项

These properties specify the default generate options to be used by the `nest generate` command.

| Property Name | Property Value Type | Description                                                                                                         |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `spec`        | boolean _or_ object | If the value is boolean, a value of `true` enables `spec` generation by default and a value of `false` disables it. |

A flag passed on the CLI command line overrides this setting, as does a project-specific `generateOptions` setting (more below).
If the value is an object, each key represents a schematic name, and the boolean value determines whether the default spec generation is enabled / disabled for that specific schematic.
|

The following example uses a boolean value to specify that spec file generation should be disabled by default for all projects:

```javascript
{
  "generateOptions": {
    "spec": false
  },
  ...
}
```

In the following example, `spec` file generation is disabled only for `service` schematics (e.g., `nest generate service...`):

```javascript
{
  "generateOptions": {
    "spec": {
      "service": false
    }
  },
  ...
}
```

> warning **Warning** When specifying the `spec` as an object, the key for the generation schematic does not currently support automatic alias handling.
> This means that specifying a key as for example `service: false` and trying to generate a service via the alias `s`, the spec would still be generated.
> To make sure both the normal schematic name and the alias work as intended, specify both the normal command name as well as the alias, as seen below.
>
> ```javascript
> {
>   "generateOptions": {
>     "spec": {
>       "service": false,
>       "s": false
>     }
>   },
>   ...
> }
> ```

## 具体项目生成选项

In addition to providing global generate options, you may also specify project-specific generate options.
The project specific generate options follow the exact same format as the global generate options, but are specified directly on each project.

Project-specific generate options override global generate options.

```javascript
{
  "projects": {
    "cats-project": {
      "generateOptions": {
        "spec": {
          "service": false
        }
      },
      ...
    }
  },
  ...
}
```

> warning **Warning** The order of precedence for generate options is as follows.
> Options specified on the CLI command line take precedence over project-specific options.
> Project-specific options override global options.

## 指定编译器

The reason for the different default compilers is that for larger projects (e.g., more typical in a monorepo) webpack can have significant advantages in build times and in producing a single file bundling all project components together.
If you wish to generate individual files, set `"webpack"` to `false`, which will cause the build process to use `tsc`.

## Webpack 可选的

The webpack options file can contain standard [webpack configuration options](https://webpack.js.org/configuration/).
For example, to tell webpack to bundle `node_modules` (which are excluded by default), add the following to `webpack.config.js`:

```javascript
module.exports = {
  externals: [],
};
```

Since the webpack config file is a JavaScript file, you can even expose a function that takes default options and returns a modified object:

```javascript
module.exports = function (options) {
  return {
    ...options,
    externals: [],
  };
};
```

## 资产

TypeScript compilation automatically distributes compiler output (`.js` and `.d.ts` files) to the specified output directory.
It can also be convenient to distribute non-TypeScript files, such as `.graphql` files, `images`, `.html` files and other assets.
This allows you to treat `nest build` (and any initial compilation step) as a lightweight **development build** step, where you may be editing non-TypeScript files and iteratively compiling and testing.
The assets should be located in the `src` folder otherwise they will not be copied.

The value of the `assets` key should be an array of elements specifying the files to be distributed.
The elements can be simple strings with `glob`-like file specs, for example:

```typescript
"assets": ["**/*.graphql"],
"watchAssets": true,
```

For finer control, the elements can be objects with the following keys:

- `"include"`: `glob`-like file specifications for the assets to be distributed
- `"exclude"`: `glob`-like file specifications for assets to be **excluded** from the `include` list
- `"outDir"`: a string specifying the path (relative to the root folder) where the assets should be distributed.
  Defaults to the same output directory configured for compiler output.
- `"watchAssets"`: boolean; if `true`, run in watch mode watching specified assets

For example:

```typescript
"assets": [
  { "include": " **/*.graphql", "exclude": "** /omitted.graphql", "watchAssets": true },
]
```

> warning **Warning** Setting `watchAssets` in a top-level `compilerOptions` property overrides any `watchAssets` settings within the `assets` property.

## 项目属性

这个元素只存在于单模结构中。
你通常不应该编辑这些属性，因为它们被 Nest 用来在 monorepo 中定位项目及其配置选项。
