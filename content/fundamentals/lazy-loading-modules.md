# 延迟加载模块

默认情况下，模块是主动加载的，这意味着只要应用程序加载，所有模块也都加载，不管它们是否立即需要。
虽然这对大多数应用来说是可以的，但它可能成为在 **无服务器环境** 中运行的应用/工作者的瓶颈，在那里启动延迟(`冷启动`)是至关重要的。

延迟加载可以通过只加载特定无服务器函数调用所需的模块来帮助减少引导时间。
此外，一旦无服务器函数"warm"，您还可以异步加载其他模块，以进一步加快后续调用的引导时间(延迟模块注册)。

!!! info "如果你熟悉 Angular 框架，你可能见过“惰性加载模块”这个术语。"

    请注意，这种技术在Nest中在功能上是不同的，因此可以认为这是一个完全不同的功能，但具有类似的命名约定。

## 入门

为了按需加载模块，Nest 提供了`LazyModuleLoader`类，它可以以正常的方式注入到类中:

=== "cats.service.ts"

    ```typescript linenums="1" hl_lines="3"
    @@filename(cats.service)
    @Injectable()
    export class CatsService {
      constructor(private lazyModuleLoader: LazyModuleLoader) {}
    }
    ```

=== "cats.service.js"

    ```js linenums="1" hl_lines="3"
    @Injectable()
    @Dependencies(LazyModuleLoader)
    export class CatsService {
      constructor(lazyModuleLoader) {
        this.lazyModuleLoader = lazyModuleLoader;
      }
    }
    ```

!!! info "**Hint**"

    The `LazyModuleLoader` class is imported from the `@nestjs/core` package.

Alternatively, you can obtain a reference to the `LazyModuleLoader` provider from within your application bootstrap file (`main.ts`), as follows:

```typescript linenums="1" hl_lines="3"
// "app" represents a Nest application instance
const lazyModuleLoader = app.get(LazyModuleLoader);
```

With this in place, you can now load any module using the following construction:

```typescript linenums="1" hl_lines="3"
const { LazyModule } = await import('./lazy.module');
const moduleRef = await this.lazyModuleLoader.load(() => LazyModule);
```

!!! info "**Hint**"

    "Lazy-loaded" modules are **cached** upon the first `LazyModuleLoader#load` method invocation.

> That means, each consecutive attempt to load `LazyModule` will be **very fast** and will return a cached instance, instead of loading the module again.
>
> ```bash
> Load "LazyModule" attempt: 1
> time: 2.379ms
> Load "LazyModule" attempt: 2
> time: 0.294ms
> Load "LazyModule" attempt: 3
> time: 0.303ms
> ```
>
> Also, "lazy-loaded" modules share the same modules graph as those eagerly loaded on the application bootstrap as well as any other lazy modules registered later in your app.

Where `lazy.module.ts` is a TypeScript file that exports a **regular Nest module** (no extra changes are required).

The `LazyModuleLoader#load` method returns the [module reference](/fundamentals/module-ref) (of `LazyModule`) that lets you navigate the internal list of providers and obtain a reference to any provider using its injection token as a lookup key.

For example, let's say we have a `LazyModule` with the following definition:

```typescript linenums="1" hl_lines="3"
@Module({
  providers: [LazyService],
  exports: [LazyService],
})
export class LazyModule {}
```

!!! info "**Hint**"

    Lazy-loaded modules cannot be registered as **global modules** as it simply makes no sense (since they are registered lazily, on-demand when all the statically registered modules have been already instantiated).

> Likewise, registered **global enhancers** (guards/interceptors/etc.) **will not work** properly either.

With this, we could obtain a reference to the `LazyService` provider, as follows:

```typescript linenums="1" hl_lines="3"
const { LazyModule } = await import('./lazy.module');
const moduleRef = await this.lazyModuleLoader.load(() => LazyModule);

const { LazyService } = await import('./lazy.service');
const lazyService = moduleRef.get(LazyService);
```

!!! warning "**Warning**"

    If you use **Webpack** , make sure to update your `tsconfig.json` file - setting `compilerOptions.module` to `"esnext"` and adding `compilerOptions.moduleResolution` property with `"node"` as a value:

    ```json
    {
      "compilerOptions": {
        "module": "esnext",
        "moduleResolution": "node",
        ...
      }
    }
    ```

    With these options set up, you'll be able to leverage the [code splitting](https://webpack.js.org/guides/code-splitting/) feature.

## 懒惰的控制器，网关和解析器

懒惰的控制器，网关和解析器
Since controllers (or resolvers in GraphQL applications) in Nest represent sets of routes/paths/topics (or queries/mutations), you **cannot lazy load them** using the `LazyModuleLoader` class.

!!! error "**Warning**"

    Controllers, [resolvers](/graphql/resolvers), and [gateways](/websockets/gateways) registered inside lazy-loaded modules will not behave as expected.
    Similarly, you cannot register middleware functions (by implementing the `MiddlewareConsumer` interface) on-demand.

For example, let's say you're building a REST API (HTTP application) with a Fastify driver under the hood (using the `@nestjs/platform-fastify` package).
Fastify does not let you register routes after the application is ready/successfully listening to messages.
That means even if we analyzed route mappings registered in the module's controllers, all lazy-loaded routes wouldn't be accessible since there is no way to register them at runtime.

Likewise, some transport strategies we provide as part of the `@nestjs/microservices` package (including Kafka, gRPC, or RabbitMQ) require to subscribe/listen to specific topics/channels before the connection is established.
Once your application starts listening to messages, the framework would not be able to subscribe/listen to new topics.

Lastly, the `@nestjs/graphql` package with the code first approach enabled automatically generates the GraphQL schema on-the-fly based on the metadata.
That means, it requires all classes to be loaded beforehand.
Otherwise, it would not be doable to create the appropriate, valid schema.

## 常见用例

最常见的情况是，当你的 worker/cron job/lambda 和无服务器 function/webhook 必须根据输入参数(路由路径/日期/查询参数等)触发不同的服务(不同的逻辑)时，你会看到惰性加载模块。
另一方面，惰性加载模块对于单片应用程序可能没有太大意义，因为在单片应用程序中，启动时间相当无关紧要。
