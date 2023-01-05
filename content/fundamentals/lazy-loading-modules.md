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
    @Injectable()
    export class CatsService {
      constructor(private lazyModuleLoader: LazyModuleLoader) {}
    }
    ```

=== "cats.service.js"

    ```js linenums="1" hl_lines="5"
    @Injectable()
    @Dependencies(LazyModuleLoader)
    export class CatsService {
      constructor(lazyModuleLoader) {
        this.lazyModuleLoader = lazyModuleLoader;
      }
    }
    ```

!!! info "`LazyModuleLoader`类是从`@nestjs/core`包中导入的。**Hint**"

或者，你可以从你的应用程序引导文件(`main.ts`)中获得`LazyModuleLoader`提供程序的引用，如下所示:

```typescript linenums="1" hl_lines="1"
// "app" represents a Nest application instance
const lazyModuleLoader = app.get(LazyModuleLoader);
```

使用此处，您现在可以使用以下结构加载任何模块：

```typescript linenums="1" hl_lines="3"
const { LazyModule } = await import('./lazy.module');
const moduleRef = await this.lazyModuleLoader.load(() => LazyModule);
```

!!! info "**Hint**"

    “惰性加载”模块在第一次`LazyModuleLoader#load`方法调用时被 **缓存**。
    这意味着，每次连续尝试加载`LazyModule`将非常快，并将返回一个缓存的实例，而不是再次加载模块。

    ```bash
    Load "LazyModule" attempt: 1
    time: 2.379ms
    Load "LazyModule" attempt: 2
    time: 0.294ms
    Load "LazyModule" attempt: 3
    time: 0.303ms
    ```

    此外，“惰性加载”模块与那些在应用程序引导中急切加载的模块以及稍后在应用程序中注册的任何其他惰性模块共享相同的模块图。

其中`lazy.module.ts`是一个 TypeScript 文件，它导出了一个 **常规的 Nest 模块**(不需要额外的更改)。

`LazyModuleLoader#load`方法返回[模块引用](/fundamentals/module-ref)(`LazyModule`的)，它允许你浏览内部的提供者列表，并使用其注入令牌作为查找键获得对任何提供者的引用。

例如，我们有一个`LazyModule`，定义如下:

```typescript linenums="1" hl_lines="2 3"
@Module({
  providers: [LazyService],
  exports: [LazyService],
})
export class LazyModule {}
```

!!! warning

    惰性加载的模块不能注册为 **全局模块**，因为这根本没有意义(因为它们是惰性注册的，当所有静态注册的模块都已经实例化时，它们是按需注册的)。

    同样，注册的 **全局增强器**(守卫/拦截器等)也 **不能** 正常工作。

这样，我们就可以获得对`LazyService`提供者的引用，如下所示:

```typescript linenums="1" hl_lines="5"
const { LazyModule } = await import('./lazy.module');
const moduleRef = await this.lazyModuleLoader.load(() => LazyModule);

const { LazyService } = await import('./lazy.service');
const lazyService = moduleRef.get(LazyService);
```

!!! warning

    如果你使用 **Webpack**，请确保更新你的 `tsconfig.json` 文件 —— 将 `compilerOptions.module` 设置为 `"esnext"`，并添加 `compilerOptions.moduleResolution` 属性，值为 `"node"`:

    ```json
    {
      "compilerOptions": {
        "module": "esnext",
        "moduleResolution": "node",
        ...
      }
    }
    ```

    设置好这些选项后，您将能够利用[代码分割](https://webpack.js.org/guides/code-splitting/)特性。

## 懒惰的控制器，网关和解析器

因为 Nest 中的控制器(或 GraphQL 应用程序中的解析器)表示一组路由/路径/主题(或查询/突变)，你不能使用`LazyModuleLoader`类来惰性加载它们。

!!! error

    在惰性加载模块中注册的控制器、[resolvers](/graphql/resolvers)和[gateway](/websockets/gateway)将不能像预期的那样运行。
    类似地，您不能按需注册中间件函数(通过实现`MiddlewareConsumer`接口)。

例如，假设您正在构建一个带有 Fastify 驱动程序的 REST API (HTTP 应用程序)(使用`@nestjs/platform-fastify`包)。
Fastify 不允许在应用程序准备好/成功侦听消息后注册路由。
这意味着即使我们分析了在模块控制器中注册的路由映射，所有惰性加载的路由都是不可访问的，因为没有办法在运行时注册它们。

同样地，我们在`@nestjs/microservices`包中提供的一些传输策略(包括 Kafka、gRPC 或 RabbitMQ)需要在连接建立之前订阅/监听特定的主题/通道。
一旦应用程序开始侦听消息，框架将无法订阅/侦听新的主题。

最后，启用代码优先方法的`@nestjs/graphql`包根据元数据自动生成 graphql 模式。
这意味着，它需要预先加载所有类。
否则，将无法创建适当的、有效的模式。

## 常见用例

最常见的情况是，当你的 worker/cron job/lambda 和无服务器 function/webhook 必须根据输入参数(路由路径/日期/查询参数等)触发不同的服务(不同的逻辑)时，你会看到惰性加载模块。
另一方面，惰性加载模块对于单片应用程序可能没有太大意义，因为在单片应用程序中，启动时间相当无关紧要。
