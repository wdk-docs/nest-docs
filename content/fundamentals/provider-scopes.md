# 注入作用域

对于来自不同编程语言背景的人来说，可能会意外地发现，在 Nest 中，几乎所有的东西都是在传入请求之间共享的。
我们有一个到数据库的连接池，带有全局状态的单例服务，等等。
记住，Node.js 并不遵循请求/响应多线程无状态模型，在该模型中，每个请求都由一个单独的线程处理。
因此，对于我们的应用来说，使用单例实例是完全 **安全** 的。

然而，在一些边缘情况下，基于请求的生命周期可能是理想的行为，例如在 GraphQL 应用程序中按请求缓存、请求跟踪和多租户。
注入作用域提供了一种机制来获得所需的提供器生存期行为。

## 提供器作用域

提供器可以有以下任何一个作用域:

| 范围      | 说明                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEFAULT   | 提供器的单个实例在整个应用程序中共享。 实例生命周期直接绑定到应用程序生命周期。 一旦应用程序启动，所有的单例提供器都已实例化。 默认情况下使用单例作用域。 |
| REQUEST   | 为每个传入的 **请求** 创建提供器的新实例。在请求完成处理后，对实例进行垃圾回收。                                                                          |
| TRANSIENT | 瞬态提供器不会在消费者之间共享。 每个注入临时提供器的消费者将收到一个新的专用实例。                                                                       |

!!! info "对于大多数用例，**推荐** 使用单例作用域。"

    跨使用者和跨请求共享提供器意味着可以缓存实例，并且它的初始化只在应用程序启动期间发生一次。

## 使用

通过将 `scope` 属性传递给 `@Injectable()` 装饰器选项对象来指定注入范围:

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {}
```

类似地，对于[定制提供器](/fundamentals/custom-providers)，在提供器注册的长手表单中设置 `scope` 属性:

```typescript
{
  provide: 'CACHE_MANAGER',
  useClass: CacheManager,
  scope: Scope.TRANSIENT,
}
```

!!! info "从 `@nestjs/common` 中导入 `Scope` enum"

!!! warning

    网关不应该使用请求作用域的提供器，因为它们必须充当单例。
    每个网关封装一个真正的套接字，不能多次实例化。

默认情况下使用单例作用域，不需要声明。
如果你确实想声明一个提供器为单例作用域，使用 `scope` 属性的 `Scope.DEFAULT` 值。

## 控制器作用域

控制器也可以有作用域，它适用于控制器中声明的所有请求方法处理程序。
与提供器作用域一样，控制器的作用域声明了它的生存期。
对于请求作用域的控制器，将为每个入站请求创建一个新实例，并在请求完成处理后进行垃圾回收。

使用 `ControllerOptions` 对象的 `scope` 属性声明控制器作用域:

```typescript
@Controller({
  path: 'cats',
  scope: Scope.REQUEST,
})
export class CatsController {}
```

## 作用域层次结构

作用域在注入链上冒泡。
依赖于请求作用域的提供器的控制器本身也将是请求作用域的。

想象一下下面的依赖关系图: `CatsController <- CatsService <- CatsRepository` 。
如果 `CatsService` 是请求作用域(其他的是默认的单例)， `CatsController` 将成为请求作用域，因为它依赖于注入的服务。
`CatsRepository` 是不依赖的，它将保持单例作用域。

## 请求提供器

在一个基于 HTTP 服务器的应用程序中(例如，使用 `@nestjs/platform-express` 或 `@nestjs/platform-fastify` )，当使用请求作用域的提供器时，你可能想要访问原始请求对象的引用。
你可以通过注入 `REQUEST` 对象来做到这一点。

```typescript hl_lines="7"
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(REQUEST) private request: Request) {}
}
```

由于底层平台/协议的差异，`Microservice` 或 `GraphQL` 应用程序访问入站请求的方式略有不同。
在[GraphQL](/graphql/quick-start)应用程序中，你注入`CONTEXT`而不是`REQUEST`:

```typescript hl_lines="6"
import { Injectable, Scope, Inject } from '@nestjs/common';
import { CONTEXT } from '@nestjs/graphql';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(CONTEXT) private context) {}
}
```

然后配置`context`值(在`GraphQLModule`中)，使其包含`request`作为属性。

## 性能

使用请求作用域的提供器将对应用程序性能产生影响。
虽然 Nest 试图缓存尽可能多的元数据，但它仍然必须为每个请求创建一个类的实例。
因此，它会降低您的平均响应时间和整体基准测试结果。
除非提供器必须是请求作用域，否则强烈建议使用默认的单例作用域。
