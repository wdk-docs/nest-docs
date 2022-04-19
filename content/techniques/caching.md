### 缓存

缓存是一种伟大而简单的技术，可以帮助你提高应用程序的性能
它充当临时数据存储，提供高性能数据访问。

#### 安装

首先安装所需的软件包:

```bash
$ npm install cache-manager
$ npm install -D @types/cache-manager
```

#### 内存缓存

Nest 为各种缓存存储提供商提供了统一的 API
内置的是内存中的数据存储
不过，你可以很容易地切换到一个更全面的解决方案，比如 Redis。

为了启用缓存，导入`CacheModule`并调用它的`register()`方法。

```typescript
import { CacheModule, Module } from`@nestjs/common';
import { AppController } from`./app.controller';

@Module({
  imports: [CacheModule.register()],
  controllers: [AppController],
})
export class AppModule {}
```

#### 与缓存存储交互

要与缓存管理器实例交互，使用`CACHE_MANAGER`令牌将其注入到你的类中，如下所示:

```typescript
constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
```

> info **Hint** `Cache`类是从`cache-manager`导入的，而`CACHE_MANAGER`令牌是从`@nestjs/common`包导入的。

`Cache`实例的`get`方法(来自`cache-manager`包)用于从缓存中检索项
如果该项在缓存中不存在，则返回`null`。

```typescript
const value = await this.cacheManager.get('key');
```

要向缓存中添加一个项，请使用`set`方法:

```typescript
await this.cacheManager.set('key', 'value');
```

缓存的默认过期时间为 5 秒。

您可以手动为这个特定的密钥指定一个 TTL(以秒为单位的过期时间)，如下所示:

```typescript
await this.cacheManager.set('key', 'value', { ttl: 1000 });
```

缓存的默认过期时间为 5 秒。

您可以手动为这个特定的密钥指定一个 TTL(以秒为单位的过期时间)，如下所示:

```typescript
await this.cacheManager.set('key', 'value', { ttl: 0 });
```

要从缓存中删除一个项，使用`del`方法:

```typescript
await this.cacheManager.del('key');
```

要清除整个缓存，请使用`reset`方法:

```typescript
await this.cacheManager.reset();
```

#### 自动缓存响应

> warning **Warning** 在[GraphQL](/GraphQL/quick-start)应用程序中，拦截器是为每个字段解析器单独执行的
> 因此，`CacheModule`(使用拦截器来缓存响应)将无法正常工作。

要启用自动缓存响应，只需将`CacheInterceptor`绑定在你想要缓存数据的地方。

```typescript
@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get()
  findAll(): string[] {
    return [];
  }
}
```

> warning**Warning** 只缓存`GET`端点
> 此外，注入本机响应对象(`@Res()`)的 HTTP 服务器路由不能使用缓存拦截器
> 请参阅<a href="https://docs.nestjs.com/interceptors#response-mapping">响应映射</a>了解更多详细信息。

为了减少所需样板文件的数量，你可以全局绑定`CacheInterceptor`到所有端点:

```typescript
import { CacheModule, Module, CacheInterceptor } from`@nestjs/common';
import { AppController } from`./app.controller';
import { APP_INTERCEPTOR } from`@nestjs/core';

