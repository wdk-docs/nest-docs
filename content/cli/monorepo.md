# 工作区

Nest 有两种组织代码的模式:

- **标准模式** : 对于构建具有自己的依赖项和设置、不需要为共享模块进行优化或优化复杂构建的独立项目应用程序非常有用。这是默认模式。
- **monorepo 模式** : 这种模式将代码工件视为轻量级的单一项目的一部分，可能更适合开发团队和/或多项目环境。
  它自动化了部分构建过程，使创建和组合模块化组件变得更容易，促进了代码重用，使集成测试更容易，使它更容易共享项目范围内的工件，如 eslint 规则和其他配置策略，比 github 子模块更容易使用。
  Monorepo 模式使用了一个 **workspace** 的概念，在`nest-cli.json`文件中表示，以协调 Monorepo 组件之间的关系。

需要注意的是，实际上 Nest 的所有特性都是独立于代码组织模式的。
这个选择的 **唯一的** 影响是项目是如何组成的，以及构建构件是如何生成的。
所有其他功能，从 CLI 到核心模块再到附加模块，在两种模式下都是一样的。

此外，您可以在任何时候轻松地从 **标准模式** 切换到 **monorepo 模式** ，所以您可以推迟这个决定，直到其中一种或另一种方法的好处变得更清楚。

## 标准模式

当你运行`nest new`时，一个新的 **项目** 会使用一个内置原理图为你创建。
Nest 做了以下工作:

