# 概述

除了传统的(有时称为单片的)应用程序架构外，Nest 本身支持微服务架构风格的开发。
本文档中其他地方讨论的大多数概念，比如依赖注入、装饰器、异常过滤器、管道、守卫和拦截器，都同样适用于微服务。
只要有可能，Nest 就会抽象实现细节，这样相同的组件就可以在基于 http 的平台、WebSockets 和微服务上运行。
本节将介绍 Nest 特定于微服务的各个方面。

在 Nest 中，微服务本质上是一个应用程序，它使用了与 HTTP 不同的 **传输** 层。

<figure><img src="/assets/Microservices_1.png" /></figure>

Nest 支持几个内置的传输层实现，称为 **transporters** ，负责在不同的微服务实例之间传输消息。
大多数传输器天生支持 **请求-响应**和**基于事件的** 消息样式。
Nest 将每个传输器的实现细节抽象为一个规范接口，用于基于请求-响应和基于事件的消息传递。
这使得可以很容易地从一个传输层切换到另一个传输层——例如，利用特定传输层的特定可靠性或性能特性——而不会影响应用程序代码。

## 安装

要开始构建微服务，首先要安装所需的包:

```bash
$ npm i --save @nestjs/microservices
```

## 开始

要实例化一个微服务，使用`NestFactory`类的`createMicroservice()`方法:

=== "main.ts"

    ```ts
    import { NestFactory } from '@nestjs/core';
    import { Transport, MicroserviceOptions } from '@nestjs/microservices';
    import { AppModule } from './app.module';

    async function bootstrap() {
      const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
          transport: Transport.TCP,
        },
      );
      app.listen();
    }
    bootstrap();
    ```

=== "main.js"

    ```js
    import { NestFactory } from '@nestjs/core';
    import { Transport, MicroserviceOptions } from '@nestjs/microservices';
    import { AppModule } from './app.module';

    async function bootstrap() {
      const app = await NestFactory.createMicroservice(AppModule, {
        transport: Transport.TCP,
      });
      app.listen(() => console.log('Microservice is listening'));
    }
    bootstrap();
    ```

!!! info "微服务默认使用**TCP** 传输层。"

`createMicroservice()`方法的第二个参数是一个`options`对象。
该对象可以由两个成员组成:

<table>
  <tr>
    <td><code>transport</code></td>
    <td>指定传输器 (例如, <code>Transport.NATS</code>)</td>
  </tr>
  <tr>
    <td><code>options</code></td>
    <td>确定传输程序行为的传输程序特定的选项对象</td>
  </tr>
</table>

`options`对象特定于所选的传输器。
**TCP** 传输器公开
下面描述的属性。
对于其他传输器(如 Redis、MQTT 等)，请参阅相关章节以了解可用选项的描述。

<table>
  <tr>
    <td><code>host</code></td>
    <td>连接主机名</td>
  </tr>
  <tr>
    <td><code>port</code></td>
    <td>连接端口</td>
  </tr>
  <tr>
    <td><code>retryAttempts</code></td>
    <td>重试消息的次数 (default: <code>0</code>)</td>
  </tr>
  <tr>
    <td><code>retryDelay</code></td>
    <td>消息重试间隔时间(ms)(default: <code>0</code>)</td>
  </tr>
</table>

## 模式

微服务通过 **模式** 识别消息和事件。
模式是普通值，例如，文字对象或字符串。
模式被自动序列化，并与消息的数据部分一起通过网络发送。
通过这种方式，消息发送者和使用者可以协调哪些请求由哪些处理程序使用。

## 请求-响应

