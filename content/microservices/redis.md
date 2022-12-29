# Redis

[Redis](https://redis.io/)传输器实现了发布/订阅消息传递模式，并利用了 Redis 的[Pub/Sub](https://redis.io/topics/pubsub)特性。
已发布的消息在通道中分类，而不知道哪些订阅者(如果有的话)最终将接收该消息。
每个微服务可以订阅任意数量的频道。
此外，还可以同时订阅多个频道。
通过通道交换的消息是 **即发即忘** ，这意味着如果发布了消息，并且没有对该消息感兴趣的订阅者，则该消息将被删除且无法恢复。
因此，您不能保证消息或事件将由至少一个服务处理。
单个消息可以由多个订阅者订阅(和接收)。

<figure><img src="/assets/Redis_1.png" /></figure>

## 安装

要开始构建基于 redis 的微服务，首先要安装所需的包:

```bash
$ npm i --save redis
```

## 概述

要使用 Redis 传输器，将以下选项对象传递给`createMicroservice()`方法:

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.REDIS,
  options: {
    url: 'redis://localhost:6379',
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.REDIS,
  options: {
    url: 'redis://localhost:6379',
  },
});
```

!!! info "**Hint**"

    `Transport` 枚举从 `@nestjs/microservices` 包中导入。

## 选项

`options` 属性是特定于所选传输器的。
**Redis** 传输器公开了下面描述的属性。

<table>
  <tr>
    <td><code>url</code></td>
    <td>连接url</td>
  </tr>
  <tr>
    <td><code>retryAttempts</code></td>
    <td>重试消息的次数 (默认: <code>0</code>)</td>
  </tr>
  <tr>
    <td><code>retryDelay</code></td>
    <td>消息重试尝试之间的延迟 (ms) (默认: <code>0</code>)</td>
  </tr>
</table>

官方[redis](https://www.npmjs.com/package/redis#options-object-properties)客户端支持的所有属性也由这个传输器支持。

## 客户端

像其他微服务传输器一样，你有[几个选项](https://docs.nestjs.com/microservices/basics#client)来创建 Redis `ClientProxy`实例。

创建实例的一种方法是使用 `ClientsModule`。
要使用 `ClientsModule` 创建一个客户端实例，请导入它并使用 `register()` 方法传递一个选项对象，该对象具有上面 `createMicroservice()` 方法中显示的相同属性，以及一个 `name` 属性，用于作为注入令牌。
点击[这里](https://docs.nestjs.com/microservices/basics#client)阅读更多关于`ClientsModule`的信息。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.REDIS,
        options: {
          url: 'redis://localhost:6379',
        }
      },
    ]),
  ]
  ...
})
```

也可以使用其他创建客户端的选项(`ClientProxyFactory` 或 `@Client()`)。你可以在[这里](https://docs.nestjs.com/microservices/basics#client)阅读。

## 上下文

在更复杂的场景中，您可能希望访问关于传入请求的更多信息。当使用 Redis 传输器时，你可以访问 `RedisContext` 对象。

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RedisContext) {
  console.log(`Channel: ${context.getChannel()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`Channel: ${context.getChannel()}`);
}
```

!!! info "**Hint**"

    `@Payload()`, `@Ctx()` 和 `RedisContext`是从 `@nestjs/microservices` 包导入的。
