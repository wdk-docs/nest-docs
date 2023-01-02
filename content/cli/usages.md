# CLI 命令参考

## nest new

创建一个新的（标准模式）巢项目。

```bash
$ nest new <name> [options]
$ nest n <name> [options]
```

### 描述

创建并初始化一个新的 NEST 项目。提示软件包管理器。

- Creates a folder with the given `<name>`
- Populates the folder with configuration files
- Creates sub-folders for source code (`/src`) and end-to-end tests (`/test`)
- Populates the sub-folders with default files for app components and tests

### 参数

| Argument | Description  |
| -------- | ------------ |
| `<name>` | 新项目的名称 |

### 选项

| Option                                | Description                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`                           | Reports changes that would be made, but does not change the filesystem.<br/> Alias: `-d`                            |
| `--skip-git`                          | Skip git repository initialization.<br/> Alias: `-g`                                                                |
| `--skip-install`                      | Skip package installation.<br/> Alias: `-s`                                                                         |
| `--package-manager [package-manager]` | Specify package manager. Use `npm`, `yarn`, or `pnpm`. Package manager must be installed globally.<br/> Alias: `-p` |
| `--language [language]`               | Specify programming language (`TS` or `JS`).<br/> Alias: `-l`                                                       |
| `--collection [collectionName]`       | Specify schematics collection. Use package name of installed npm package containing schematic.<br/> Alias: `-c`     |

## nest generate

基于原理图生成和/或修改文件

```bash
$ nest generate <schematic> <name> [options]
$ nest g <schematic> <name> [options]
```

### 参数

| Argument      | Description                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `<schematic>` | The `schematic` or `collection:schematic` to generate. See the table below for the available schematics. |
| `<name>`      | The name of the generated component.                                                                     |

### 原理图

| Name          | Alias | Description                                                                                                  |
| ------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| `app`         |       | Generate a new application within a monorepo (converting to monorepo if it's a standard structure).          |
| `library`     | `lib` | Generate a new library within a monorepo (converting to monorepo if it's a standard structure).              |
| `class`       | `cl`  | Generate a new class.                                                                                        |
| `controller`  | `co`  | Generate a controller declaration.                                                                           |
| `decorator`   | `d`   | Generate a custom decorator.                                                                                 |
| `filter`      | `f`   | Generate a filter declaration.                                                                               |
| `gateway`     | `ga`  | Generate a gateway declaration.                                                                              |
| `guard`       | `gu`  | Generate a guard declaration.                                                                                |
| `interface`   |       | Generate an interface.                                                                                       |
| `interceptor` | `in`  | Generate an interceptor declaration.                                                                         |
| `middleware`  | `mi`  | Generate a middleware declaration.                                                                           |
| `module`      | `mo`  | Generate a module declaration.                                                                               |
| `pipe`        | `pi`  | Generate a pipe declaration.                                                                                 |
| `provider`    | `pr`  | Generate a provider declaration.                                                                             |
| `resolver`    | `r`   | Generate a resolver declaration.                                                                             |
| `resource`    | `res` | Generate a new CRUD resource. See the [CRUD (resource) generator](/recipes/crud-generator) for more details. |
| `service`     | `s`   | Generate a service declaration.                                                                              |

### Options

| Option                          | Description                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--dry-run`                     | Reports changes that would be made, but does not change the filesystem.<br/> Alias: `-d`                        |
| `--project [project]`           | Project that element should be added to.<br/> Alias: `-p`                                                       |
| `--flat`                        | Do not generate a folder for the element.                                                                       |
| `--collection [collectionName]` | Specify schematics collection. Use package name of installed npm package containing schematic.<br/> Alias: `-c` |
| `--spec`                        | Enforce spec files generation (default)                                                                         |
| `--no-spec`                     | Disable spec files generation                                                                                   |

## nest build

将应用程序或工作区编译到输出文件夹中。

```bash
$ nest build <name> [options]
```

### Arguments

| Argument | Description                       |
| -------- | --------------------------------- |
| `<name>` | The name of the project to build. |

### Options

| Option            | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `--path [path]`   | Path to `tsconfig` file. <br/>Alias `-p`               |
| `--config [path]` | Path to `nest-cli` configuration file. <br/>Alias `-c` |
| `--watch`         | Run in watch mode (live-reload) <br/>Alias `-w`        |
| `--webpack`       | Use webpack for compilation.                           |
| `--webpackPath`   | Path to webpack configuration.                         |
| `--tsc`           | Force use `tsc` for compilation.                       |

## nest start

编译并运行应用程序（或工作区中的默认项目）。

```bash
$ nest start <name> [options]
```

### Arguments

| Argument | Description                     |
| -------- | ------------------------------- |
| `<name>` | The name of the project to run. |

### Options

| Option                  | Description                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--path [path]`         | Path to `tsconfig` file. <br/>Alias `-p`                                                                             |
| `--config [path]`       | Path to `nest-cli` configuration file. <br/>Alias `-c`                                                               |
| `--watch`               | Run in watch mode (live-reload) <br/>Alias `-w`                                                                      |
| `--preserveWatchOutput` | Keep outdated console output in watch mode instead of clearing the screen. (`tsc` watch mode only)                   |
| `--watchAssets`         | Run in watch mode (live-reload), watching non-TS files (assets). See [Assets](cli/monorepo#assets) for more details. |
| `--debug [hostport]`    | Run in debug mode (with --inspect flag) <br/>Alias `-d`                                                              |
| `--webpack`             | Use webpack for compilation.                                                                                         |
| `--webpackPath`         | Path to webpack configuration.                                                                                       |
| `--tsc`                 | Force use `tsc` for compilation.                                                                                     |
| `--exec [binary]`       | Binary to run (default: `node`). <br/>Alias `-e`                                                                     |

## nest add

导入已包装为 **巢库** 的库，运行其安装示意图。

```bash
$ nest add <name> [options]
```

### Arguments

| Argument | Description                        |
| -------- | ---------------------------------- |
| `<name>` | The name of the library to import. |

<!-- ## nest update

依据 `package.json` `"dependencies"` 列表更新 `@nestjs` 到它们 `@latest` 版本.

### 选项

| Option    | Description                                                             |
| --------- | ----------------------------------------------------------------------- |
| `--force` | Do **upgrade** instead of update <br/>Alias `-f`                        |
| `--tag`   | Update to tagged version (use `@latest`, `@<tag>`, etc) <br/>Alias `-t` | -->

## nest info

显示有关已安装的 Nest 软件包和其他有用的系统信息的信息。例如：

```bash
$ nest info
```

```bash
 _   _             _      ___  _____  _____  _     _____
| \ | |           | |    |_  |/  ___|/  __ \| |   |_   _|
|  \| |  ___  ___ | |_     | |\ `--. | /  \/| |     | |
| . ` | / _ \/ __|| __|    | | `--. \| |    | |     | |
| |\  ||  __/\__ \| |_ /\__/ //\__/ /| \__/\| |_____| |_
\_| \_/ \___||___/ \__|\____/ \____/  \____/\_____/\___/

[System Information]
OS Version : macOS High Sierra
NodeJS Version : v8.9.0
YARN Version : 1.5.1
[Nest Information]
microservices version : 6.0.0
websockets version : 6.0.0
testing version : 6.0.0
common version : 6.0.0
core version : 6.0.0
```
