# 第一步

在本系列文章中，您将学习 Nest 的 **核心基础** 知识。
为了熟悉 Nest 应用程序的基本构建块，我们将构建一个基本的 CRUD 应用程序，其中的特性涵盖了入门级的大量内容。

## 语言

我们喜欢[TypeScript](https://www.typescriptlang.org/)，但最重要的是——我们喜欢[Node.js](https://nodejs.org/en/)。
这就是为什么 Nest 兼容 TypeScript 和 **纯 JavaScript** 。
Nest 利用了最新的语言特性，所以要将其与普通的 JavaScript 结合使用，我们需要一个[Babel](https://babeljs.io/)编译器。

在我们提供的例子中，我们将主要使用 TypeScript，但你总是可以 **将代码片段** 转换为普通的 JavaScript 语法(只需点击切换每个代码片段右上角的语言按钮)。

## 需求

请确保[Node.js](https://nodejs.org/)(>= 10.13.0，除了 v13)安装在您的操作系统上。

## 配置

使用[Nest CLI](/cli/overview).设置一个新项目非常简单。
安装了[npm](https://www.npmjs.com/)后，你可以在你的操作系统终端中用以下命令创建一个新的 Nest 项目:

```bash
$ npm i -g @nestjs/cli
$ nest new project-name
```

`project-name` 目录将被创建，节点模块和一些其他的样板文件将被安装，一个`src/`目录将被创建并由几个核心文件填充。

<div class="file-tree">
  <div class="item">src</div>
  <div class="children">
    <div class="item">app.controller.spec.ts</div>
    <div class="item">app.controller.ts</div>
    <div class="item">app.module.ts</div>
    <div class="item">app.service.ts</div>
    <div class="item">main.ts</div>
  </div>
</div>

以下是这些核心文件的简要概述:

| 文件                     | 描述                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `app.controller.ts`      | 具有单一路由的基本控制器。                                                  |
| `app.controller.spec.ts` | 单元测试控制器。                                                            |
| `app.module.ts`          | 应用程序的根模块。                                                          |
| `app.service.ts`         | 具有单一方法的基本服务。                                                    |
| `main.ts`                | 应用程序的入口文件，它使用核心函数`NestFactory`创建一个 Nest 应用程序实例。 |

`main.ts` 包含一个 async 函数，它将引导我们的应用程序:

=== "main.ts"

    ```ts
    import { NestFactory } from '@nestjs/core';
    import { AppModule } from './app.module';

    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      await app.listen(3000);
    }
    bootstrap();
    ```

=== "main.js"

    ```js
    import { NestFactory } from '@nestjs/core';
    import { AppModule } from './app.module';

    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      await app.listen(3000);
    }
    bootstrap();
    ```

为了创建一个 Nest 应用实例，我们使用了核心的`NestFactory`类。
`NestFactory`公开了一些静态方法，它们允许创建应用实例。
`create()`方法返回一个应用程序对象，它实现了`INestApplication`接口。
该对象提供了一组方法，这些方法将在接下来的章节中进行描述。
在上面的`main.ts`示例中，我们只需启动 HTTP 侦听器，让应用程序等待入站 HTTP 请求。

请注意，使用 Nest CLI 搭建的项目创建了一个初始项目结构，该结构鼓励开发人员遵循将每个模块保存在自己的专用目录中的约定。

## 平台

Nest 的目标是成为一个平台无关的框架。
平台独立性使得创建可重用的逻辑部分成为可能，开发人员可以跨几种不同类型的应用程序利用这些逻辑部分。
从技术上讲，一旦创建了适配器，Nest 就能够与任何 Node HTTP 框架一起工作。
目前支持两种即时可用的 HTTP 平台:[express](https://expressjs.com/)和[fastify](https://www.fastify.io)。
你可以选择最适合你需要的。

| 平台               | 描述                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform-express` | [Express][express]是一个著名的极简节点 web 框架。这是一个经过实战测试的、可用于生产的库，由社区实现了大量资源。默认使用`@nestjs/platform-express`包。Express 为许多用户提供了良好的服务，不需要采取任何行动就可以启用它。 |
| `platform-fastify` | [Fastify][fastify]是一个高性能和低开销的框架，高度专注于提供最大的效率和速度。阅读如何使用它[此处](/techniques/performance)。                                                                                             |

无论使用哪个平台，它都公开自己的应用程序接口。
它们分别被视为`NestExpressApplication`和`NestFastifyApplication`。

当你将一个类型传递给`NestFactory.create()`方法时，就像下面的例子一样，`app`对象将会有特定平台专用的方法。
注意，你不需要指定类型，除非你真的想访问底层的平台 API。

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule);
```

[express]: https://expressjs.com/
[fastify]: https://www.fastify.io/

## 运行应用

安装完成后，您可以在操作系统命令提示符下运行以下命令，启动侦听入站 HTTP 请求的应用程序:

```bash
$ npm run start
```

这个命令启动应用，让 HTTP 服务器监听`src/main.ts`文件中定义的端口。
一旦应用程序运行，打开浏览器并导航到`http://localhost:3000/`。
你应该看看`Hello World!`的消息。
