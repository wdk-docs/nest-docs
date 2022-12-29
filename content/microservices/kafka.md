# Kafka

[Kafka](https://kafka.apache.org/)是一个开源的分布式流媒体平台，它有三个关键功能:

- 发布和订阅记录流，类似于消息队列或企业消息传递系统。
- 对记录流进行持久的容错存储。
- 记录流发生时进行处理。

Kafka 项目的目标是提供一个统一、高吞吐量、低延迟的平台来处理实时数据。它与 Apache Storm 和 Spark 集成得非常好，可以进行实时流数据分析。

## 安装

要开始构建基于 kafka 的微服务，首先要安装所需的包:

```bash
$ npm i --save kafkajs
```

## 概述

像其他的 Nest 微服务传输层实现一样，你使用传递给 `createMicroservice()` 方法的 options 对象的 `transport` 属性来选择 Kafka 传输机制，以及一个可选的 `options` 属性，如下所示:

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: ['localhost:9092'],
    }
  }
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: ['localhost:9092'],
    }
  }
});
```

!!! info "**Hint**"

     `Transport`  enum 是从 `@nestjs/microservices` 包导入的。

## 选项

options 属性是特定于所选传输器的。<strong>Kafka</strong>传输器暴露了下面描述的属性。

<table>
  <tr>
    <td><code>client</code></td>
    <td>Client configuration options (read more
      <a
        href="https://kafka.js.org/docs/configuration"
        rel="nofollow"
        target="blank"
        >here</a
      >)</td>
  </tr>
  <tr>
    <td><code>consumer</code></td>
    <td>Consumer configuration options (read more
      <a
        href="https://kafka.js.org/docs/consuming#a-name-options-a-options"
        rel="nofollow"
        target="blank"
        >here</a
      >)</td>
  </tr>
  <tr>
    <td><code>run</code></td>
    <td>Run configuration options (read more
      <a
        href="https://kafka.js.org/docs/consuming"
        rel="nofollow"
        target="blank"
        >here</a
      >)</td>
  </tr>
  <tr>
    <td><code>subscribe</code></td>
    <td>Subscribe configuration options (read more
      <a
        href="https://kafka.js.org/docs/consuming#frombeginning"
        rel="nofollow"
        target="blank"
        >here</a
      >)</td>
  </tr>
  <tr>
    <td><code>producer</code></td>
    <td>Producer configuration options (read more
      <a
        href="https://kafka.js.org/docs/producing#options"
        rel="nofollow"
        target="blank"
        >here</a
      >)</td>
  </tr>
  <tr>
    <td><code>send</code></td>
    <td>Send configuration options (read more
      <a
        href="https://kafka.js.org/docs/producing#options"
        rel="nofollow"
        target="blank"
        >here</a
      >)</td>
  </tr>
</table>

## 客户端

与其他微服务传输器相比，Kafka 有一个小小的区别。我们使用 `ClientKafka` 类代替 `ClientProxy` 类。

Like other microservice transporters, you have <a href="https://docs.nestjs.com/microservices/basics#client">several options</a> for creating a `ClientKafka` instance.

One method for creating an instance is to use the `ClientsModule`. To create a client instance with the `ClientsModule`, import it and use the `register()` method to pass an options object with the same properties shown above in the `createMicroservice()` method, as well as a `name` property to be used as the injection token. Read more about `ClientsModule` <a href="https://docs.nestjs.com/microservices/basics#client">here</a>.

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HERO_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'hero',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'hero-consumer'
          }
        }
      },
    ]),
  ]
  ...
})
```

Other options to create a client (either `ClientProxyFactory` or `@Client()`) can be used as well. You can read about them <a href="https://docs.nestjs.com/microservices/basics#client">here</a>.

Use the `@Client()` decorator as follows:

```typescript
@Client({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'hero',
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'hero-consumer'
    }
  }
})
client: ClientKafka;
```

## 消息模式

Kafka 微服务消息模式为请求和应答通道利用了两个主题。
The `ClientKafka#send()` method sends messages with a [return address](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ReturnAddress.html) by associating a [correlation id](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html), reply topic, and reply partition with the request message. This requires the `ClientKafka` instance to be subscribed to the reply topic and assigned to at least one partition before sending a message.

