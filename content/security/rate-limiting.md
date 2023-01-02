# 速度限制

保护应用程序免受蛮力攻击的一种常见技术是限速。
首先，你需要安装`@nestjs/throttler`包。

```bash
$ npm i --save @nestjs/throttler
```

一旦安装完成，`ThrottlerModule`可以配置为任何其他带有`forRoot`或`forRootAsync`方法的 Nest 包。

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
})
export class AppModule {}
```

上面将为你的应用程序被保护的路由设置全局选项`ttl`，生存时间，和`limit`， ttl 内的最大请求数量。

一旦模块被导入，你就可以选择如何绑定`ThrottlerGuard`。
[guards](https://docs.nestjs.com/guards)部分中提到的任何类型的绑定都可以。
例如，如果你想全局绑定这个守卫，你可以通过将这个 provider 添加到任何模块来实现:

```typescript
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard
}
```

## 定制

There may be a time where you want to bind the guard to a controller or globally, but want to disable rate limiting for one or more of your endpoints.
For that, you can use the `@SkipThrottle()` decorator, to negate the throttler for an entire class or a single route.
The `@SkipThrottle()` decorator can also take in a boolean for if there is a case where you want to exclude _most_ of a controller, but not every route.

There is also the `@Throttle()` decorator which can be used to override the `limit` and `ttl` set in the global module, to give tighter or looser security options.
This decorator can be used on a class or a function as well.
The order for this decorator does matter, as the arguments are in the order of `limit, ttl`.

## 代理

如果您的应用程序运行在代理服务器后面，请检查特定的 HTTP 适配器选项([express](http://expressjs.com/en/guide/behind-proxies.html)和[fastify](https://www.fastify.io/docs/latest/Server/#trustproxy))以获取“信任代理”选项并启用它。
这样做将允许你从`X-Forward-For`头获取原始 IP 地址，你可以重写`getTracker()`方法来从头而不是从`req.ip`获取值。
下面的例子同时适用于 express 和 fastify:

```ts
// throttler-behind-proxy.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    return req.ips.length ? req.ips[0] : req.ip; // individualize IP extraction to meet your own needs
  }
}

// app.controller.ts
import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';

@UseGuards(ThrottlerBehindProxyGuard)
```

!!! info "**Hint**"

    You can find the API of the `req` Request object for express [here](https://expressjs.com/en/api.html#req.ips) and for fastify [here](https://www.fastify.io/docs/latest/Request/).

## Websockets

这个模块可以使用 websockets，但它需要一些类扩展。
你可以像这样扩展`ThrottlerGuard`并覆盖`handleRequest`方法:

```typescript
@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const ip = client.conn.remoteAddress;
    const key = this.generateKey(context, ip);
    const ttls = await this.storageService.getRecord(key);

    if (ttls.length >= limit) {
      throw new ThrottlerException();
    }

    await this.storageService.addRecord(key, ttl);
    return true;
  }
}
```

!!! info "**Hint**"

    如果你正在使用`@nestjs/platform-ws` 包，你可以使用`client._socket.remoteAddress`代替。

## GraphQL

The `ThrottlerGuard` can also be used to work with GraphQL requests.
Again, the guard can be extended, but this time the `getRequestResponse` method will be overridden

```typescript
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }
}
```

## 配置

The following options are valid for the `ThrottlerModule`:

<table>
  <tr>
    <td><code>ttl</code></td>
    <td>每个请求在存储中持续的秒数</td>
  </tr>
  <tr>
    <td><code>limit</code></td>
    <td>TTL限制内的最大请求数</td>
  </tr>
  <tr>
    <td><code>ignoreUserAgents</code></td>
    <td>在限制请求时可以忽略的用户代理的正则表达式数组</td>
  </tr>
  <tr>
    <td><code>storage</code></td>
    <td>用于跟踪请求的存储设置</td>
  </tr>
</table>

## 异步配置

You may want to get your rate-limiting configuration asynchronously instead of synchronously.
You can use the `forRootAsync()` method, which allows for dependency injection and `async` methods.

One approach would be to use a factory function:

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL'),
        limit: config.get('THROTTLE_LIMIT'),
      }),
    }),
  ],
})
export class AppModule {}
```

你也可以使用`useClass`语法:

```typescript
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useClass: ThrottlerConfigService,
    }),
  ],
})
export class AppModule {}
```

这是可行的，只要`ThrottlerConfigService`实现接口`ThrottlerOptionsFactory`。

## 存储

内建存储是一个内存缓存，它跟踪请求，直到它们传递了由全局选项设置的 TTL。
你可以把你自己的存储选项放到`ThrottlerModule`的`storage`选项中，只要这个类实现了`ThrottlerStorage`接口。

对于分布式服务器，你可以使用社区存储提供器[Redis](https://github.com/kkoomen/nestjs-throttler-storage-redis)来获得单一的真相来源。

!!! info **Note** `ThrottlerStorage`可以从`@nestjs/throttler`中导入。
