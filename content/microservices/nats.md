# NATS

[NATS](https://nats.io)是一个简单、安全、高性能的开源消息传递系统，适用于云本地应用、物联网消息传递和微服务架构。
NATS 服务器是用 Go 编程语言编写的，但与服务器交互的客户端库可用于数十种主要的编程语言。
NATS 支持 **At Most Once**和**At Least Once** 交付。
它可以在任何地方运行，从大型服务器和云实例，到边缘网关，甚至是物联网设备。

## 安装

要开始构建基于 NATS 的微服务，首先要安装所需的包:

```bash
$ npm i --save nats
```

## 概述

要使用 NATS 传输器，将以下选项对象传递给`createMicroservice()`方法:

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.NATS,
  options: {
    servers: ['nats://localhost:4222'],
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.NATS,
  options: {
    servers: ['nats://localhost:4222'],
  },
});
```

!!! info "**Hint**"

    `Transport` 枚举是从`@nestjs/microservices`包导入的。

## 选项

`options`对象特定于所选的传输器。
NATS 传输器公开了[此处](https://github.com/nats-io/node-nats#connect-options)所描述的属性.
此外，有一个`queue`属性，它允许你指定你的服务器应该订阅的队列的名称(保留`undefined`忽略这个设置)。
阅读[下面](https://docs.nestjs.com/microservices/nats#queue-groups)关于 NATS 队列组的更多信息

## 客户端

与其他微服务传输器一样，创建 NATS `ClientProxy`实例有[几个选项](https://docs.nestjs.com/microservices/basics#client)。

创建实例的一种方法是使用`ClientsModule`。
要使用`ClientsModule`创建一个客户端实例，请导入它并使用`register()`方法传递一个选项对象，该对象具有上面`createMicroservice()`方法中显示的相同属性，以及一个`name`属性，用于作为注入令牌。
点击[这里](https://docs.nestjs.com/microservices/basics#client)阅读更多关于“ClientsModule”的信息

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: ['nats://localhost:4222'],
        }
      },
    ]),
  ]
  ...
})
```

也可以使用其他创建客户端的选项(`ClientProxyFactory`或`@Client()`)。
你可以在[这里](https://docs.nestjs.com/microservices/basics#client)阅读。

## 请求-响应

对于 **请求-响应** 消息样式([阅读更多](https://docs.nestjs.com/microservices/basics#request-response))，NATS 传输器不使用 NATS 内置的[请求-应答](https://docs.nats.io/nats-concepts/reqreply)机制。
相反，使用`publish()`方法在给定的主题上发布一个“请求”，该方法具有惟一的应答主题名称，应答者监听该主题并向应答主题发送响应。
回复主题被动态地定向回请求者，而不管任何一方的位置。

## 基于事件的

对于 **基于事件的** 消息样式([阅读更多](https://docs.nestjs.com/microservices/basics#event-based))， NATS 传输器使用 NATS 内置的[发布-订阅](https://docs.nats.io/nats-concepts/pubsub)机制。
发布者发送关于主题的消息，任何监听该主题的活动订阅者都会接收该消息。
订阅者还可以注册对通配符主题的兴趣，它的工作方式有点像正则表达式。
这种一对多模式有时称为扇出。

## 队列组

NATS 提供了一个称为[分布式队列](https://docs.nats.io/nats-concepts/queue)的内置负载平衡特性。
要创建队列订阅，使用 `queue` 属性如下所示:

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.NATS,
  options: {
    servers: ['nats://localhost:4222'],
    queue: 'cats_queue',
  },
});
```

## 上下文

在更复杂的场景中，您可能希望访问关于传入请求的更多信息。
当使用 NATS 传输器时，您可以访问 `NatsContext` 对象。

```typescript
@@filename()
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: NatsContext) {
  console.log(`Subject: ${context.getSubject()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`Subject: ${context.getSubject()}`);
}
```

!!! info "**Hint**"

     `@Payload()` ，  `@Ctx()` 和 `NatsContext` 是从 `@nestjs/microservices` 包导入的。

## 通配符

订阅可以是对显式主题的订阅，也可以包括通配符。

```typescript
@@filename()
@MessagePattern('time.us.*')
getDate(@Payload() data: number[], @Ctx() context: NatsContext) {
  console.log(`Subject: ${context.getSubject()}`); // e.g. "time.us.east"
  return new Date().toLocaleTimeString(...);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('time.us.*')
getDate(data, context) {
  console.log(`Subject: ${context.getSubject()}`); // e.g. "time.us.east"
  return new Date().toLocaleTimeString(...);
}
```

## 记录构建

要配置消息选项，可以使用 `NatsRecordBuilder` 类(注意:这对基于事件的流也是可行的)。
例如，要添加 `x-version` 标头，使用 `setHeaders` 方法，如下所示:

```typescript
import * as nats from 'nats';

// somewhere in your code
const headers = nats.headers();
headers.set('x-version', '1.0.0');

const record = new NatsRecordBuilder(':cat:').setHeaders(headers).build();
this.client.send('replace-emoji', record).subscribe(...);
```

!!! info "**Hint**"

     `NatsRecordBuilder` 类从 `@nestjs/microservices` 包中导出。

你也可以在服务器端读取这些头文件，通过访问 `NatsContext` ，如下所示:

```typescript
@@filename()
@MessagePattern('replace-emoji')
replaceEmoji(@Payload() data: string, @Ctx() context: NatsContext): string {
  const headers = context.getHeaders();
  return headers['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('replace-emoji')
replaceEmoji(data, context) {
  const headers = context.getHeaders();
  return headers['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```

在某些情况下，你可能想为多个请求配置头信息，你可以将这些信息作为选项传递给 `ClientProxyFactory` :

```typescript
import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  providers: [
    {
      provide: 'API_v1',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            servers: ['nats://localhost:4222'],
            headers: { 'x-version': '1.0.0' },
          },
        }),
    },
  ],
})
export class ApiModule {}
```