@Module({
  imports: [CacheModule.register()],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
```

#### 定制高速缓存

所有缓存数据都有自己的过期时间([TTL](https://en.wikipedia.org/wiki/Time_to_live))
要自定义默认值，将选项对象传递给`register()`方法。

```typescript
CacheModule.register({
  ttl: 5, // seconds
  max: 10, // maximum number of items in cache
});
```

#### 在全局范围内使用模块

当你想在其他模块中使用`CacheModule`时，你需要导入它(就像任何 Nest 模块一样)
或者，通过设置 options 对象的`isGlobal`属性为`true`来声明它为[global 模块](https://docs.nestjs.com/modules#global-modules)，如下所示
在这种情况下，一旦`CacheModule`被加载到根模块(例如`AppModule`)，你就不需要在其他模块中导入它了。

```typescript
CacheModule.register({
  isGlobal: true,
});
```

#### 全局缓存覆盖

当全局缓存被启用时，缓存条目被存储在一个`CacheKey`下，这个`CacheKey`是根据路由路径自动生成的
你可以在每个方法的基础上重写某些缓存设置(`@CacheKey()`和`@CacheTTL()`)，允许为每个控制器方法定制缓存策略
在使用[不同的缓存存储]时这可能是最相关的。(https://docs.nestjs.com/techniques/caching#different-stores)

```typescript
@Controller()
export class AppController {
  @CacheKey('custom_key')
  @CacheTTL(20)
  findAll(): string[] {
    return [];
  }
}
```

> info **Hint** `@CacheKey()`和`@CacheTTL()`装饰器是从`@nestjs/common`包中导入的。

`@CacheKey()`修饰符可以和对应的`@CacheTTL()`修饰符一起使用，也可以不使用，反之亦然
可以选择只覆盖`@CacheKey()`或只覆盖`@CacheTTL()`
没有被装饰器覆盖的设置将使用全局注册的默认值(参见[自定义缓存](https://docs.nestjs.com/techniques/caching#customize-caching))。

#### WebSockets 和 Microservices

你也可以将`CacheInterceptor`应用到 WebSocket 订阅者和 Microservice 的模式中(不管使用的传输方法是什么)。

```typescript
@@filename()
@CacheKey('events')
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client: Client, data: string[]): Observable<string[]> {
  return [];
}
@@switch
@CacheKey('events')
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client, data) {
  return [];
}
```

然而，额外的`@CacheKey()`修饰符是必需的，以便指定一个用于随后存储和检索缓存数据的键
此外，请注意，您**不应该缓存所有内容**
执行某些业务操作而不是简单地查询数据的操作永远不应该被缓存。

此外，您可以使用`@CacheTTL()`装饰器指定缓存过期时间(TTL)，它将覆盖全局默认 TTL 值。

```typescript
@@filename()
@CacheTTL(10)
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client: Client, data: string[]): Observable<string[]> {
  return [];
}
@@switch
@CacheTTL(10)
@UseInterceptors(CacheInterceptor)
@SubscribeMessage('events')
handleEvent(client, data) {
  return [];
}
```

> info **Hint** `@CacheTTL()`修饰符可以与对应的`@CacheKey()`修饰符一起使用，也可以不使用。

#### 调整跟踪

默认情况下，Nest 使用请求 URL(在 HTTP 应用程序中)或缓存键(在 websockets 和微服务应用程序中，通过`@CacheKey()`装饰器设置)来将缓存记录与端点关联起来
然而，有时您可能希望基于不同的因素设置跟踪，例如，使用 HTTP 头(例如
'授权'以正确标识'配置文件'端点)。

为了实现这一点，创建一个`CacheInterceptor`的子类，并覆盖`trackBy()`方法。

```typescript
@Injectable()
class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    return`key';
  }
}
```

#### 不同的商店

该服务在内部利用了[cache-manager](https://github.com/BryanDonovan/node-cache-manager)
`cache-manager`包支持广泛的有用的存储，例如[Redis store](https://github.com/dabroek/node-cache-manager-redis-store)
支持的商店的完整列表可以获得[此处](https://github.com/BryanDonovan/node-cache-manager#store-engines)
要设置 Redis store，只需将包连同相应的选项传递给`register()`方法。

```typescript
import type { ClientOpts as RedisClientOpts } from`redis';
import * as redisStore from`cache-manager-redis-store';
import { CacheModule, Module } from`@nestjs/common';
import { AppController } from`./app.controller';

@Module({
  imports: [
    CacheModule.register<RedisClientOpts>({
      store: redisStore,
      // Store-specific configuration:
      host:`localhost',
      port: 6379,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

#### 异步的配置

你可能想要异步传递模块选项，而不是在编译时静态传递
在这种情况下，使用`registerAsync()`方法，它提供了几种处理异步配置的方法。

一种方法是使用工厂函数:

```typescript
CacheModule.registerAsync({
  useFactory: () => ({
    ttl: 5,
  }),
});
```

我们的工厂行为与所有其他异步模块工厂一样(它可以是`async`，并能够通过`inject`注入依赖)。

```typescript
CacheModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    ttl: configService.get('CACHE_TTL'),
  }),
  inject: [ConfigService],
});
```

或者，你可以使用`useClass`方法:

```typescript
CacheModule.registerAsync({
  useClass: CacheConfigService,
});
```

上面的构造将在`CacheModule`中实例化`CacheConfigService`，并使用它来获取选项对象
为了提供配置选项，`CacheConfigService`必须实现`CacheOptionsFactory`接口:

```typescript
@Injectable()
class CacheConfigService implements CacheOptionsFactory {
  createCacheOptions(): CacheModuleOptions {
    return {
      ttl: 5,
    };
  }
}
```

如果你希望使用从不同模块导入的现有配置提供程序，请使用`useExisting`语法:

```typescript
CacheModule.registerAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

它的工作原理与`useClass`相同，但有一个关键的区别——`CacheModule`将查找导入的模块来重用任何已经创建的`ConfigService`，而不是实例化它自己的模块。

> info **Hint** `CacheModule#register`、`CacheModule#registerAsync`和`CacheOptionsFactory`有一个可选的泛型(类型参数)来缩小特定于存储的配置选项，使其类型安全。

#### 例子

[此处](https://github.com/nestjs/nest/tree/master/sample/20-cache)提供了一个工作示例。
