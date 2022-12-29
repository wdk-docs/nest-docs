# 定制传输器

Nest 提供了多种 `开箱即用` 的传输器，以及允许开发者构建新的自定义传输策略的 API。
传输器使您能够使用一个可插入的通信层和一个非常简单的应用程序级消息协议在网络上连接组件(阅读全文[文章](https://dev.to/nestjs/integrate-nestjs-with-external-services-using-microservice-transporters-part-1-p3))。

!!! info "**Hint**"

    用 Nest 构建一个微服务并不一定意味着你必须使用 `@nestjs/microservices` 包。

> 例如，如果你想与外部服务通信(比如其他用不同语言编写的微服务)，你可能不需要`@nestjs/microservice`库提供的所有功能。
> 事实上，如果你不需要那些让你声明式定义订阅者的装饰器(`@EventPattern` 或 `@MessagePattern`)，运行一个[独立的应用程序](/application-context)和手动维护连接/订阅通道对于大多数用例来说应该已经足够了，并且会为你提供更多的灵活性。

通过自定义传输器，您可以集成任何消息传递系统/协议(包括谷歌云 Pub/Sub、Amazon Kinesis 等)，或者扩展现有的消息传递系统/协议，在其上添加额外的功能(例如，MQTT 的[QoS](https://github.com/mqttjs/MQTT.js/blob/master/README.md#qos))。

!!! info "**Hint**"

    为了更好地理解 Nest 微服务是如何工作的，以及如何扩展现有传输器的功能，我们建议阅读[NestJS 微服务在行动](https://dev.to/johnbiundo/series/4724)和[高级 NestJS 微服务](https://dev.to/nestjs/part-1-introduction-and-setup-1a2l)系列文章。

## 创建一个策略

首先，让我们定义一个表示自定义传输器的类。

```typescript
import { CustomTransportStrategy, Server } from '@nestjs/microservices';

class GoogleCloudPubSubServer
  extends Server
  implements CustomTransportStrategy
{
  /**
   * This method is triggered when you run "app.listen()".
   */
  listen(callback: () => void) {
    callback();
  }

  /**
   * This method is triggered on application shutdown.
   */
  close() {}
}
```

> warning **Warning** 请注意，我们不会在本章中实现一个功能齐全的谷歌云发布/订阅服务器，因为这需要深入研究传输器特定的技术细节。

在上面的例子中，我们声明了 `GoogleCloudPubSubServer` 类，并提供了由 `CustomTransportStrategy` 接口强制执行的 `listen()` 和 `close()` 方法。
此外，我们的类扩展了从 `@nestjs/microservices` 包导入的 `Server` 类，它提供了一些有用的方法，例如，Nest 运行时用来注册消息处理程序的方法。
或者，如果您想扩展现有传输策略的功能，您可以扩展相应的服务器类，例如， `ServerRedis` 。
按照惯例，我们为我们的类添加了 `"Server"` 后缀，因为它将负责订阅消息/事件(并在必要时响应它们)。

有了这些，我们现在可以使用我们的自定义策略，而不是使用内置传输器，如下所示:

```typescript
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    strategy: new GoogleCloudPubSubServer(),
  },
);
```

基本上，我们传递的不是带有 `transport` 和 `options` 属性的普通传输器选项对象，而是单个属性 `strategy` ，其值是自定义传输器类的一个实例。

回到我们的 `GoogleCloudPubSubServer` 类，在真实的应用程序中，我们将建立到我们的消息代理/外部服务的连接，并在 `listen()` 方法中注册订阅方/监听特定的通道(然后在 `close()` 方法中删除订阅并关闭连接)，
但由于这需要很好地理解 Nest 微服务之间是如何通信的，所以我们推荐您阅读以下[文章系列](https://dev.to/nestjs/part-1-introduction-and-setup-1a2l).
相反，在本章中，我们将关注 `Server` 类提供的功能，以及如何利用它们来构建自定义策略。

例如，假设在应用程序的某个地方定义了以下消息处理程序:

```typescript
@MessagePattern('echo')
echo(@Payload() data: object) {
  return data;
}
```

这个消息处理程序将由 Nest 运行时自动注册。
使用 `Server` 类，您可以看到已注册的消息模式，还可以访问并执行分配给它们的实际方法。
为了验证这一点，让我们在调用 `callback` 函数之前在 `listen()` 方法中添加一个简单的 `console.log` :

```typescript
listen(callback: () => void) {
  console.log(this.messageHandlers);
  callback();
}
```

应用程序重新启动后，您将在终端看到以下日志:

```typescript
Map { 'echo' => [AsyncFunction] { isEventHandler: false } }
```

!!! info "**Hint**"

    如果我们使用 `@EventPattern` 装饰器，您将看到相同的输出，但 `isEventHandler` 属性设置为 `true` 。

如您所见， `messageHandlers` 属性是所有消息(和事件)处理程序的 `Map` 集合，其中的模式被用作键。
现在，你可以使用一个键(例如， `"echo"` )来接收对消息处理程序的引用:

```typescript
async listen(callback: () => void) {
  const echoHandler = this.messageHandlers.get('echo');
  console.log(await echoHandler('Hello world!'));
  callback();
}
```

一旦我们执行 `echoHandler` ，传递一个任意字符串作为参数(`"Hello world!"`)，我们应该在控制台中看到它:

```json
Hello world!
```

这意味着我们的方法处理程序被正确执行。

## 客户端代理

正如我们在第一节中提到的，你不一定需要使用 `@nestjs/microservices` 包来创建微服务，但是如果你决定这样做，并且你需要集成一个自定义策略，你也需要提供一个 `客户端` 类。

!!! info "**Hint**"

    同样，实现一个与所有 `@nestjs/microservices` 特性兼容的全功能客户端类(例如，流媒体)需要很好地理解框架使用的通信技术。

> 要了解更多信息，请查看这篇[文章](https://dev.to/nestjs/part-4-basic-client-component-16f9).

要与外部服务通信/发出和发布消息(或事件)，你可以使用库特定的 SDK 包，或实现一个扩展 `ClientProxy` 的自定义客户端类，如下所示:

```typescript
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';

class GoogleCloudPubSubClient extends ClientProxy {
  async connect(): Promise<any> {}
  async close() {}
  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {}
  publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): Function {}
}
```

> warning **Warning** 请注意，我们不会在本章中实现一个功能齐全的谷歌云发布/订阅客户端，因为这需要深入研究传输器特定的技术细节。

如你所见， `ClientProxy` 类需要我们提供几个方法来建立和关闭连接，发布消息( `publish` )和事件( `dispatchEvent` )。
注意，如果不需要请求-响应通信样式支持，可以将 `publish()` 方法保留为空。
同样，如果不需要支持基于事件的通信，请跳过 `dispatchEvent()` 方法。

为了观察这些方法的执行内容和时间，让我们添加多个 `console.log` 调用，如下所示:

```typescript
class GoogleCloudPubSubClient extends ClientProxy {
  async connect(): Promise<any> {
    console.log('connect');
  }

  async close() {
    console.log('close');
  }

  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    return console.log('event to dispatch: ', packet);
  }

  publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): Function {
    console.log('message:', packet);

    // In a real-world application, the "callback" function should be executed
    // with payload sent back from the responder. Here, we'll simply simulate (5 seconds delay)
    // that response came through by passing the same "data" as we've originally passed in.
    setTimeout(() => callback({ response: packet.data }), 5000);

    return () => console.log('teardown');
  }
}
```

有了这些，让我们创建一个 `GoogleCloudPubSubClient` 类的实例，并运行 `send()` 方法(你可能在前面的章节中见过)，订阅返回的可观察流。

```typescript
const googlePubSubClient = new GoogleCloudPubSubClient();
googlePubSubClient
  .send('pattern', 'Hello world!')
  .subscribe((response) => console.log(response));
```

现在，您应该在终端中看到以下输出:

```typescript
connect
message: { pattern: 'pattern', data: 'Hello world!' }
Hello world! // <-- after 5 seconds
```

为了测试我们的"teardown"方法( `publish()` 方法返回的方法)是否被正确执行，让我们对流应用一个超时操作符，将其设置为 2 秒，以确保它在 `setTimeout` 调用 `callback` 函数之前抛出。

```typescript
const googlePubSubClient = new GoogleCloudPubSubClient();
googlePubSubClient
  .send('pattern', 'Hello world!')
  .pipe(timeout(2000))
  .subscribe(
    (response) => console.log(response),
    (error) => console.error(error.message),
  );
```

!!! info "**Hint**"

    `timeout` 操作符从 `rxjs/operators` 包中导入。

应用 `timeout` 操作符后，终端输出应该如下所示:

```typescript
connect
message: { pattern: 'pattern', data: 'Hello world!' }
teardown // <-- teardown
Timeout has occurred
```

要分派事件(而不是发送消息)，使用 `emit()` 方法:

```typescript
googlePubSubClient.emit('event', 'Hello world!');
```

这就是你应该在控制台看到的:

```typescript
connect
event to dispatch:  { pattern: 'event', data: 'Hello world!' }
```

## 消息序列化

如果您需要在客户端添加一些关于响应序列化的自定义逻辑，您可以使用扩展 `ClientProxy` 类或它的一个子类的自定义类。
为了修改成功的请求，你可以覆盖 `serializeResponse` 方法，而为了修改通过这个客户端的任何错误，你可以覆盖 `serializeError` 方法。
要使用这个自定义类，可以使用 `customClass` 属性将类本身传递给 `ClientsModule.register()` 方法。
下面是一个自定义 `ClientProxy` 的例子，它将每个错误序列化为一个 `RpcException` 。

```typescript
@@filename(error-handling.proxy)
import { ClientTcp, RpcException } from '@nestjs/microservices';

class ErrorHandlingProxy extends ClientTCP {
  serializeError(err: Error) {
    return new RpcException(err);
  }
}
```

然后在 `ClientsModule` 中像这样使用它:

```typescript
@@filename(app.module)
@Module({
  imports: [
    ClientsModule.register({
      name: 'CustomProxy',
      customClass: ErrorHandlingProxy,
    }),
  ]
})
export class AppModule
```

!!! info "**Hint**"

    这是传递给 `customClass` 的类本身，而不是类的实例。

> Nest 将在底层为你创建实例，并将给 `options` 属性的任何选项传递给新的 `ClientProxy` 。