随后，您需要为每个正在运行的 Nest 应用程序至少设置一个回复主题分区。
例如，如果你正在运行 4 个 Nest 应用程序，但是回复主题只有 3 个分区，那么当试图发送消息时，其中一个 Nest 应用程序将出错。

When new `ClientKafka` instances are launched they join the consumer group and subscribe to their respective topics. This process triggers a rebalance of topic partitions assigned to consumers of the consumer group.

Normally, topic partitions are assigned using the round robin partitioner, which assigns topic partitions to a collection of consumers sorted by consumer names which are randomly set on application launch. However, when a new consumer joins the consumer group, the new consumer can be positioned anywhere within the collection of consumers. This creates a condition where pre-existing consumers can be assigned different partitions when the pre-existing consumer is positioned after the new consumer. As a result, the consumers that are assigned different partitions will lose response messages of requests sent before the rebalance.

To prevent the `ClientKafka` consumers from losing response messages, a Nest-specific built-in custom partitioner is utilized. This custom partitioner assigns partitions to a collection of consumers sorted by high-resolution timestamps (`process.hrtime()`) that are set on application launch.

## 消息响应订阅

> warning **Note** This section is only relevant if you use [request-response](/microservices/basics#request-response) message style (with the `@MessagePatern` decorator and the `ClientKafka#send` method). Subscribing to the response topic is not necessary for the [event-based](/microservices/basics#event-based) communication (`@EventPattern` decorator and `ClientKafka#emit` method).

The `ClientKafka` class provides the `subscribeToResponseOf()` method. The `subscribeToResponseOf()` method takes a request's topic name as an argument and adds the derived reply topic name to a collection of reply topics. This method is required when implementing the message pattern.

```typescript
@@filename(heroes.controller)
onModuleInit() {
  this.client.subscribeToResponseOf('hero.kill.dragon');
}
```

If the `ClientKafka` instance is created asynchronously, the `subscribeToResponseOf()` method must be called before calling the `connect()` method.

```typescript
@@filename(heroes.controller)
async onModuleInit() {
  this.client.subscribeToResponseOf('hero.kill.dragon');
  await this.client.connect();
}
```

## 传入的

Nest 接收传入的 Kafka 消息作为一个具有“key”、“value”和“headers”属性的对象，这些属性的值类型为“Buffer”。
然后 Nest 通过将缓冲区转换为字符串来解析这些值。
如果字符串是"object like"， Nest 将尝试将该字符串解析为" JSON "。然后将 `value` 传递给其关联的处理程序。

## 即将离任的

当发布事件或发送消息时，Nest 在序列化过程之后发送出站 Kafka 消息。
这种情况发生在传递给 `ClientKafka` `emit()` 和 `send()` 方法的参数上，或者发生在从 `@ messageppattern` 方法返回的值上。
这种序列化通过使用 `JSON.stringify()` 或 `toString()` 原型方法来“字符串化”非字符串或缓冲区的对象。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @MessagePattern('hero.kill.dragon')
  killDragon(@Payload() message: KillDragonMessage): any {
    const dragonId = message.dragonId;
    const items = [
      { id: 1, name: 'Mythical Sword' },
      { id: 2, name: 'Key to Dungeon' },
    ];
    return items;
  }
}
```

!!! info "**Hint**"

    `@Payload()` is imported from the `@nestjs/microservices`.

Outgoing messages can also be keyed by passing an object with the `key` and `value` properties. Keying messages is important for meeting the [co-partitioning requirement](https://docs.confluent.io/current/ksql/docs/developer-guide/partition-data.html#co-partitioning-requirements).

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @MessagePattern('hero.kill.dragon')
  killDragon(@Payload() message: KillDragonMessage): any {
    const realm = 'Nest';
    const heroId = message.heroId;
    const dragonId = message.dragonId;

    const items = [
      { id: 1, name: 'Mythical Sword' },
      { id: 2, name: 'Key to Dungeon' },
    ];

    return {
      headers: {
        realm
      },
      key: heroId,
      value: items
    }
  }
}
```

