# 库

许多应用程序都需要解决相同的一般性问题，或者在几个不同的上下文中重用模块化组件。
Nest 有一些解决这个问题的方法，但是每个方法都在不同的层次上工作，以帮助满足不同的架构和组织目标的方式解决问题。

Nest [modules](/modules)对于提供一个执行上下文非常有用，可以在单个应用程序中共享组件。
模块也可以打包在[npm](https://npmjs.com)中，以创建一个可重用的库，可以安装在不同的项目中。
这可能是一种有效的方式来分发可配置的、可重用的库，这些库可以被不同的、松散连接的或无关联的组织使用(例如，通过分发/安装第三方库)。

对于在组织紧密的小组中共享代码(例如，在公司/项目边界内)，采用一种更轻量级的方法来共享组件是很有用的。
Monorepos 的出现是为了实现这一点，在 Monorepos 中， **库** 提供了一种以简单、轻量级的方式共享代码的方法。
在 Nest monorepo 中，使用库可以方便地组装共享组件的应用程序。
事实上，这鼓励了对单片应用程序和开发过程的分解，从而将重点放在构建和组合模块化组件上。

## Nest 库

Nest 库是一个与应用程序不同的 Nest 项目，因为它不能独立运行。
必须将库导入到包含它的应用程序中才能执行其代码。
本节中描述的内置库支持仅适用于 **monorepos** (标准模式项目可以使用 npm 包实现类似功能)。

例如，一个组织可以开发一个`AuthModule` ，通过实现管理所有内部应用程序的公司策略来管理身份验证。
monorepo 可以将该模块定义为一个库，而不是为每个应用程序单独构建该模块，或者将代码与 npm 物理打包并要求每个项目安装它。
当以这种方式组织时，库模块的所有消费者都可以在提交时看到`AuthModule`的最新版本。
这对于协调组件开发和组装以及简化端到端测试有很大的好处。

## 创建库

任何适合重用的功能都可以作为库进行管理。
决定什么应该是一个库，什么应该是应用程序的一部分，这是一个架构设计决策。
创建库不仅仅是简单地将代码从现有应用程序复制到新库。
打包为库时，库代码必须与应用程序解耦。
这可能需要 **更多的** 时间，并迫使您在更紧密耦合的代码中无法面对的一些设计决策。
但是，当库可以用于跨多个应用程序实现更快速的应用程序组装时，这些额外的工作就会得到回报。

要开始创建库，运行以下命令:

```bash
nest g library my-library
```

当你运行这个命令时，`library`示意图会提示你输入库的前缀(别名):

```bash
What prefix would you like to use for the library (default: @app)?
```

这将在工作区中创建一个名为`my-library`.的新项目。
库类型项目与应用程序类型项目一样，使用原理图生成到命名文件夹中。
库在 monorepo 根目录下的`libs`文件夹下管理。
Nest 在第一次创建库时创建`libs`文件夹。

为库生成的文件与为应用程序生成的文件略有不同。
下面是执行上述命令后`libs`文件夹的内容:

<div class="file-tree">
  <div class="item">libs</div>
  <div class="children">
    <div class="item">my-library</div>
    <div class="children">
      <div class="item">src</div>
      <div class="children">
        <div class="item">index.ts</div>
        <div class="item">my-library.module.ts</div>
        <div class="item">my-library.service.ts</div>
      </div>
      <div class="item">tsconfig.lib.json</div>
    </div>
  </div>
</div>

`nest-cli.json`文件将在`"projects"` 键下有一个新的库条目:

```javascript
...
{
    "my-library": {
      "type": "library",
      "root": "libs/my-library",
      "entryFile": "index",
      "sourceRoot": "libs/my-library/src",
      "compilerOptions": {
        "tsConfigPath": "libs/my-library/tsconfig.lib.json"
      }
}
...
```

`nest-cli.json` 元数据在库和应用程序之间有两个不同之处:

- the `"type"` property is set to `"library"` instead of `"application"`
- the `"entryFile"` property is set to `"index"` instead of `"main"`

These differences key the build process to handle libraries appropriately. For example, a library exports its functions through the `index.js` file.

As with application-type projects, libraries each have their own `tsconfig.lib.json` file that extends the root (monorepo-wide) `tsconfig.json` file. You can modify this file, if necessary, to provide library-specific compiler options.

You can build the library with the CLI command:

```bash
nest build my-library
```

## 使用库

有了自动生成的配置文件，使用库就很简单了。
我们如何将`MyLibraryService`从`my-library`库导入到`my-project` 应用程序?

首先，注意使用库模块与使用任何其他 Nest 模块是一样的。
monorepo 所做的就是以一种导入库和生成构建现在是透明的方式管理路径。
要使用`MyLibraryService`，我们需要导入其声明模块。
我们可以如下修改`my-project/src/app.module.ts`导入`MyLibraryModule`。

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MyLibraryModule } from '@app/my-library';

@Module({
  imports: [MyLibraryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Notice above that we've used a path alias of `@app` in the ES module `import` line, which was the `prefix` we supplied with the `nest g library` command above. Under the covers, Nest handles this through tsconfig path mapping. When adding a library, Nest updates the global (monorepo) `tsconfig.json` file's `"paths"` key like this:

```javascript
"paths": {
    "@app/my-library": [
        "libs/my-library/src"
    ],
    "@app/my-library/*": [
        "libs/my-library/src/*"
    ]
}
```

因此，简而言之，monorepo 和库特性的结合使得将库模块包含到应用程序中变得简单而直观。

这种相同的机制支持构建和部署组合库的应用程序。
一旦你导入了`MyLibraryModule`，运行`nest build`自动处理所有模块解析，并将应用程序与任何库依赖项捆绑在一起，以便部署。
monorepo 的默认编译器是 **webpack**，因此生成的分发文件是一个单独的文件，它将所有转译后的 JavaScript 文件捆绑到一个单独的文件中。
您也可以按[此处](https://docs.nestjs.com/cli/monorepo#global-compiler-options)所述切换为`tsc`。
