---
title: NestJS v9 is now available !
date: 2022-07-08
authors: Kamil Mysliwiec
description: >
  今天，我很高兴宣布Nestjs 9的正式发布。
categories:
  - Blog
links:
  - https://trilon.io/blog/nestjs-9-is-now-available
tags:
  - NestJS
  - available
# exclude_from_blog: true # 排除在外
---

今天，我很高兴宣布 NestJS v9 的正式发布。
这是整个平台的主要版本，包括框架，改进 `@nestjs/swagger` 软件包，CLI 以及对文档的更新。

!!! note

    如果您不熟悉Nestjs，它是一个打字稿Node.js框架，可帮助您构建企业级高效且可扩展的Node.js应用程序。

![](https://trilon.io/_nuxt/img/6e8e83d.jpeg)

Cat in Kyiv. Photo by Valdemar Kostenko

让我们进去！

## 版本 9 中有什么新功能？

该版本带来了许多出色的功能和期待已久的改进。
这里有太多的地方要列出，但是让我们高度看一些最令人兴奋的东西。

## REPL (阅读评估打印循环)

REPL 是一个简单的交互式环境，可将单个用户输入，执行它们并将结果返回给用户。
REPL 功能使您可以直接从终端检查提供器（和控制器）上的依赖关系图并调用方法。

Nest 的 Repl 功能于 2022 年 5 月首次宣布，此后收到了大量改进和更新。

要以模式运行您的 Nestjs 应用程序，请创建一个新的`repl.ts`文件（与现有的`main.ts`文件一起），并在内部添加以下代码：

```ts
import { repl } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  await repl(AppModule);
}
bootstrap();
```

现在，在您的终端中，使用以下命令启动重复：

```ts
$ npm run start -- --entryFile repl

## OR yarn start --entryFile repl
```

!!! Hint

    内置的Nestjs替补带有一些本机功能，这些功能在您启动重置时全球可用。您可以调用`help()`列出它们。

启动并运行后，您应该在控制台中看到以下消息:

```console
LOG [NestFactory] Starting Nest application...
LOG [InstanceLoader] AppModule dependencies initialized
LOG REPL initialized
```

现在，您可以开始与依赖关系图进行交互。
例如，您可以检索 AppService（我们在此处以启动器项目为例）并调用 getHello()方法:

```ts
get(AppService).getHello();
('Hello World!');
```

You can execute any JavaScript code from within your terminal, for example, assign an instance of the AppController to a local variable, and use await to call an asynchronous method:

```ts
appController = get(AppController)
AppController { appService: AppService {} }
await appController.getHello()
'Hello World!'
```

To display all public methods available on a given provider or controller, use the methods() function, as follows:

```ts
> methods(AppController)
Methods:
  ◻ getHello
```

To print all registered modules as a list together with their controllers and providers, use debug().

```
> debug()

AppModule:

- controllers:
  ◻ AppController
- providers:
  ◻ AppService
```

Quick demo:

REPL example

## Configurable module builder

If you have have ever manually created dynamic modules that are highly configurable that expose async methods, registerAsync, forRootAsync, etc., you know it can be quite complicated and require quite a bit of boilerplate code.

We aim to simplify this in Nest v9, which will provide a ConfigurableModuleBuilder class that facilitates this process and lets you construct a module "blueprint" - in just a few lines of code.

For demonstration purposes, let's create a configurable HttpClientModule using the new ConfigurableModuleBuilder. Before we start, let's make sure we declare a dedicated interface that represents what options our HttpClientModule takes in.

export interface HttpClientModuleOptions {
baseUrl: string;
}
With this in place, create a new dedicated file named http-client.module-definition.ts. In this file, let's utilize the ConfigurableModuleBuilder to construct HttpClientModule definition.

import { ConfigurableModuleBuilder } from '@nestjs/common';
import { HttpClientModuleOptions } from './interfaces';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
new ConfigurableModuleBuilder<HttpClientModuleOptions>().build();
And finally, let's define the actual http-client.module.ts module file and leverage the auto-generated ConfigurableModuleClass:

import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './http-client.module-definition';

@Module({})
export class HttpClientModule extends ConfigurableModuleClass {}
Extending the ConfigurableModuleClass means that HttpClientModule provides now both register (for static use-cases) and registerAsync (which allows consumers asynchronously configure that module) methods.

@Module({
imports: [
HttpClientModule.register({ baseUrl: 'https://trilon.io' }),
// or alternatively:
// HttpClientModule.registerAsync({
// useFactory: () => {
// return {
// baseUrl: 'https://trilon.io',
// }
// },
// inject: [...any extra dependencies...]
// }),
],
})
export class AppModule {}
You also have the ability to inject a configuration object using the @Inject(MODULE_OPTIONS_TOKEN) construction. Read more on this feature in the documentation.

## Durable providers

Request-scoped providers may sometimes lead to increased latency since having at least 1 request-scoped provider (injected into the controller instance, or deeper - injected into one of its providers) makes the controller request-scoped as well. That means, it must be recreated (instantiated) per each individual request (and garbage collected afterwards).

HINT For instance, for 30k requests in parallel, there will be 30k ephemeral instances of the controller (and its request-scoped providers).

Having a common provider that most providers depend on (e.g., database connection), automatically converts all those providers to request-scoped providers as well. This can pose a challenge in multi-tenant applications, especially for those that have a central request-scoped "data source" provider that grabs headers/token from the request object and based on their values, retrieves the corresponding database connection/schema (specific to that tenant).

For instance, let's say you have an application alternately used by 10 different customers. Each customer has its own dedicated data source, and you want to make sure customer A will never be able to reach customer's B database. One way to achieve this could be to declare a request-scoped "data source" provider that - based on the request object - determines what's the "current customer" and retrieves its corresponding database. But, a major downside to this approach is that since most likely a large chunk of your application' components rely on the "data source" provider, they will implicitly become "request-scoped", and therefore you will undoubtedly see an impact in your apps performance.

But what if we had a better solution?

Since we only have 10 customers, couldn't we have 10 individual DI sub-trees per customer (instead of recreating each tree per request)?

If your providers don't rely on any property that's truly unique for each consecutive request (e.g., request UUID) but instead there are some specific attributes that let us aggregate them, then we have no reason to recreate the DI sub-tree on every incoming request.

This is exactly where durable providers come in handy!

Before we start flagging providers as durable, we must first register a strategy that:

instructs Nest what those "common request attributes" are
provides logic that groups requests, and associates them with their corresponding DI sub-trees.
import {
HostComponentInfo,
ContextId,
ContextIdFactory,
ContextIdStrategy,
} from '@nestjs/core';
import { Request } from 'express';

// A collection of context identifiers representing separate DI sub-trees per tenant
const tenants = new Map<string, ContextId>();

export class AggregateByTenantContextIdStrategy implements ContextIdStrategy {
attach(contextId: ContextId, request: Request) {
const tenantId = request.headers['x-tenant-id'] as string;
let tenantSubTreeId: ContextId;
if (tenants.has(tenantId)) {
tenantSubTreeId = tenants.get(tenantId);
} else {
// Construct a new context id (think of a root node)
tenantSubTreeId = ContextIdFactory.create();
tenants.set(tenantId, tenantSubTreeId);
}
// If tree is not durable, return the original "contextId" object
return (info: HostComponentInfo) =>
info.isTreeDurable ? tenantSubTreeId : contextId;
}
}
Hint Similar to the request scope, durability bubbles up the injection chain. That means if A depends on B which is flagged as durable, A implicitly becomes durable too (unless durable is explicitly set to false for A provider).

Warning Note this strategy is not ideal for applications operating with a large number of tenants.

With this strategy in place, you can register it somewhere in your code (as it applies globally anyway), so for example, we could place it in the main.ts file:

ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());
As long as the registration occurs before any request hits your application, everything will work as intended.

Lastly, to turn a regular provider into a durable provider, simply set the durable flag to true:

import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class CatsService {}
Similarly, for custom providers, set the durable property in the long-hand form for a provider registration:

{
provide: 'CONNECTION_POOL',
useFactory: () => { ... },
scope: Scope.REQUEST,
durable: true, // <-- here
}

## Redis transporter

In v9, the Redis transport strategy will no longer use redis package under the hood but instead was migrated to leverage ioredis.

## Upgraded dependencies

Nest v9 brings support for Fastify v4 and drops support for Node.js v10. Make sure to use at least the latest LTS version!

## Migration from Nest v8

In order to migrate your existing project, follow the guidelines that are available here. Also, make sure to get rid of all deprecation messages that may appear in your console.

### Enjoy v9!

We're excited to see how you use the latest version of NestJS.

Make sure to follow Nest on Twitter @nestframework to stay up to date with all the latest announcements!
