# RabbitMQ

[RabbitMQ](https://www.rabbitmq.com/)是一个开源的轻量级消息代理，
支持多种消息协议。
它可以部署在分布式和联合配置中，以满足大规模、高可用性需求。
此外，它是部署最广泛的消息代理，在全球范围内用于小型初创企业和大型企业。

## 安装

要开始构建基于 rabbitmq 的微服务，首先要安装所需的包:

```bash
$ npm i --save amqplib amqp-connection-manager
```

## 概述

要使用 RabbitMQ 传输器，需要将以下选项对象传递给 `createMicroservice()` 方法:

=== "main"

```ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'cats_queue',
      queueOptions: {
        durable: false,
      },
    },
  },
);
```

=== "JavaScript"

```js
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'cats_queue',
    queueOptions: {
      durable: false,
    },
  },
});
```

!!! info "**Hint**"

    `Transport` 枚举是从 `@nestjs/microservices` 包中导入的。

## 选项

`options`属性特定于所选的传输器。
**RabbitMQ** 传输器暴露了下面描述的属性。

<table>
  <tr>
    <td><code>urls</code></td>
    <td>连接url</td>
  </tr>
  <tr>
    <td><code>queue</code></td>
    <td>您的服务器将侦听的队列名称</td>
  </tr>
  <tr>
    <td><code>prefetchCount</code></td>
    <td>设置通道的预取计数</td>
  </tr>
  <tr>
    <td><code>isGlobalPrefetchCount</code></td>
    <td>启用每个通道预取</td>
  </tr>
  <tr>
    <td><code>noAck</code></td>
    <td>如果<code>false</code>，则启用手动确认模式</td>
  </tr>
  <tr>
    <td><code>queueOptions</code></td>
    <td>额外的队列选项(读取更多<a href="https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue" rel="nofollow" target="_blank">这里</a>)</td>
  </tr>
  <tr>
    <td><code>socketOptions</code></td>
    <td>额外的套接字选项(读取更多<a href="https://www.squaremobius.net/amqp.node/channel_api.html#socket-options" rel="nofollow" target="_blank">这里</a>)</td>
  </tr>
  <tr>
    <td><code>headers</code></td>
    <td>标题将随每条消息一起发送</td>
  </tr>
</table>

## 客户端

像其他微服务传输器一样，创建 RabbitMQ `ClientProxy` 实例有[几个选项](https://docs.nestjs.com/microservices/basics#client)。

创建实例的一种方法是使用`ClientsModule`。
要使用`ClientsModule`创建一个客户端实例，请导入它并使用`register()`方法传递一个选项对象，该对象具有上面`createMicroservice()`方法中显示的相同属性，以及一个`name`属性，用于作为注入令牌。
点击[这里](https://docs.nestjs.com/microservices/basics#client)阅读更多关于 `ClientsModule` 的信息。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'cats_queue',
          queueOptions: {
            durable: false
          },
        },
      },
    ]),
  ]
  ...
})
```

也可以使用其他创建客户端的选项(`ClientProxyFactory`或`@Client()`)。
你可以在[这里](https://docs.nestjs.com/microservices/basics#client)阅读。

## 上下文

在更复杂的场景中，您可能希望访问关于传入请求的更多信息。
当使用 RabbitMQ 传输器时，你可以访问`RmqContext`对象。

=== "TypeScript"

```ts
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  console.log(`Pattern: ${context.getPattern()}`);
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`Pattern: ${context.getPattern()}`);
}
```

!!! info "**Hint**"

    `@Payload()`, `@Ctx()` 和 `RmqContext` 从 `@nestjs/microservices` 包导入.

要访问原始的 RabbitMQ 消息 (with the `properties`, `fields`, and `content`), 使用`RmqContext`对象的`getMessage()`方法, 如下:

=== "TypeScript"

```ts
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  console.log(context.getMessage());
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(context.getMessage());
}
```

获取对 RabbitMQ [channel](https://www.rabbitmq.com/channels.html)的引用, 使用`RmqContext`对象的`getChannelRef`方法，如下所示:

=== "TypeScript"

```ts
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  console.log(context.getChannelRef());
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(context.getChannelRef());
}
```

## 消息确认

为了确保消息永远不会丢失，RabbitMQ 支持[消息确认](https://www.rabbitmq.com/confirms.html).
一个确认信息被消费者发送回 RabbitMQ，告诉 RabbitMQ 已经收到并处理了一个特定的消息，并且 RabbitMQ 可以自由删除它。
如果一个使用者死了(它的通道被关闭，连接被关闭，或者 TCP 连接丢失)而没有发送一个 ack, RabbitMQ 将会理解一个消息没有被完全处理，并将它重新排队。

要启用手动确认模式，请将`noAck`属性设置为`false`:

```typescript
options: {
  urls: ['amqp://localhost:5672'],
  queue: 'cats_queue',
  noAck: false,
  queueOptions: {
    durable: false
  },
},
```

当手动使用者确认被打开时，我们必须从工作者发送一个适当的确认，以表明我们完成了一个任务。

=== "TypeScript"

```ts
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  channel.ack(originalMsg);
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  channel.ack(originalMsg);
}
```

## 记录构建

要配置消息选项，您可以使用`RmqRecordBuilder`类(注意:这对于基于事件的流也是可行的)。
例如，要设置`headers`和`priority`属性，使用`setOptions`方法，如下所示:

```typescript
const message = ':cat:';
const record = new RmqRecordBuilder(message)
  .setOptions({
    headers: {
      ['x-version']: '1.0.0',
    },
    priority: 3,
  })
  .build();

this.client.send('replace-emoji', record).subscribe(...);
```

!!! info "**Hint**"

    `RmqRecordBuilder`类从`@nestjs/microservices`包中导出。

你也可以在服务器端读取这些值，通过访问`RmqContext`，如下所示:

=== "TypeScript"

```ts
@MessagePattern('replace-emoji')
replaceEmoji(@Payload() data: string, @Ctx() context: RmqContext): string {
  const { properties: { headers } } = context.getMessage();
  return headers['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('replace-emoji')
replaceEmoji(data, context) {
  const { properties: { headers } } = context.getMessage();
  return headers['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```
