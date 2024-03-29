# 适配器

WebSockets 模块是平台无关的，因此，你可以通过使用`WebSocketAdapter`接口带来自己的库(甚至是本地实现)。
该接口强制实现以下表中描述的几种方法:

<table>
  <tr>
    <td><code>create</code></td>
    <td>基于传递的参数创建套接字实例</td>
  </tr>
  <tr>
    <td><code>bindClientConnect</code></td>
    <td>绑定客户端连接事件</td>
  </tr>
  <tr>
    <td><code>bindClientDisconnect</code></td>
    <td>绑定客户端断开事件(可选*)</td>
  </tr>
  <tr>
    <td><code>bindMessageHandlers</code></td>
    <td>将传入消息绑定到相应的消息处理程序</td>
  </tr>
  <tr>
    <td><code>close</code></td>
    <td>终止服务器实例</td>
  </tr>
</table>

## 扩展 socket.io

[socket.io](https://github.com/socketio/socket.io)包被包装在一个 `IoAdapter` 类中。
如果您想增强适配器的基本功能，该怎么办呢?
例如，您的技术需求要求能够跨 web 服务的多个负载平衡实例广播事件。
为此，你可以扩展`IoAdapter`并覆盖单个方法，该方法负责实例化新的`socket.io`服务器。
但首先，让我们安装所需的包。

```bash
$ npm i --save socket.io-redis
```

一旦安装了包，我们就可以创建一个 `RedisIoAdapter` 类。

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RedisClient } from 'redis';
import { ServerOptions } from 'socket.io';
import { createAdapter } from 'socket.io-redis';

const pubClient = new RedisClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();
const redisAdapter = createAdapter({ pubClient, subClient });

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(redisAdapter);
    return server;
  }
}
```

之后，只需切换到新创建的 Redis 适配器。

```typescript
const app = await NestFactory.create(AppModule);
app.useWebSocketAdapter(new RedisIoAdapter(app));
```

## Ws 库

另一个可用的适配器是“WsAdapter”，它充当框架之间的代理，集成了快速且经过彻底测试的[ws](https://github.com/websockets/ws)库。
这个适配器与本地浏览器 WebSockets 完全兼容，而且比 socket.io 包快得多。
不幸的是，它的可用功能少得多。
在某些情况下，您可能并不需要它们。

!!! info "**Hint**"

    `ws`库不支持名称空间(由`socket.io`普及的通信通道)。
    然而，为了以某种方式模拟这个特性，您可以在不同的路径上挂载多个`ws`服务器 (例如: `@WebSocketGateway({ path: '/users' })`).

为了使用`ws`，我们首先需要安装所需的包:

```bash
$ npm i --save @nestjs/platform-ws
```

安装包后，我们可以切换适配器:

```typescript
const app = await NestFactory.create(AppModule);
app.useWebSocketAdapter(new WsAdapter(app));
```

!!! info "`WsAdapter`是从`@nestjs/platform-ws`导入的。"

## 高级(自定义适配器)

出于演示目的，我们将手动集成[ws](https://github.com/websockets/ws)库。
正如前面提到的，这个库的适配器已经创建，并作为一个`WsAdapter`类从`@nestjs/platform-ws`包中公开。
下面是简化后的实现可能看起来的样子:

```ts title="ws-adapter"
import * as WebSocket from 'ws';
import { WebSocketAdapter, INestApplicationContext } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';

export class WsAdapter implements WebSocketAdapter {
  constructor(private app: INestApplicationContext) {}

  create(port: number, options: any = {}): any {
    return new WebSocket.Server({ port, ...options });
  }

  bindClientConnect(server, callback: Function) {
    server.on('connection', callback);
  }

  bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ) {
    fromEvent(client, 'message')
      .pipe(
        mergeMap((data) => this.bindMessageHandler(data, handlers, process)),
        filter((result) => result),
      )
      .subscribe((response) => client.send(JSON.stringify(response)));
  }

  bindMessageHandler(
    buffer,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): Observable<any> {
    const message = JSON.parse(buffer.data);
    const messageHandler = handlers.find(
      (handler) => handler.message === message.event,
    );
    if (!messageHandler) {
      return EMPTY;
    }
    return process(messageHandler.callback(message.data));
  }

  close(server) {
    server.close();
  }
}
```

!!! info "当你想利用[ws][ws]库时，使用内置的`WsAdapter`而不是自己创建一个。"

[ws]: https://github.com/websockets/ws

然后，我们可以使用`useWebSocketAdapter()`方法设置自定义适配器:

```ts title="main.ts"
const app = await NestFactory.create(AppModule);
app.useWebSocketAdapter(new WsAdapter(app));
```

## 示例

这里有一个使用 `WsAdapter` 的工作示例[此处](https://github.com/nestjs/nest/tree/master/sample/16-gateways-ws).
