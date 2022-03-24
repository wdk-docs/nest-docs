### 定制传输器

Nest 提供了多种“开箱即用”的传输器，以及允许开发者构建新的自定义传输策略的 API。
传输器使您能够使用一个可插入的通信层和一个非常简单的应用程序级消息协议在网络上连接组件(阅读全文[article](https://dev.to/nestjs/integrate-nestjs-with-external-services-using-microservice-transporters-part-1-p3))。

> info **Hint** 用 Nest 构建一个微服务并不一定意味着你必须使用' @nestjs/microservices '包。
> 例如，如果你想与外部服务通信(比如其他用不同语言编写的微服务)，你可能不需要' @nestjs/microservice '库提供的所有功能。
> 事实上，如果你不需要那些让你声明式定义订阅者的装饰器(`@EventPattern` or `@MessagePattern`)，运行一个[独立的应用程序](/application-context)和手动维护连接/订阅通道对于大多数用例来说应该已经足够了，并且会为你提供更多的灵活性。

通过自定义传输器，您可以集成任何消息传递系统/协议(包括谷歌 Cloud Pub/Sub、Amazon Kinesis 等)，或者扩展现有的消息传递系统/协议，在其上添加额外的功能(例如，MQTT 的[QoS](https://github.com/mqttjs/MQTT.js/blob/master/README.md#qos))。

> info **Hint** 为了更好地理解 Nest 微服务是如何工作的，以及如何扩展现有传输器的功能，我们建议阅读[NestJS 微服务在行动](https://dev.to/johnbiundo/series/4724)和[高级 NestJS 微服务](https://dev.to/nestjs/part-1-introduction-and-setup-1a2l)系列文章。

#### 创建一个策略

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

> warning **Warning** Please, note we won't be implementing a fully-featured Google Cloud Pub/Sub server in this chapter as this would require diving into transporter specific technical details.

In our example above, we declared the `GoogleCloudPubSubServer` class and provided `listen()` and `close()` methods enforced by the `CustomTransportStrategy` interface.
Also, our class extends the `Server` class imported from the `@nestjs/microservices` package that provides a few useful methods, for example, methods used by Nest runtime to register message handlers.
Alternatively, in case you want to extend the capabilities of an existing transport strategy, you could extend the corresponding server class, for example, `ServerRedis`.
Conventionally, we added the `"Server"` suffix to our class as it will be responsible for subscribing to messages/events (and responding to them, if necessary).

With this in place, we can now use our custom strategy instead of using a built-in transporter, as follows:

```typescript
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    strategy: new GoogleCloudPubSubServer(),
  },
);
```

Basically, instead of passing the normal transporter options object with `transport` and `options` properties, we pass a single property, `strategy`, whose value is an instance of our custom transporter class.

Back to our `GoogleCloudPubSubServer` class, in a real-world application, we would be establishing a connection to our message broker/external service and registering subscribers/listening to specific channels in `listen()` method (and then removing subscriptions & closing the connection in the `close()` teardown method),
but since this requires a good understanding of how Nest microservices communicate with each other, we recommend reading this [article series](https://dev.to/nestjs/part-1-introduction-and-setup-1a2l).
In this chapter instead, we'll focus on the capabilities the `Server` class provides and how you can leverage them to build custom strategies.

For example, let's say that somewhere in our application, the following message handler is defined:

```typescript
@MessagePattern('echo')
echo(@Payload() data: object) {
  return data;
}
```

This message handler will be automatically registered by Nest runtime.
With `Server` class, you can see what message patterns have been registered and also, access and execute the actual methods that were assigned to them.
To test this out, let's add a simple `console.log` inside `listen()` method before `callback` function is called:

```typescript
listen(callback: () => void) {
  console.log(this.messageHandlers);
  callback();
}
```

After your application restarts, you'll see the following log in your terminal:

```typescript
Map { 'echo' => [AsyncFunction] { isEventHandler: false } }
```

> info **Hint** If we used the `@EventPattern` decorator, you would see the same output, but with the `isEventHandler` property set to `true`.

As you can see, the `messageHandlers` property is a `Map` collection of all message (and event) handlers, in which patterns are being used as keys.
Now, you can use a key (for example, `"echo"`) to receive a reference to the message handler:

```typescript
async listen(callback: () => void) {
  const echoHandler = this.messageHandlers.get('echo');
  console.log(await echoHandler('Hello world!'));
  callback();
}
```

Once we execute the `echoHandler` passing an arbitrary string as an argument (`"Hello world!"` here), we should see it in the console:

```json
Hello world!
```

Which means that our method handler was properly executed.

#### 客户端代理

正如我们在第一节中提到的，你不一定需要使用' @nestjs/microservices '包来创建微服务，但是如果你决定这样做，并且你需要集成一个自定义策略，你也需要提供一个“客户端”类。

> info **Hint** Again, implementing a fully-featured client class compatible with all `@nestjs/microservices` features (e.g., streaming) requires a good understading of communication techniques used by the framework.
> To learn more, check out this [article](https://dev.to/nestjs/part-4-basic-client-component-16f9).

To communicate with an external service/emit & publish messages (or events) you can either use a library-specific SDK package, or implement a custom client class that extends the `ClientProxy`, as follows:

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

> warning **Warning** Please, note we won't be implementing a fully-featured Google Cloud Pub/Sub client in this chapter as this would require diving into transporter specific technical details.

As you can see, `ClientProxy` class requires us to provide several methods for establishing & closing the connection and publishing messages (`publish`) and events (`dispatchEvent`).
Note, if you don't need a request-response communication style support, you can leave the `publish()` method empty.
Likewise, if you don't need to support event-based communication, skip the `dispatchEvent()` method.

To observe what and when those methods are executed, let's add multiple `console.log` calls, as follows:

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

With this in place, let's create an instance of `GoogleCloudPubSubClient` class and run the `send()` method (which you might have seen in earlier chapters), subscribing to the returned observable stream.

```typescript
const googlePubSubClient = new GoogleCloudPubSubClient();
googlePubSubClient
  .send('pattern', 'Hello world!')
  .subscribe((response) => console.log(response));
```

Now, you should see the following output in your terminal:

```typescript
connect
message: { pattern: 'pattern', data: 'Hello world!' }
Hello world! // <-- after 5 seconds
```

To test if our "teardown" method (which our `publish()` method returns) is properly executed, let's apply a timeout operator to our stream, setting it to 2 seconds to make sure it throws earlier then our `setTimeout` calls the `callback` function.

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

> info **Hint** The `timeout` operator is imported from the `rxjs/operators` package.

With `timeout` operator applied, your terminal output should look as follows:

```typescript
connect
message: { pattern: 'pattern', data: 'Hello world!' }
teardown // <-- teardown
Timeout has occurred
```

To dispatch an event (instead of sending a message), use the `emit()` method:

```typescript
googlePubSubClient.emit('event', 'Hello world!');
```

And that's what you should see in the console:

```typescript
connect
event to dispatch:  { pattern: 'event', data: 'Hello world!' }
```

#### 消息序列化

If you need to add some custom logic around the serialization of responses on the client side, you can use a custom class that extends the `ClientProxy` class or one of its child classes.
For modifying successful requests you can override the `serializeResponse` method, and for modifying any errors that go through this client you can override the `serializeError` method.
To make use of this custom class, you can pass the class itself to the `ClientsModule.register()` method using the `customClass` property.
Below is an example of a custom `ClientProxy` that serializes each error into an `RpcException`.

```typescript
@@filename(error-handling.proxy)
import { ClientTcp, RpcException } from '@nestjs/microservices';

class ErrorHandlingProxy extends ClientTCP {
  serializeError(err: Error) {
    return new RpcException(err);
  }
}
```

and then use it in the `ClientsModule` like so:

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

> info **hint** This is the class itself being passed to `customClass`, not an instance of the class.
> Nest will create the instance under the hood for you, and will pass any options given to the `options` property to the new `ClientProxy`.