当您需要在各种外部服务之间 **交换** 消息时，请求-响应消息样式非常有用。
使用此范例，您可以确定服务已经实际接收了消息(而不需要手动实现消息 ACK 协议)。
然而，请求-响应范例并不总是最佳选择。
例如，使用基于日志的持久性的流传输器，如[Kafka](https://docs.confluent.io/3.0.0/streams/)或[NATS 流传输器](https://github.com/nats-io/node-nats-streaming)，被优化以解决不同范围的问题，更符合事件消息传递范例(请参阅下面的[基于事件的消息传递](https://docs.nestjs.com/microservices/basics#event-based)以了解更多细节)。

为了启用请求-响应消息类型，Nest 创建了两个逻辑通道——一个负责传输数据，另一个负责等待传入的响应。
对于一些底层传输，如[NATS](https://nats.io/)，这种双通道支持是开箱即用的。
对于其他人，Nest 会手动创建单独的通道作为补偿。
这可能会带来一些开销，因此如果您不需要请求-响应消息样式，则应该考虑使用基于事件的方法。

要创建基于请求-响应范例的消息处理程序，请使用`@MessagePattern()` 装饰器，它是从`@nestjs/microservices`包中导入的。
这个装饰器应该只在[controller](https://docs.nestjs.com/controllers)类中使用，因为它们是应用程序的入口点。
在提供程序中使用它们不会有任何影响，因为它们会被 Nest 运行时忽略。

=== "math.controller.ts"

    ```ts
    import { Controller } from '@nestjs/common';
    import { MessagePattern } from '@nestjs/microservices';

    @Controller()
    export class MathController {
      @MessagePattern({ cmd: 'sum' })
      accumulate(data: number[]): number {
        return (data || []).reduce((a, b) => a + b);
      }
    }
    ```

=== "math.controller.js"

    ```js
    import { Controller } from '@nestjs/common';
    import { MessagePattern } from '@nestjs/microservices';

    @Controller()
    export class MathController {
      @MessagePattern({ cmd: 'sum' })
      accumulate(data) {
        return (data || []).reduce((a, b) => a + b);
      }
    }
    ```

在上面的代码中，`accumulate()` **消息处理器** 监听满足 `{ cmd: 'sum' }` 消息模式的消息。
消息处理程序只接受一个参数，即从客户端传递的‘data’。
在这种情况下，数据是一个要累积的数字数组。

## 异步响应

消息处理程序能够同步或异步响应。
因此，支持`async`方法。

=== "TypeScript"

    ```ts
    @MessagePattern({ cmd: 'sum' })
    async accumulate(data: number[]): Promise<number> {
      return (data || []).reduce((a, b) => a + b);
    }
    ```

=== "JavaScript"

    ```js
    @MessagePattern({ cmd: 'sum' })
    async accumulate(data) {
      return (data || []).reduce((a, b) => a + b);
    }
    ```

消息处理程序也能够返回一个`Observable`，在这种情况下，结果值将被触发，直到流完成。

=== "TypeScript"

    ```ts
    @MessagePattern({ cmd: 'sum' })
    accumulate(data: number[]): Observable<number> {
      return from([1, 2, 3]);
    }
    ```

=== "JavaScript"

    ```js
    @MessagePattern({ cmd: 'sum' })
    accumulate(data: number[]): Observable<number> {
      return from([1, 2, 3]);
    }
    ```

在上面的例子中，消息处理程序将响应 **3 次** (每一项都来自数组)。

## 基于事件的

虽然请求-响应方法是服务之间交换消息的理想方法，但当您的消息样式是基于事件的——当您只想发布 **事件** 而不等待响应时，它就不太适合了。
在这种情况下，您不希望维护两个通道所需的请求-响应开销。

假设您想简单地通知另一个服务在系统的这一部分发生了某个条件。
这是基于事件的消息样式的理想用例。

要创建一个事件处理程序，我们使用`@EventPattern()`装饰器，它是从`@nestjs/microservices`包中导入的。

=== "TypeScript"

    ```ts
    @EventPattern('user_created')
    async handleUserCreated(data: Record<string, unknown>) {
      // business logic
    }
    ```

=== "JavaScript"

    ```js
    @EventPattern('user_created')
    async handleUserCreated(data) {
      // business logic
    }
    ```

!!! info "**Hint**"

    你可以为一个**单个** 事件模式注册多个事件处理程序，所有的事件处理程序都将被自动并行触发。

`handleUserCreated()` **事件处理程序** 监听 `user_created` 事件。
事件处理程序只接受一个参数，即从客户端传递的`数据`(在本例中，是通过网络发送的事件有效负载)。

## 修饰符

在更复杂的场景中，您可能希望访问关于传入请求的更多信息。
例如，对于具有通配符订阅的 NATS，您可能希望获取生产者已将消息发送到的原始主题。
同样，在 Kafka 中，你可能想要访问消息头。
为了实现这一点，你可以像下面这样使用内置装饰器:

=== "TypeScript"

    ```ts
    @MessagePattern('time.us.*')
    getDate(@Payload() data: number[], @Ctx() context: NatsContext) {
      console.log(`Subject: ${context.getSubject()}`); // e.g. "time.us.east"
      return new Date().toLocaleTimeString(...);
    }
    ```

=== "JavaScript"

    ```js
    @Bind(Payload(), Ctx())
    @MessagePattern('time.us.*')
    getDate(data, context) {
      console.log(`Subject: ${context.getSubject()}`); // e.g. "time.us.east"
      return new Date().toLocaleTimeString(...);
    }
    ```

!!! info "**Hint**"

    `@Payload()`, `@Ctx()` and `NatsContext` 从 `@nestjs/microservices` 导入.

!!! info "**Hint**"

    你也可以传递一个属性键给 `@Payload()` 装饰器来从传入的 payload 对象中提取一个特定的属性，例如`@Payload('id')`。

## 客户端

客户端 Nest 应用程序可以使用`ClientProxy`类向 Nest 微服务交换消息或发布事件。
这个类定义了几个方法，比如`send()`(用于请求-响应消息传递)和`emit()`(用于事件驱动消息传递)，这些方法允许您与远程微服务通信。
通过以下方式之一获取该类的实例。

一种技术是导入`ClientsModule`，它公开了静态的`register()`方法。
此方法接受一个参数，该参数是代表微服务传输器的对象数组。
每个这样的对象都有一个`name`属性、一个可选的`transport`属性(默认为`transport.tcp`)和一个可选的特定于传输器的`options`属性。

`name`属性作为一个 **注入令牌** ，可以在需要的地方注入一个`ClientProxy`的实例。
`name`属性的值，作为一个注入令牌，可以是任意字符串或 JavaScript 符号，如[这里](https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens)所述。

`options`属性是一个与我们之前在`createMicroservice()`方法中看到的属性相同的对象。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      { name: 'MATH_SERVICE', transport: Transport.TCP },
    ]),
  ]
  ...
})
```

一旦模块被导入，我们就可以使用`@Inject()`装饰器，注入`ClientProxy`的一个实例，该实例是通过上面显示的`MATH_SERVICE`传输器选项指定的。

```typescript
constructor(
  @Inject('MATH_SERVICE') private client: ClientProxy,
) {}
```

!!! info "**Hint**"

    `ClientsModule`和`ClientProxy`类是从`@nestjs/microservices`包中导入的。

有时，我们可能需要从另一个服务(比如`ConfigService`)获取传输器配置，而不是在我们的客户端应用程序中硬编码它。
为此，我们可以使用`ClientProxyFactory`类注册一个[custom provider](/fundamentals/custom-providers)。
这个类有一个静态的`create()`方法，它接受一个传输器选项对象，并返回一个自定义的`ClientProxy`实例。

```typescript
@Module({
  providers: [
    {
      provide: 'MATH_SERVICE',
      useFactory: (configService: ConfigService) => {
        const mathSvcOptions = configService.getMathSvcOptions();
        return ClientProxyFactory.create(mathSvcOptions);
      },
      inject: [ConfigService],
    }
  ]
  ...
})
```

!!! info "**Hint**"

    `ClientProxyFactory`是从`@nestjs/microservices`包导入的。

另一个选择是使用@Client()属性装饰器。

```typescript
@Client({ transport: Transport.TCP })
client: ClientProxy;
```

!!! info "**Hint**"

    The `@Client()` decorator is imported from the `@nestjs/microservices` package.

使用`@Client()`装饰器不是首选的技术，因为它更难测试，更难共享客户端实例。

`ClientProxy`是 **lazy** 。
它不会立即启动连接。
相反，它将在第一次微服务调用之前建立，然后在每个后续调用之间重用。
然而，如果你想要延迟应用程序的引导过程，直到连接建立，你可以使用`OnApplicationBootstrap`生命周期钩子中的`ClientProxy`对象的`connect()`方法手动启动一个连接。

```ts
async onApplicationBootstrap() {
  await this.client.connect();
}
```

如果不能创建连接， `connect()` 方法将拒绝相应的错误对象。

## 发送消息

`ClientProxy`公开了一个`send()`方法。
这个方法的目的是调用微服务，并返回一个带有响应的 `Observable` 。
因此，我们可以很容易地订阅发出的值。

=== "TypeScript"

    ```ts
    accumulate(): Observable<number> {
      const pattern = { cmd: 'sum' };
      const payload = [1, 2, 3];
      return this.client.send<number>(pattern, payload);
    }
    ```

=== "JavaScript"

    ```js
    accumulate() {
      const pattern = { cmd: 'sum' };
      const payload = [1, 2, 3];
      return this.client.send(pattern, payload);
    }
    ```

`send()`方法有两个参数，`pattern`和`payload`。
`pattern`应该与`@messageppattern()`装饰器中定义的模式匹配。
`有效负载`是我们想要传输到远程微服务的消息。
这个方法返回一个 **冷的** `可观察对象`，这意味着你必须在消息被发送之前显式地订阅它。

## 发布事件

要发送一个事件，请使用`ClientProxy`对象的`emit()`方法。
此方法将事件发布到消息代理。

=== "TypeScript"

    ```ts
    async publish() {
      this.client.emit<number>('user_created', new UserCreatedEvent());
    }
    ```

=== "JavaScript"

    ```js
    async publish() {
      this.client.emit('user_created', new UserCreatedEvent());
    }
    ```

`emit()`方法有两个参数，`pattern`和`payload`。`pattern`应该与`@EventPattern()`装饰器中定义的模式匹配。`payload`是我们想要传输到远程微服务的事件有效载荷。
这个方法返回一个 **热的** `可观察对象`(不像`send()`返回的冷的`可观察对象`)，这意味着无论你是否显式地订阅了这个可观察对象，代理都会立即尝试发送这个事件。

## 作用域

对于来自不同编程语言背景的人来说，可能会意外地发现，在 Nest 中，几乎所有的东西都是在传入请求之间共享的。
我们有一个到数据库的连接池，带有全局状态的单例服务，等等。
记住，Node.js 并不遵循请求/响应多线程无状态模型，在该模型中，每个请求都由一个单独的线程处理。
因此，对于我们的应用来说，使用单例实例是完全安全的。

然而，在一些边缘情况下，基于请求的处理程序生命周期可能是所需的行为，例如 GraphQL 应用程序中的每个请求缓存、请求跟踪或多租户。
了解如何控制范围[在这里](/基本面/注入范围)。

请求作用域的处理程序和提供器可以使用`@Inject()`装饰器结合`CONTEXT`令牌来注入`RequestContext`:

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { CONTEXT, RequestContext } from '@nestjs/microservices';

@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  constructor(@Inject(CONTEXT) private ctx: RequestContext) {}
}
```

