# MQTT

[MQTT](https://mqtt.org/)(消息队列遥测传输)是一个开源、轻量级的消息传递协议，为低延迟进行了优化。
该协议提供了一种使用 **发布/订阅** 模型连接设备的可扩展且经济有效的方式。
构建在 MQTT 上的通信系统由发布服务器、代理和一个或多个客户端组成。
它是为受限的设备和低带宽、高延迟或不可靠的网络而设计的。

## 安装

要开始构建基于 mqtt 的微服务，首先要安装所需的包:

```bash
$ npm i --save mqtt
```

## 概述

要使用 MQTT 传输器，请将以下选项对象传递给 `createMicroservice()` 方法:

=== "main"

```ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.MQTT,
    options: {
      url: 'mqtt://localhost:1883',
    },
  },
);
```

=== "JavaScript"

```js
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.MQTT,
  options: {
    url: 'mqtt://localhost:1883',
  },
});
```

!!! info "**Hint**"

    `Transport` enum 从`@nestjs/microservices`包导入。

## 选项

`options`对象特定于所选的传输器。
**MQTT** 传输器公开了[此处](https://github.com/mqttjs/MQTT.js/#mqttclientstreambuilder-options)描述的属性。

## 客户端

与其他微服务传输器一样，您有几个创建 MQTT`ClientProxy`实例的[选项](https://docs.nestjs.com/microservices/basics#client)。

创建实例的一种方法是使用`ClientsModule`。
要用`ClientsModule`创建一个客户端实例，请导入它，并使用`register()`方法传递一个选项对象，该对象的属性与上面的`createMicroservice()`方法中显示的相同，以及一个`name`属性作为注入令牌。
在[这里](https://docs.nestjs.com/microservices/basics#client)阅读更多关于`ClientsModule`的内容。

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.MQTT,
        options: {
          url: 'mqtt://localhost:1883',
        }
      },
    ]),
  ]
  ...
})
```

创建客户端的其他选项(`ClientProxyFactory`或`@Client()`)也可以使用。
你可以阅读[这里](https://docs.nestjs.com/microservices/basics#client)。

## 上下文

在更复杂的场景中，您可能希望访问关于传入请求的更多信息。
当使用 MQTT 传输器时，您可以访问`MqttContext`对象。

=== "TypeScript"

```ts
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: MqttContext) {
  console.log(`Topic: ${context.getTopic()}`);
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(`Topic: ${context.getTopic()}`);
}
```

!!! info "**Hint**"

    `@Payload()`, `@Ctx()` and `MqttContext` 从`@nestjs/microservices`包导入。

要访问原始的 mqtt [packet](https://github.com/mqttjs/mqtt-packet)，使用`MqttContext`对象的`getPacket()`方法，如下所示:

=== "TypeScript"

```ts
@MessagePattern('notifications')
getNotifications(@Payload() data: number[], @Ctx() context: MqttContext) {
  console.log(context.getPacket());
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('notifications')
getNotifications(data, context) {
  console.log(context.getPacket());
}
```

## 通配符

订阅可以是一个显式主题，也可以包含通配符。
有两个通配符可用，`+`和`#`。
`+`是单级通配符，而`#`是多级通配符，涵盖许多主题级别。

=== "TypeScript"

```ts
@MessagePattern('sensors/+/temperature/+')
getTemperature(@Ctx() context: MqttContext) {
  console.log(`Topic: ${context.getTopic()}`);
}
```

=== "JavaScript"

```js
@Bind(Ctx())
@MessagePattern('sensors/+/temperature/+')
getTemperature(context) {
  console.log(`Topic: ${context.getTopic()}`);
}
```

## 记录构建器

要配置消息选项(调整 QoS 级别、设置 Retain 或 DUP 标志，或向负载添加额外的属性)，您可以使用`MqttRecordBuilder`类。
例如，设置`QoS`为`2`使用`setQoS`方法，如下所示:

```typescript
const userProperties = { 'x-version': '1.0.0' };
const record = new MqttRecordBuilder(':cat:')
  .setProperties({ userProperties })
  .setQoS(1)
  .build();
client.send('replace-emoji', record).subscribe(...);
```

!!! info "**Hint**"

    `MqttRecordBuilder`类是从`@nestjs/microservices`包导出的。

通过访问 `MqttContext`，您也可以在服务器端读取这些选项。

=== "TypeScript"

```ts
@MessagePattern('replace-emoji')
replaceEmoji(@Payload() data: string, @Ctx() context: MqttContext): string {
  const { properties: { userProperties } } = context.getPacket();
  return userProperties['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```

=== "JavaScript"

```js
@Bind(Payload(), Ctx())
@MessagePattern('replace-emoji')
replaceEmoji(data, context) {
  const { properties: { userProperties } } = context.getPacket();
  return userProperties['x-version'] === '1.0.0' ? '🐱' : '🐈';
}
```

在某些情况下，你可能想要为多个请求配置用户属性，你可以将这些选项传递给`ClientProxyFactory`。

```typescript
import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  providers: [
    {
      provide: 'API_v1',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.MQTT,
          options: {
            url: 'mqtt://localhost:1833',
            userProperties: { 'x-version': '1.0.0' },
          },
        }),
    },
  ],
})
export class ApiModule {}
```
