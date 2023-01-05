---
title: REPL
---

# Read-Eval-Print-Loop (REPL)

REPL 是一个简单的交互式环境，可将单个用户输入，执行它们并将结果返回给用户。
REPL 功能使您可以直接从终端检查提供商（和控制器）上的依赖关系图并调用方法。

## 用法

要以模式运行您的 Nestjs 应用程序，请创建一个新的`repl.ts`文件（与`main.ts`同目录），然后内部添加以下代码：

=== "repl.ts"

    ```typescript
    import { repl } from '@nestjs/core';
    import { AppModule } from './app.module';

    async function bootstrap() {
    await repl(AppModule);
    }
    bootstrap();
    ```

=== "repl.js"

    ```js
    import { repl } from '@nestjs/core';
    import { AppModule } from './app.module';

    async function bootstrap() {
    await repl(AppModule);
    }
    bootstrap();
    ```

现在，在您的终端中，使用以下命令启动重复：

```bash
$ npm run start -- --entryFile repl
```

!!! info "`repl` 返回一个[node.js REPL 服务器](https://nodejs.org/api/repl.html)对象。"

启动并运行后，您应该在控制台中看到以下消息：

```bash
LOG [NestFactory] Starting Nest application...
LOG [InstanceLoader] AppModule dependencies initialized
LOG REPL initialized
```

现在，您可以开始与依赖关系图进行交互。
例如，你可以检索一个`AppService`(我们在这里使用 starter 项目作为示例)并调用`getHello()`方法:

```typescript
> get(AppService).getHello()
'Hello World!'
```

你可以在你的终端中执行任何 JavaScript 代码，例如，将`AppController`的实例分配给一个局部变量，并使用`await`调用一个异步方法:

```typescript
> appController = get(AppController)
AppController { appService: AppService {} }
> await appController.getHello()
'Hello World!'
```

要显示给定提供者或控制器上可用的所有公共方法，使用`methods()`函数，如下所示:

```typescript
> methods(AppController)

Methods:
 ◻ getHello
```

使用`debug()`将所有已注册的模块连同它们的控制器和提供者以列表的形式打印出来。

```typescript
> debug()

AppModule:
 - controllers:
  ◻ AppController
 - providers:
  ◻ AppService
```

Quick demo:

<figure><img src="../../assets/repl.gif" alt="REPL example" /></figure>

您可以在下一节中找到有关现有的预定义本机方法的更多信息。

## 本机函数

The built-in NestJS REPL comes with a few native functions that are globally available when you start REPL. You can call `help()` to list them out.

If you don't recall what's the signature (ie: expected parameters and a return type) of a function, you can call `<function_name>.help`.
For instance:

```text
> $.help
Retrieves an instance of either injectable or controller, otherwise, throws exception.
Interface: $(token: InjectionToken) => any
```

> info **Hint** Those function interfaces are written in [TypeScript function type expression syntax](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-type-expressions).

| Function     | Description                                                                                                        | Signature                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `debug`      | Print all registered modules as a list together with their controllers and providers.                              | `debug(moduleCls?: ClassRef \| string) => void`                       |
| `get` or `$` | Retrieves an instance of either injectable or controller, otherwise, throws exception.                             | `get(token: InjectionToken) => any`                                   |
| `methods`    | Display all public methods available on a given provider or controller.                                            | `methods(token: ClassRef \| string) => void`                          |
| `resolve`    | Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.     | `resolve(token: InjectionToken, contextId: any) => Promise<any>`      |
| `select`     | Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module. | `select(token: DynamicModule \| ClassRef) => INestApplicationContext` |

## 观看模式

During development it is useful to run REPL in a watch mode to reflect all the code changes automatically:

```bash
$ npm run start -- --watch --entryFile repl
```

This has one flaw, the REPL's command history is discarded after each reload which might be cumbersome.
Fortunately, there is a very simple solution. Modify your `bootstrap` function like this:

```typescript
async function bootstrap() {
  const replServer = await repl(AppModule);
  replServer.setupHistory('.nestjs_repl_history', (err) => {
    if (err) {
      console.error(err);
    }
  });
}
```

Now the history is preserved between the runs/reloads.
