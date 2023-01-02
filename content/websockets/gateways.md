# 网关

本文档中讨论的大多数概念，如依赖注入、装饰器、异常过滤器、管道、守卫和拦截器，都同样适用于网关。
只要有可能，Nest 会抽象实现细节，这样相同的组件就可以在基于 http 的平台、WebSockets 和 Microservices 上运行。
本节将介绍 Nest 特有的 WebSockets 方面。

在 Nest 中，网关只是一个带有`@WebSocketGateway()`装饰器注释的类。
从技术上讲，网关是平台无关的，这使得一旦创建了适配器，网关就与任何 WebSockets 库兼容。
有两个现成的 WS 平台受支持:[socket.io](https://github.com/socketio/socket.io)和[ws](https://github.com/websockets/ws)。
您可以选择最适合您需要的。
同样，您可以通过以下[指南](/websockets/adapter)构建自己的适配器.

<figure><img src="/assets/Gateways_1.png" /></figure>

!!! info "**Hint**"

    网关可以被视为[providers](/providers);
    这意味着它们可以通过类构造函数注入依赖项。
    另外，网关也可以被其他类(提供程序和控制器)注入。

## 安装

要开始构建基于 websocket 的应用程序，首先要安装所需的包:

```bash
$ npm i --save @nestjs/websockets @nestjs/platform-socket.io
```

## 概述

通常情况下，每个网关都在同一个端口上监听 **HTTP 服务器** ，除非你的应用不是 web 应用，或者你已经手动更改了端口。
这个默认行为可以通过传递一个参数给`@WebSocketGateway(80)`装饰器来修改，其中`80`是选定的端口号。
您还可以使用以下结构设置网关使用的[namespace](https://socket.io/docs/rooms-and-namespaces/):

```typescript
@WebSocketGateway(80, { namespace: 'events' })
```

!!! warning

    网关只有在现有模块的提供器数组中引用它们时才被实例化。

您可以将任何受支持的[选项](https://socket.io/docs/v4/server-options/)传递给套接字构造函数，并将第二个参数传递给`@WebSocketGateway()`装饰器，如下所示:

```typescript
@WebSocketGateway(81, { transports: ['websocket'] })
```

网关现在正在收听，但是我们还没有订阅任何传入的消息。
让我们创建一个处理程序，它将订阅`events`消息并以完全相同的数据响应用户。

=== "events.gateway.ts"

    ```ts
    @SubscribeMessage('events')
    handleEvent(@MessageBody() data: string): string {
      return data;
    }
    ```

=== "events.gateway.js"

    ```js
    @Bind(MessageBody())
    @SubscribeMessage('events')
    handleEvent(data) {
      return data;
    }
    ```

!!! info "`@SubscribeMessage()`和`@MessageBody()`装饰器是从`@nestjs/websockets`包中导入的."

一旦创建了网关，我们就可以在我们的模块中注册它。

```ts title="events.module.ts"
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway],
})
export class EventsModule {}
```

您还可以将一个属性键传递给装饰器，以便从传入的消息体中提取它

=== "events.gateway.ts"

    ```ts
    @SubscribeMessage('events')
    handleEvent(@MessageBody('id') id: number): number {
      // id === messageBody.id
      return id;
    }
    ```

=== "events.gateway.js"

    ```js
    @Bind(MessageBody('id'))
    @SubscribeMessage('events')
    handleEvent(id) {
      // id === messageBody.id
      return id;
    }
    ```

如果不喜欢使用装饰器，下面的代码在功能上是等价的:

=== "events.gateway.ts"

    ```ts
    @SubscribeMessage('events')
    handleEvent(client: Socket, data: string): string {
      return data;
    }
    ```

=== "events.gateway.js"

    ```js
    @SubscribeMessage('events')
    handleEvent(client, data) {
      return data;
    }
    ```

在上面的例子中，`handleEvent()`函数接受两个参数。
第一个是平台特定的[套接字实例](https://socket.io/docs/server-api/#socket)，而第二个是从客户端接收的数据。
但是不推荐这种方法，因为它需要在每个单元测试中模拟`socket`实例。

一旦接收到 `events` 消息，处理程序将使用通过网络发送的相同数据发送一个确认。
此外，还可以使用特定于库的方法发出消息，例如使用`client.emit()`方法。
为了访问已连接的套接字实例，请使用`@ConnectedSocket()`装饰器。

=== "events.gateway.ts"

    ```ts
    @SubscribeMessage('events')
    handleEvent(
      @MessageBody() data: string,
      @ConnectedSocket() client: Socket,
    ): string {
      return data;
    }
    ```

=== "events.gateway.js"

    ```js
    @Bind(MessageBody(), ConnectedSocket())
    @SubscribeMessage('events')
    handleEvent(data, client) {
      return data;
    }
    ```

!!! info "`@ConnectedSocket()`装饰器是从`@nestjs/websockets`包导入的。"

然而，在这种情况下，您将无法利用拦截器。
如果你不想响应用户，你可以简单地跳过`return`语句(或者显式地返回`falsy`值，例如`undefined`)。

现在，当客户机发出如下消息时:

```typescript
socket.emit('events', { name: 'Nest' });
```

`handleEvent()`方法将被执行。
为了监听从上面的处理程序中发出的消息，客户端必须附加一个相应的确认监听器:

```typescript
socket.emit('events', { name: 'Nest' }, (data) => console.log(data));
```

## 多个响应

确认只被发送一次。
此外，原生 WebSockets 实现也不支持它。
为了解决这个限制，你可以返回一个包含两个属性的对象。
`event`是发出事件的名称，以及必须转发给客户端的`data`。

=== "events.gateway.ts"

    ```ts
    @SubscribeMessage('events')
    handleEvent(@MessageBody() data: unknown): WsResponse<unknown> {
      const event = 'events';
      return { event, data };
    }
    ```

=== "events.gateway.js"

    ```js
    @Bind(MessageBody())
    @SubscribeMessage('events')
    handleEvent(data) {
      const event = 'events';
      return { event, data };
    }
    ```

!!! info "`WsResponse`接口是从`@nestjs/websockets`包导入的。"

!!! warning

    如果你的`data`字段依赖于`ClassSerializerInterceptor`，你应该返回一个实现`WsResponse`的类实例，因为它忽略了普通的 JavaScript 对象响应。

为了监听传入的响应，客户机必须应用另一个事件侦听器。

```typescript
socket.on('events', (data) => console.log(data));
```

## 异步响应

消息处理程序能够同步响应或 **异步响应** 。
因此，支持`async`方法。
消息处理程序还可以返回一个`Observable`，在这种情况下，结果值将一直发出，直到流完成。

=== "events.gateway.ts"

    ```ts
    @SubscribeMessage('events')
    onEvent(@MessageBody() data: unknown): Observable<WsResponse<number>> {
      const event = 'events';
      const response = [1, 2, 3];

      return from(response).pipe(
        map(data => ({ event, data })),
      );
    }
    ```

=== "events.gateway.js"

    ```js
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

在上面的例子中，消息处理程序将响应 **3 次** (对于数组中的每个项)。

## 生命周期的钩子

有 3 个有用的生命周期钩子可用。它们都有相应的接口，下表对此进行了描述:

<table>
  <tr>
    <td>
      <code>OnGatewayInit</code>
    </td>
    <td>
      强制实现<code>afterInit()</code>方法。 
      将特定于库的服务器实例作为参数(并在需要时传播其他参数)。
    </td>
  </tr>
  <tr>
    <td>
      <code>OnGatewayConnection</code>
    </td>
    <td>
      强制实现<code>handleConnection()</code>方法. 
      将特定于库的客户机套接字实例作为参数。
    </td>
  </tr>
  <tr>
    <td>
      <code>OnGatewayDisconnect</code>
    </td>
    <td>
      强制实现<code>handleDisconnect()</code>方法. 
      将特定于库的客户机套接字实例作为参数。
    </td>
  </tr>
</table>

!!! info "每个生命周期接口都是从`@nestjs/websockets`包中公开的。"

## 服务器

有时候，你可能想直接接触本地， **特定于平台** 的服务器实例.
对该对象的引用作为参数传递给`afterInit()`方法(`OnGatewayInit`接口)。
另一个选项是使用`@WebSocketServer()`装饰器。

```typescript
@WebSocketServer()
server: Server;
```

!!! warning

    `@WebSocketServer()`装饰器是从`@nestjs/websockets`包中导入的。

一旦服务器实例准备好使用，Nest 将自动将其分配给该属性。

## 例子

一个可用的示例[在这里](https://github.com/nestjs/nest/tree/master/sample/02-gateways).