这提供了对`RequestContext`对象的访问，该对象有两个属性:

```typescript
export interface RequestContext<T = any> {
  pattern: string | Record<string, any>;
  data: T;
}
```

`data`属性是由消息生成器发送的消息有效负载。
`pattern`属性是用来标识处理传入消息的适当处理程序的模式。

## 处理超时

在分布式系统中，有时微服务可能会关闭或不可用。
为了避免无限长的等待，您可以使用 `timeout`。
在与其他服务通信时，超时是一种非常有用的模式。
要在微服务调用中应用超时，你可以使用 `RxJS` 超时操作符。
如果微服务在一定时间内没有响应请求，就会抛出一个异常，可以捕获并适当地处理这个异常。

要解决这个问题，你必须使用[rxjs](https://github.com/ReactiveX/rxjs)包。
只需在管道中使用 `timeout` 操作符:

=== "TypeScript"

    ```ts
    this.client
      .send<TResult, TInput>(pattern, data)
      .pipe(timeout(5000))
      .toPromise();
    ```

=== "JavaScript"

    ```js
    this.client.send(pattern, data).pipe(timeout(5000)).toPromise();
    ```

!!! info "`timeout`操作符是从`rxjs/operators`包中导入的。"

5 秒后，如果微服务没有响应，它将抛出一个错误。