1.  创建一个新文件夹，对应于你提供给`nest new`的`name`参数
2.  用与最小基础级 Nest 应用程序对应的默认文件填充该文件夹。
    你可以在[typescript-starter](https://github.com/nestjs/typescript-starter)库中查看这些文件。
3.  提供额外的文件，如 `nest-cli.json` ， `package.json` 和 `tsconfig.json` ，配置和启用各种工具来编译，测试和服务您的应用程序。

从那里，你可以修改启动器文件，添加新组件，添加依赖项(例如， `npm install` )，或者开发你的应用程序，如本文档其余部分所述。

## Monorepo 模式

要启用 monorepo 模式，你需要从一个 _标准模式_ 结构开始，然后添加 **projects** 。
一个项目可以是一个完整的 **应用程序**(你可以用命令 `nest generate app` 添加到工作区中)或者一个 **库** (你可以用命令 `nest generate library` 添加到工作区中)。
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

`生成应用程序`示意图重新组织了代码-将每个 **应用程序** 项目移动到`apps`文件夹下，并在每个项目的根文件夹中添加一个特定于项目的`tsconfig.app.json`文件。
我们原来的`my-project` 应用程序已经成为 monorepo 的 **默认项目**，现在与刚刚添加的`my-app`是对等的，位于`apps`文件夹下。
我们将在下面介绍默认项目。

!!! danger

    将标准模式结构转换为monorepo仅适用于遵循规范Nest项目结构的项目。
    具体来说，在转换过程中，原理图试图重新定位根目录中`apps`文件夹下的项目文件夹中的`src`和`test`文件夹。
    如果项目不使用此结构，转换将失败或产生不可靠的结果。

## 工作区项目

monorepo 使用工作区的概念来管理其成员实体。
工作空间由 **项目** 组成。
项目可以是:

- 一个 **应用** : 一个完整的 Nest 应用程序，包括一个`main.ts`文件来引导应用程序。除了编译和构建方面的考虑外，工作区中的应用程序类型项目在功能上与 _标准模式_ 结构中的应用程序相同。
- 一个 **库** : 库是一种打包通用功能集(模块、提供者、控制器等)的方式，这些功能集可以在其他项目中使用。
  库不能自己运行，也没有`main.ts`文件。
  阅读更多关于库的信息[此处](/cli/libraries).

所有工作区都有一个 **默认项目** (应该是应用程序类型的项目)。
这是由`nest-cli.json`文件中的顶级`"root"`属性定义的，它指向默认项目的根(参见下面的[CLI 属性]了解更多详细信息)。
通常，这是你开始时使用的 **标准模式** 应用程序，然后使用`nest generate app`转换为 monorepo。
当您执行这些步骤时，此属性将自动填充。

默认项目是由`nest`命令使用，如`nest build` and `nest start` ，当没有提供项目名称时。

例如，在上述 monorepo 结构中，运行

```bash
$ nest start
```

将启动 `my-project`应用程序。
要启动 `my-app`，我们将使用：

```bash
$ nest start my-app
```

## 应用程序

应用程序类型的项目，或者我们非正式地称为`应用程序`，是你可以运行和部署的完整的 Nest 应用程序。
你用`nest generate app`生成一个应用程序类型的项目。

这个命令自动生成一个项目框架，包括来自[typescript 启动器]的标准`src` and `test`文件夹。
与标准模式不同，monorepo 中的应用程序项目没有任何包依赖项(`package.json`)或其他项目配置工件，如`.prettierrc` and `.eslintrc.js`。
相反，使用 monorepo 范围的依赖项和配置文件。

但是，该原理图确实在项目的根文件夹中生成了一个特定于项目的`tsconfig.app.json`文件。
该配置文件自动设置适当的构建选项，包括正确设置编译输出文件夹。
该文件扩展了顶层(monorepo)`tsconfig.json`文件，这样你就可以管理全局设置，但如果需要在项目级别覆盖它们。

## 库

如前所述，库类型的项目，或简称为"libraries"，是需要组合成应用程序才能运行的 Nest 组件包。
使用`nest generate library`生成一个库类型的项目。
决定什么属于一个库是一个架构设计决策。
我们将在[libraries](/cli/libraries)章节中深入讨论库。

## CLI 属性

Nest 将组织、构建和部署标准和单库存结构项目所需的元数据保存在`nest-cli.json`文件。
当您添加项目时，Nest 会自动添加并更新此文件，因此您通常不必考虑它或编辑其内容。
但是，有一些设置可能需要手动更改，因此对该文件有一个概述的理解是有帮助的。

运行上述步骤创建 monorepo 后，我们的`nest-cli.json`文件如下所示:

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

该文件分为几节：

- 一个全局部分，具有顶级属性，控制标准和 monorepo-wide 设置
- 一个顶级属性(`"projects"`)，包含关于每个项目的元数据。本节仅介绍单晶模结构。

顶级属性如下:

- `"collection"`: 指向用于生成组件的原理图的集合;通常不应更改此值
- `"sourceRoot"`: 指向标准模式结构中单个项目的源代码根，或 monorepo 模式结构中的 _默认项目_
- `"compilerOptions"`: 带有指定编译器选项的键和指定选项设置的值的映射;详见下文
- `"generateOptions"`: 带有指定全局生成选项的键和指定选项设置的值的映射;详见下文
- `"monorepo"`: (仅限 monorepo)对于 monorepo 模式结构，这个值总是`true`
- `"root"`: (仅限 monorepo)指向默认项目的项目根

## 全局编译器选项

这些属性指定要使用的编译器以及影响 **任何** 编译步骤的各种选项，无论是作为`nest build` or `nest start`的一部分，也与编译器无关，无论是`tsc`还是 webpack。

| 属性名称            | 属性值类型 | 描述                                                                                                                                                                                                  |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webpack`           | boolean    | 如果`true`，使用[webpack 编译器](https://webpack.js.org/)。如果`false`或不存在，则使用`tsc`。在 monorepo 模式下，默认值是`true`(使用 webpack)，在标准模式下，默认值是`false`(使用`tsc`)。详情见下文。 |
| `tsConfigPath`      | string     | (**monorepo only**)指向包含 `tsconfig.json` 设置的文件，该文件将在没有项目选项的情况下调用 `nest build` 或 `nest start` 时使用(例如，当默认项目被构建或启动时)。                                      |
| `webpackConfigPath` | string     | 指向 webpack 选项文件。如果没有指定，Nest 会查找文件`webpack.config.js`。详情见下文。                                                                                                                 |
| `deleteOutDir`      | boolean    | 如果`true`，无论何时调用编译器，它都将首先删除编译输出目录(在 `tsconfig.json` 中配置，其中默认为`./dist`)。                                                                                           |
| `assets`            | array      | 允许在编译步骤开始时自动分发非 typescript 资产(在`——watch`模式下增量编译时 **不会** 分发资产)。详情见下文。                                                                                           |
| `watchAssets`       | boolean    | 如果`true`，在监视模式下运行，监视 **所有** 非 typescript 资产。(有关要观察的资产的更细粒度控制，请参阅下面的[assets](cli/monorepo#assets)部分)。                                                     |

## 全局生成选项

这些属性指定`nest generate`命令使用的默认生成选项。

| 属性名称 | 属性值类型          | 描述                                                                                                                                                                                                                                                                 |
| -------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec`   | boolean _or_ object | 如果值为布尔值，值为`true`默认启用`spec`生成，值为`false`禁用它。在 CLI 命令行传递的标志会覆盖这个设置，项目特定的`generateOptions`设置也会覆盖这个设置(详情见下文)。如果该值为对象，则每个键表示一个原理图名称，布尔值确定是否为该特定原理图启用/禁用默认规范生成。 |
| `flat`   | boolean             | 如果为真，则所有 generate 命令都将生成扁平结构                                                                                                                                                                                                                       |

以下示例使用布尔值来指定所有项目默认情况下应禁用规格文件的生成：

```javascript
{
  "generateOptions": {
    "spec": false
  },
  ...
}
```

以下示例使用布尔值来指定平面文件的生成，应为所有项目的默认值：

```javascript
{
  "generateOptions": {
    "flat": true
  },
  ...
}
```

在下面的例子中，`spec`文件生成仅对`service`原理图禁用 (例如， `nest generate service...`):

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

!!! warning

    当指定`spec`作为对象时，生成原理图的键目前不支持自动别名处理。

    这意味着指定一个键，例如`service: false`，并试图通过别名`s`生成一个服务，规范仍然会生成。
    要确保正常的原理图名称和别名都按预期工作，请同时指定正常的命令名称和别名，如下所示。

    ```javascript
    {
      "generateOptions": {
        "spec": {
          "service": false,
          "s": false
        }
      },
      ...
    }
    ```

## 具体项目生成选项

除了提供全局生成选项外，还可以指定特定于项目的生成选项。
特定于项目的生成选项遵循与全局生成选项完全相同的格式，但是直接在每个项目上指定。

特定于项目的生成选项覆盖全局生成选项。

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

!!! warning

    生成选项的优先顺序如下所示。
    CLI命令行中指定的选项优先于项目特定的选项。
    特定于项目的选项覆盖全局选项。

## 指定编译器

使用不同的默认编译器的原因是，对于较大的项目(例如，在 monorepo 中更典型)，webpack 在构建时间和生成一个将所有项目组件捆绑在一起的单一文件方面具有显著的优势。
如果您希望生成单独的文件，将`"webpack"`设置为`false`，这将导致构建过程使用`tsc`。

## Webpack 可选的

webpack 选项文件可以包含标准的[webpack 配置选项](https://webpack.js.org/configuration/)。
例如，要告诉 webpack 捆绑`node_modules`(默认情况下不包含)，在`webpack.config.js`中添加以下内容:

```javascript
module.exports = {
  externals: [],
};
```

因为 webpack 配置文件是一个 JavaScript 文件，你甚至可以公开一个函数，它接受默认选项并返回一个修改后的对象:

```javascript
module.exports = function (options) {
  return {
    ...options,
    externals: [],
  };
};
```

## assets(资产)

TypeScript 编译会自动分发编译器输出(`.js`和`.d.ts`)文件)到指定的输出目录。
它还可以方便地分发非 typescript 文件，如`.graphql`文件，`images`， `.html`文件和其他资产。
这允许你将`nest build`(以及任何初始编译步骤)视为轻量级的 **开发构建** 步骤，在那里你可以编辑非 typescript 文件并迭代编译和测试。
资产应该位于`src`文件夹中，否则它们将不会被复制。

`assets`键的值应该是一个元素数组，指定要分发的文件。
元素可以是简单的字符串，具有类似`glob`的文件规格，例如:

```typescript
"assets": ["**/*.graphql"],
"watchAssets": true,
```

为了更好地控制，元素可以是具有以下键的对象:

- `"include"`: `glob`- 要分发的资产的文件规范
- `"exclude"`: `glob`- 将从`include`列表中 **排除** 的资产的文件规范
- `"outDir"`: 指定资产应该分布在其中的路径(相对于根文件夹)的字符串。默认为为编译器输出配置的相同输出目录。
- `"watchAssets"`: 布尔;如果`true`，在监视模式下运行，监视指定的资产

例如：

```typescript
"assets": [
  {
    "include": " **/*.graphql",
    "exclude": "** /omitted.graphql",
    "watchAssets": true
  },
]
```

!!! warning

    在顶级的`compilerOptions`属性中设置`watchAssets`将覆盖`assets`属性中的任何`watchAssets`设置。

## 项目属性

这个元素只存在于单模结构中。
你通常不应该编辑这些属性，因为它们被 Nest 用来在 monorepo 中定位项目及其配置选项。