Additionally, messages passed in this format can also contain custom headers set in the `headers` hash property. Header hash property values must be either of type `string` or type `Buffer`.

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @MessagePattern('hero.kill.dragon')
  killDragon(@Payload() message: KillDragonMessage): any {
    const realm = 'Nest';
    const heroId = message.heroId;
    const dragonId = message.dragonId;

    const items = [
      { id: 1, name: 'Mythical Sword' },
      { id: 2, name: 'Key to Dungeon' },
    ];

    return {
      headers: {
        kafka_nestRealm: realm
      },
      key: heroId,
      value: items
    }
  }
}
```

## 基于事件的

虽然请求-响应方法非常适合于在服务之间交换消息，但是当您的消息样式是基于事件的(这对于 Kafka 来说是非常理想的)—当您只想发布事件 **而不需要等待响应** 时，它就不太适合了。在这种情况下，您不希望维护两个主题所需的请求-响应开销。

Check out these two sections to learn more about this: [Overview: Event-based](/microservices/basics#event-based) and [Overview: Publishing events](/microservices/basics#publishing-events).

## 上下文

在更复杂的场景中，您可能希望访问关于传入请求的更多信息。当使用 Kafka 传输器时，你可以访问 `KafkaContext` 对象。

```typescript
@@filename()
@MessagePattern('hero.kill.dragon')
killDragon(@Payload() message: KillDragonMessage, @Ctx() context: KafkaContext) {
  console.log(`Topic: ${context.getTopic()}`);
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('hero.kill.dragon')
killDragon(message, context) {
  console.log(`Topic: ${context.getTopic()}`);
}
```

!!! info "**Hint**"

    `@Payload()`, `@Ctx()` and `KafkaContext` are imported from the `@nestjs/microservices` package.

To access the original Kafka `IncomingMessage` object, use the `getMessage()` method of the `KafkaContext` object, as follows:

```typescript
@@filename()
@MessagePattern('hero.kill.dragon')
killDragon(@Payload() message: KillDragonMessage, @Ctx() context: KafkaContext) {
  const originalMessage = context.getMessage();
  const { headers, partition, timestamp } = originalMessage;
}
@@switch
@Bind(Payload(), Ctx())
@MessagePattern('hero.kill.dragon')
killDragon(message, context) {
  const originalMessage = context.getMessage();
  const { headers, partition, timestamp } = originalMessage;
}
```

Where the `IncomingMessage` fulfills the following interface:

```typescript
interface IncomingMessage {
  topic: string;
  partition: number;
  timestamp: string;
  size: number;
  attributes: number;
  offset: string;
  key: any;
  value: any;
  headers: Record<string, any>;
}
```

## 命名约定

Kafka 微服务组件在 `client.clientId` 和 `consumer.groupId` 选项上附加了各自角色的描述，以防止 Nest 微服务客户端和服务器组件之间的冲突。
By default the `ClientKafka` components append `-client` and the `ServerKafka` components append `-server` to both of these options. Note how the provided values below are transformed in that way (as shown in the comments).

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'hero', // hero-server
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'hero-consumer' // hero-consumer-server
    },
  }
});
```

And for the client:

```typescript
@@filename(heroes.controller)
@Client({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: 'hero', // hero-client
      brokers: ['localhost:9092'],
    },
    consumer: {
      groupId: 'hero-consumer' // hero-consumer-client
    }
  }
})
client: ClientKafka;
```

!!! info "**Hint**"

    Kafka client and consumer naming conventions can be customized by extending `ClientKafka` and `KafkaServer` in your own custom provider and overriding the constructor.

Since the Kafka microservice message pattern utilizes two topics for the request and reply channels, a reply pattern should be derived from the request topic. By default, the name of the reply topic is the composite of the request topic name with `.reply` appended.

```typescript
@@filename(heroes.controller)
onModuleInit() {
  this.client.subscribeToResponseOf('hero.get'); // hero.get.reply
}
```

!!! info "**Hint**"

    Kafka reply topic naming conventions can be customized by extending `ClientKafka` in your own custom provider and overriding the `getResponsePatternName` method.
