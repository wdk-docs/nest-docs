### 网关

本文档中讨论的大多数概念，如依赖注入、装饰器、异常过滤器、管道、守卫和拦截器，都同样适用于网关。
只要有可能，Nest会抽象实现细节，这样相同的组件就可以在基于http的平台、WebSockets和Microservices上运行。
本节将介绍Nest特有的WebSockets方面。

在Nest中，网关只是一个带有`@WebSocketGateway()`装饰器注释的类。 
从技术上讲，网关是平台无关的，这使得一旦创建了适配器，网关就与任何WebSockets库兼容。
有两个现成的WS平台受支持:[socket.io](https://github.com/socketio/socket.io)和[ws](https://github.com/websockets/ws)。 
您可以选择最适合您需要的。 
同样，您可以通过以下[指南](/websockets/adapter)构建自己的适配器.

<figure><img src="/assets/Gateways_1.png" /></figure>

> info **Hint** 网关可以被视为[providers](/providers); 
> 这意味着它们可以通过类构造函数注入依赖项。
> 另外，网关也可以被其他类(提供程序和控制器)注入。

#### 安装

要开始构建基于websocket的应用程序，首先要安装所需的包:

```bash
@@filename()
$ npm i --save @nestjs/websockets @nestjs/platform-socket.io
@@switch
$ npm i --save @nestjs/websockets @nestjs/platform-socket.io
```

#### 概述

通常情况下，每个网关都在同一个端口上监听**HTTP服务器**，除非你的应用不是web应用，或者你已经手动更改了端口。 
这个默认行为可以通过传递一个参数给`@WebSocketGateway(80)`装饰器来修改，其中`80`是选定的端口号。 
您还可以使用以下结构设置网关使用的[namespace](https://socket.io/docs/rooms-and-namespaces/):

```typescript
@WebSocketGateway(80, { namespace: 'events' })
```

> warning **Warning** 网关只有在现有模块的提供者数组中引用它们时才被实例化。

您可以将任何受支持的[选项](https://socket.io/docs/v4/server-options/)传递给套接字构造函数，并将第二个参数传递给`@WebSocketGateway()`装饰器，如下所示:

```typescript
@WebSocketGateway(81, { transports: ['websocket'] })
```

网关现在正在收听，但是我们还没有订阅任何传入的消息。
让我们创建一个处理程序，它将订阅`events`消息并以完全相同的数据响应用户。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(@MessageBody() data: string): string {
  return data;
}
@@switch
@Bind(MessageBody())
@SubscribeMessage('events')
handleEvent(data) {
  return data;
}
```

> info **Hint** `@SubscribeMessage()`和`@MessageBody()`装饰器是从`@nestjs/websockets`包中导入的.

一旦创建了网关，我们就可以在我们的模块中注册它。

```typescript
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@@filename(events.module)
@Module({
  providers: [EventsGateway]
})
export class EventsModule {}
```

您还可以向decorator传递一个属性键，以从传入的消息体中提取它:

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(@MessageBody('id') id: number): number {
  // id === messageBody.id
  return id;
}
@@switch
@Bind(MessageBody('id'))
@SubscribeMessage('events')
handleEvent(id) {
  // id === messageBody.id
  return id;
}
```

如果不喜欢使用装饰器，下面的代码在功能上是等价的:

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(client: Socket, data: string): string {
  return data;
}
@@switch
@SubscribeMessage('events')
handleEvent(client, data) {
  return data;
}
```

在上面的例子中，`handleEvent()`函数接受两个参数。 
第一个是平台特定的[套接字实例](https://socket.io/docs/server-api/#socket)，而第二个是从客户端接收的数据。 
但是不推荐这种方法，因为它需要在每个单元测试中模拟`socket`实例。

一旦接收到`events` 消息，处理程序发送一个确认与通过网络发送的数据相同。 
此外，还可以使用特定于库的方法发出消息，例如，通过使用`client.emit()`方法。 
为了访问一个已连接的套接字实例，使用`@ConnectedSocket()`装饰器。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(
  @MessageBody() data: string,
  @ConnectedSocket() client: Socket,
): string {
  return data;
}
@@switch
@Bind(MessageBody(), ConnectedSocket())
@SubscribeMessage('events')
handleEvent(data, client) {
  return data;
}
```

> info **Hint** `@ConnectedSocket()` decorator is imported from `@nestjs/websockets` package.

然而，在这种情况下，您将无法利用拦截器。
如果你不想响应用户，你可以简单地跳过`return`语句(或者显式地返回"falsy"值，例如s`undefined`)。

现在，当客户机发出如下消息时:

```typescript
socket.emit('events', { name: 'Nest' });
```

`handleEvent()`方法将被执行。 
为了监听从上面的处理程序中发出的消息，客户端必须附加一个相应的确认监听器:

```typescript
socket.emit('events', { name: 'Nest' }, (data) => console.log(data));
```

#### 多个响应

确认只被发送一次。  
此外，原生WebSockets实现也不支持它。
为了解决这个限制，你可以返回一个包含两个属性的对象。 
`event`是发出事件的名称，以及必须转发给客户端的`data`。

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
handleEvent(@MessageBody() data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@Bind(MessageBody())
@SubscribeMessage('events')
handleEvent(data) {
  const event = 'events';
  return { event, data };
}
```

> info **Hint** The `WsResponse` interface is imported from `@nestjs/websockets` package.

> warning **Warning** You should return a class instance that implements `WsResponse` if your `data` field relies on `ClassSerializerInterceptor`, as it ignores plain JavaScript objects responses.

In order to listen for the incoming response(s), the client has to apply another event listener.

```typescript
socket.on('events', (data) => console.log(data));
```

#### 异步响应

Message handlers are able to respond either synchronously or **asynchronously**. Hence, `async` methods are supported. A message handler is also able to return an `Observable`, in which case the result values will be emitted until the stream is completed.

```typescript
@@filename(events.gateway)
@SubscribeMessage('events')
onEvent(@MessageBody() data: unknown): Observable<WsResponse<number>> {
  const event = 'events';
  const response = [1, 2, 3];

  return from(response).pipe(
    map(data => ({ event, data })),
  );
}
@@switch
@Bind(MessageBody())
@SubscribeMessage('events')
onEvent(data) {
  const event = 'events';
  const response = [1, 2, 3];

  return from(response).pipe(
    map(data => ({ event, data })),
  );
}
```

In the example above, the message handler will respond **3 times** (with each item from the array).

#### 生命周期的钩子

There are 3 useful lifecycle hooks available. All of them have corresponding interfaces and are described in the following table:

<table>
  <tr>
    <td>
      <code>OnGatewayInit</code>
    </td>
    <td>
      Forces to implement the <code>afterInit()</code> method. Takes library-specific server instance as an argument (and
      spreads the rest if required).
    </td>
  </tr>
  <tr>
    <td>
      <code>OnGatewayConnection</code>
    </td>
    <td>
      Forces to implement the <code>handleConnection()</code> method. Takes library-specific client socket instance as
      an argument.
    </td>
  </tr>
  <tr>
    <td>
      <code>OnGatewayDisconnect</code>
    </td>
    <td>
      Forces to implement the <code>handleDisconnect()</code> method. Takes library-specific client socket instance as
      an argument.
    </td>
  </tr>
</table>

> info **Hint** Each lifecycle interface is exposed from `@nestjs/websockets` package.

#### 服务器

Occasionally, you may want to have a direct access to the native, **platform-specific** server instance. The reference to this object is passed as an argument to the `afterInit()` method (`OnGatewayInit` interface). Another option is to use the `@WebSocketServer()` decorator.

```typescript
@WebSocketServer()
server: Server;
```

> warning **Notice** The `@WebSocketServer()` decorator is imported from the `@nestjs/websockets` package.

Nest will automatically assign the server instance to this property once it is ready to use.

<app-banner-enterprise></app-banner-enterprise>

#### 例子

A working example is available [here](https://github.com/nestjs/nest/tree/master/sample/02-gateways).
