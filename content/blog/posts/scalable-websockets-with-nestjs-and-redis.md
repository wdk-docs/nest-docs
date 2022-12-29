---
title: "使用 NestJS 和 Redis 扩展 WebSockets"
linkTitle: "ws 扩展"
date: "2020-02-13"
author: "Maciej Cieślar"
description: >
---

> <https://blog.logrocket.com/scalable-websockets-with-nestjs-and-redis/>

在处理一个相对年轻的应用程序时，为了更快地实现特性，人们往往忽略对可伸缩性的需求。
然而，我认为，即使在项目的最初阶段，确保代码尽可能具有可伸缩性也是至关重要的。

最近，当我在做一个项目的时候，我遇到了一个挑战，要把 WebSockets 添加到 NestJS 应用程序中。
虽然由于大量的文档，这是一个相对简单的任务，但它有一个很大的缺点: 它为以前的无状态应用程序引入了一个状态。

多亏了 Docker 和 Kubernetes 等工具，现在的后端应用程序很容易扩展。
创建多个应用程序实例的复杂性已经显著降低——也就是说，只要应用程序保持无状态。
由于没有状态，应用程序可以再次被关闭和打开，而不会出现意外的行为。
换句话说，这些应用程序很容易被丢弃。

WebSocket 协议的每个实现都必须以某种形式保持当前打开的连接。
这意味着，如果我们有应用程序的两个实例，由第二个实例分派的事件将永远不会到达连接到第一个实例的客户端。

也就是说，有一些方法可以在多个实例之间“共享”开放连接池。
一种方法是使用 Redis 的发布/订阅机制在应用程序的所有实例之间转发发出的事件，以确保每个打开的连接接收到它们。

下面的实现完全包含了 Nest 生态系统，包括以下情况:只向一个用户发送事件;向所有打开的连接发出事件;并向所有经过身份验证的用户发出事件。

> Note: 在 NestJS 文档中，有一个非常简单的方法，添加 Redis 来在实例之间转发事件，只需几行代码。
> 如果您正在寻找一个简单但有限的解决方案，请看看这里。
> 如果您想自己找出如何实现上述机制，请务必继续进行。

本文假设你对 Docker、TypeScript 和 RxJS 有基本的了解。

## 设置 Nest 应用程序

在本文中，我已经详细描述了将在这里使用的设置。
简而言之，我们使用 Nest CLI 为我们搭建应用程序，Docker 使用 Docker-compose 添加 Redis 和 Postgres 进行本地开发。

我建议您下载这个资源库并跟随本文，因为我将只解释相关的代码，而不介绍 Nest 样板文件(如模块)。

## 添加 Redis

Redis 是一个内存中的数据结构存储，可以用作数据库，缓存，或发布/订阅客户端。
请注意，这些只是 Redis 的几种可能性。
如果你有兴趣了解更多，就在这里。

通常情况下，你必须在你的电脑上安装 Redis，但由于应用程序被 Docker 容器化，我们不需要这样做。
Docker 为我们负责安装和启动 Redis。

为了从节点运行时与 Redis 通信，有一些库可用。
我们将使用 ioredis，因为它提供了大量的特性，同时保持了强大的性能。

我们必须创建一个 Nest 模块来封装与 Redis 相关的代码。
在 RedisModule 中，我们有 providers 数组，我们在其中创建 ioredis 客户端来与 Redis 通信。
我们还实现了 RedisService，它抽象了监听和发送 Redis 消息。

正如前面提到的，我们创建了两个具有不同目的的 Redis 客户端:一个用于订阅，一个用于发布消息。

```ts
//redis.providers.ts

import { Provider } from "@nestjs/common";
import Redis from "ioredis";

import {
  REDIS_PUBLISHER_CLIENT,
  REDIS_SUBSCRIBER_CLIENT,
} from "./redis.constants";

export type RedisClient = Redis.Redis;

export const redisProviders: Provider[] = [
  {
    useFactory: (): RedisClient => {
      return new Redis({
        host: "socket-redis",
        port: 6379,
      });
    },
    provide: REDIS_SUBSCRIBER_CLIENT,
  },
  {
    useFactory: (): RedisClient => {
      return new Redis({
        host: "socket-redis",
        port: 6379,
      });
    },
    provide: REDIS_PUBLISHER_CLIENT,
  },
];
```

> 注意，主机和端口值通常是通过某种形式的配置来配置的，比如 ConfigService，但是这里为了简单起见省略了它。

有了这些在 RedisModule 中注册的提供商，我们就可以将它们作为依赖注入到我们的服务中。

让我们创建一个 RedisService。

```ts
//redis.service.ts

import {
  REDIS_PUBLISHER_CLIENT,
  REDIS_SUBSCRIBER_CLIENT,
} from "./redis.constants";
import { RedisClient } from "./redis.providers";

export interface RedisSubscribeMessage {
  readonly message: string;
  readonly channel: string;
}

@Injectable()
export class RedisService {
  public constructor(
    @Inject(REDIS_SUBSCRIBER_CLIENT)
    private readonly redisSubscriberClient: RedisClient,
    @Inject(REDIS_PUBLISHER_CLIENT)
    private readonly redisPublisherClient: RedisClient
  ) {}

  // ...
}
```

在构造函数中，我们按照预期注入了两个 Redis 客户端。

然后定义两个方法:fromEvent 和 publish。
让我们首先看一下 fromEvent 方法。

```ts
public fromEvent<T>(eventName: string): Observable<T> {
   this.redisSubscriberClient.subscribe(eventName);

   return Observable.create((observer: Observer<RedisSubscribeMessage>) =>
     this.redisSubscriberClient.on('message', (channel, message) => observer.next({ channel, message })),
   ).pipe(
     filter(({ channel }) => channel === eventName),
     map(({ message }) => JSON.parse(message)),
   );
 }
```

它告诉 Redis 通过使用 redisSubscriberClient 的订阅方法来关注所提供的事件。
然后我们返回一个可观察对象，在这个可观察对象中，我们通过在 message 事件上附加一个监听器来监听任何新消息。

当我们收到一条新消息时，我们首先检查通道(Redis 事件名称)是否等于提供的 eventName。
如果是，我们使用`JSON.parse`将 redis 发送的字符串转换为一个对象。

```ts
public async publish(channel: string, value: unknown): Promise<number> {
   return new Promise<number>((resolve, reject) => {
     return this.redisPublisherClient.publish(channel, JSON.stringify(value), (error, reply) => {
       if (error) {
         return reject(error);
       }

       return resolve(reply);
     });
   });
}
```

`publish` 方法接受一个通道和一个未知值，并使用 `redisPublisherClient` 来发布它。
由于 Redis 无法传输 JavaScript 对象，我们假设提供的值可以用 `JSON.stringify` 字符串化。

通过这两种方法，我们成功地将连接到底层 Redis 客户端的所有麻烦代码抽象出来，现在可以使用可靠的 API 通过使用 RedisService 在实例之间发送事件。

## 创建套接字的状态

我们已经提到，当前打开的 WebSocket 连接必须保持在某种状态。
像`socket.io`这样的库，我们将在这里使用它，为我们做这件事。
库提供了有用的方法，如`.send`或`.emit`，这使得实际上很难以指定的格式获得当前活动的套接字(连接)

为了使我们更容易检索和管理套接字，我们将实现我们自己的套接字状态。

在我们的状态实现中，我们感兴趣的是检索指定用户的套接字。
这样，如果实例 No.3 分派了 ID 为`1234`的用户应该接收的事件，我们将能够轻松地检查所有实例是否有该 ID 的用户的任何套接字。

我们假设正在创建的应用程序支持某种身份验证。
稍后将介绍如何验证传入套接字;现在，让我们假设每个套接字都有一个可用的`userId`。

这很简单。
我们将以以下格式存储套接字: `Map<string, Socket[]>`.
要用文字表示，键将是用户的 id，对应的值将是用户的所有套接字。

让我们创建一个名为 SocketStateModule 的 Nest 模块，以及负责保持状态的服务。

```ts
//socket-state-service.ts
@Injectable()
export class SocketStateService {
  private socketState = new Map<string, Socket[]>();
  // ...
}
```

首先，我们定义一个私有属性，该属性在映射中保存状态，然后添加一些方法，以便更容易地使用服务。

```ts
public add(userId: string, socket: Socket): boolean {
    const existingSockets = this.socketState.get(userId) || []
    const sockets = [...existingSockets, socket]
    this.socketState.set(userId, sockets)
    return true
}
```

add 方法接受' userId '和 socket 作为参数，它们表示一个新打开的连接。
首先，它将用户现有的套接字(或者一个空数组，如果没有现有的套接字)保存在 existingSockets 中。
然后将提供的套接字附加到集合的末尾，并将新的套接字集合保存在状态中。

```ts
public remove(userId: string, socket: Socket): boolean {
   const existingSockets = this.socketState.get(userId)

   if (!existingSockets) {
     return true
   }

   const sockets = existingSockets.filter(s => s.id !== socket.id)

   if (!sockets.length) {
     this.socketState.delete(userId)
   } else {
     this.socketState.set(userId, sockets)
   }

   return true
 }
```

remove 方法从用户当前存在的套接字中过滤掉不需要的套接字。
每个套接字都有一个唯一的 id，可以用来检查是否相等。
如果在移除套接字之后，用户的状态中不再有任何套接字，则该数组将完全从映射中移除以节省内存。
如果过滤后数组中还剩下一些套接字，我们只需将其设置回状态。

```ts
 public get(userId: string): Socket[] {
   return this.socketState.get(userId) || []
 }

 public getAll(): Socket[] {
   const all = []

   this.socketState.forEach(sockets => all.push(sockets))

   return all
 }
```

还有另外两个方法:get 和 getAll。
在 get 方法中，返回属于给定用户的所有套接字(如果没有，则返回空数组)。

在 getAll 中，我们使用 Map 的 forEach 方法，获取每个用户的套接字，并将它们合并到一个数组中。

## 创建一个适配器

Nest 最好的特性之一是，它允许开发人员处理底层库——比如通过定义良好、可靠的抽象来处理服务器的 Express 和 Fastify 或者 socket.io 和 ws 用于套接字。

从开发人员的角度来看，通过这种方式，库可以很容易地交换，而无需对代码库进行任何重大更改。
为了让它工作，Nest 有自己的一组适配器，将库的 API“匹配”到 Nest 所期望的 API。
这使得 Nest 很容易支持许多具有不同 api 的库。

因为我们想要跟踪当前打开的套接字，所以我们必须扩展 socket.io 的适配器。
该适配器可以作为@nestjs/platform-socket.io 包的一部分使用。
通过扩展现有的适配器，我们可以只覆盖我们需要的方法，而将所有其他事情留给适配器。

在 Nest 的文档中，详细解释了自定义适配器如何工作以及它们为何如此强大。
我建议在进一步阅读之前先阅读它。

```ts
export class SocketStateAdapter extends IoAdapter implements WebSocketAdapter {
  public constructor(
    private readonly app: INestApplicationContext,
    private readonly socketStateService: SocketStateService
  ) {
    super(app);
  }

  private server: socketio.Server;

  public create(
    port: number,
    options: socketio.ServerOptions = {}
  ): socketio.Server {
    this.server = super.createIOServer(port, options);

    this.server.use(async (socket: AuthenticatedSocket, next) => {
      const token =
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization;

      if (!token) {
        socket.auth = null;

        // not authenticated connection is still valid
        // thus no error
        return next();
      }

      try {
        // fake auth
        socket.auth = {
          userId: "1234",
        };

        return next();
      } catch (e) {
        return next(e);
      }
    });

    return this.server;
  }

  public bindClientConnect(server: socketio.Server, callback: Function): void {
    server.on("connection", (socket: AuthenticatedSocket) => {
      if (socket.auth) {
        this.socketStateService.add(socket.auth.userId, socket);

        socket.on("disconnect", () => {
          this.socketStateService.remove(socket.auth.userId, socket);
        });
      }

      callback(socket);
    });
  }
}
```

我们的类扩展了 IoAdapter 并覆盖了两个方法:create 和 bindClientConnect。

正如它的名字所示，create 方法负责创建一个 WebSocket 服务器的实例。
我们使用 IoAdapter 的 createIOServer 方法尽可能地重用代码，并确保一切都尽可能地接近原始适配器。

然后我们设置一个用于身份验证的中间件——在我们的示例中，是一个假中间件。
我们假设身份验证是基于令牌的。

在中间件中，我们首先检查是否在我们预期的位置提供了一个令牌:授权头或查询的令牌参数。

如果没有提供令牌，则设置 socket.auth 为 null，调用下一个进行与其他中间件的执行。
如果有令牌，我们通常会使用 AuthService 检查并验证它，但这超出了本文的范围。

相反，我们将把经过验证的令牌的有效负载模拟为一个具有单一属性 userId 等于 1234 的对象。
令牌验证被放在 try/catch 块中，因为令牌验证方法可能抛出错误。
如果是，我们应该捕获它并使用 error 参数调用 next 来指示套接字。一个错误发生了。

第二个方法是 bindClientConnect，它负责在套接字服务器中注册连接侦听器。
在这里，我们可以访问服务器，在那里我们可以监听连接事件。
我们在 create 方法中定义的中间件将预先执行，因此我们可以安全地检查套接字对象上的 auth 属性。

现在请记住:我们也允许存在未经身份验证的套接字，因此我们必须首先检查 auth 属性是否存在。
如果是，我们使用前面定义的 socketStateService 方法将套接字添加到用户的套接字池中。

我们还为断开连接事件注册一个事件监听器，以将套接字从状态中移除。
为了完全确定没有任何内存泄漏，我们使用套接字对象的 removeAllListeners 方法来删除断开事件监听器。

无论是否有 auth 属性，我们都必须调用作为第二个参数提供的回调函数，以让 socket.io 适配器也保持对套接字的引用。

要注册我们的自定义适配器，我们必须使用 Nest 应用的 useWebSocketAdapter 方法:

```ts
//adapter.init.ts

export const initAdapters = (app: INestApplication): INestApplication => {
  const socketStateService = app.get(SocketStateService);
  const redisPropagatorService = app.get(RedisPropagatorService);

  app.useWebSocketAdapter(
    new SocketStateAdapter(app, socketStateService, redisPropagatorService)
  );

  return app;
};
```

下面解释了 redisPropagatorService。

```ts
//main.ts

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  initAdapters(app);

  await app.listen(3000, () => {
    console.log(`Listening on port 3000.`);
  });
}

bootstrap();
```

## 创建 Redis 事件传播器

随着 Redis 集成和我们自己的套接字状态和适配器到位，所有剩下要做的就是创建最后一个服务，在应用程序的所有实例中分派事件。

为此，我们必须再创建一个名为“RedisPropagatorModule”的 Nest 模块。

在 RedisPropagatorService 中，我们将监听来自其他实例的任何传入的 Redis 事件，并将事件分发给它们。
瞧!我们自己的发布/订阅服务!

有三种类型的事件，通过 Redis:

- 向所有打开的连接发出事件
- 只向经过身份验证的用户发出事件
- 只向指定的用户发出事件

在代码中，我们将如下定义它们:

```ts
export const REDIS_SOCKET_EVENT_SEND_NAME = "REDIS_SOCKET_EVENT_SEND_NAME";
export const REDIS_SOCKET_EVENT_EMIT_ALL_NAME =
  "REDIS_SOCKET_EVENT_EMIT_ALL_NAME";
export const REDIS_SOCKET_EVENT_EMIT_AUTHENTICATED_NAME =
  "REDIS_SOCKET_EVENT_EMIT_AUTHENTICATED_NAME";
```

现在让我们创建服务:

```ts
@Injectable()
export class RedisPropagatorService {
  private socketServer: Server;

  public constructor(
    private readonly socketStateService: SocketStateService,
    private readonly redisService: RedisService
  ) {}

  public propagateEvent(eventInfo: RedisSocketEventSendDTO): boolean {
    if (!eventInfo.userId) {
      return false;
    }

    this.redisService.publish(REDIS_SOCKET_EVENT_SEND_NAME, eventInfo);

    return true;
  }

  public emitToAuthenticated(eventInfo: RedisSocketEventEmitDTO): boolean {
    this.redisService.publish(
      REDIS_SOCKET_EVENT_EMIT_AUTHENTICATED_NAME,
      eventInfo
    );

    return true;
  }

  public emitToAll(eventInfo: RedisSocketEventEmitDTO): boolean {
    this.redisService.publish(REDIS_SOCKET_EVENT_EMIT_ALL_NAME, eventInfo);

    return true;
  }

  // ...
}
```

在构造函数中，我们使用前面创建的两个服务。
我们定义了三个有用的方法。
他们都做一件简单的事情:他们发送预期的 Redis 事件与提供的信息。
唯一的区别是在 propagateEvent 方法中，除非提供了 userId，否则我们不想发布事件。

除此之外，emitToAll 和 emitToAuthenticated 方法都可以从代码库中的任何地方调用。
但对于 propagateEvent，情况并非如此;每当套接字服务器向前端客户端分派事件时，将调用此方法。

## 侦听事件分派

为了最大限度地利用 Nest 生态系统，我们将创建一个拦截器，它将访问每个套接字事件响应。
这样，我们就不必在每个网关中手动调用 propagateEvent。

```ts
//redis-propagator.interceptor.ts

@Injectable()
export class RedisPropagatorInterceptor<T>
  implements NestInterceptor<T, WsResponse<T>>
{
  public constructor(
    private readonly redisPropagatorService: RedisPropagatorService
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<WsResponse<T>> {
    const socket: AuthenticatedSocket = context.switchToWs().getClient();

    return next.handle().pipe(
      tap((data) => {
        this.redisPropagatorService.propagateEvent({
          ...data,
          socketId: socket.id,
          userId: socket.auth?.userId,
        });
      })
    );
  }
}
```

拦截器可以订阅由 next.handle()方法返回的可观察对象。
服务器发送的每个 WebSocket 事件都会经过这里。
通过使用 RxJS 的 tap 方法，我们可以对响应做出反应而不改变它。

在返回到前端客户端之前，每个已分派事件都在所有实例之间传播，在这些实例中，我们将事件发送给所有属于用户的套接字。

记住，auth 对象是可选的，所以我们使用 TypeScript 的新可选链接语法来确保没有 auth 对象时代码不会中断。

在 propagateEvent 方法中，我们拒绝不带 userId 的事件。
这是因为此类事件对跨实例传播没有兴趣——连接是惟一的。

记住，无论是否使用了 propagateEvent 方法，事件都会发送到前端客户机。
因此，如果没有 auth 对象，网关发送的事件仍然会到达前端客户端。
我们只是确保它被发送到用户可能打开的所有其他套接字。

我们将在本文末尾的示例中展示如何附加拦截器。

## 在 `RedisPropagatorService` 中创建事件监听器

除了将事件分派到其他实例外，我们还希望侦听来自其他实例的事件。

```ts
@Injectable()
export class RedisPropagatorService {
  // ...

  private socketServer: Server;

  public constructor(
    private readonly socketStateService: SocketStateService,
    private readonly redisService: RedisService
  ) {
    this.redisService
      .fromEvent(REDIS_SOCKET_EVENT_SEND_NAME)
      .pipe(tap(this.consumeSendEvent))
      .subscribe();

    this.redisService
      .fromEvent(REDIS_SOCKET_EVENT_EMIT_ALL_NAME)
      .pipe(tap(this.consumeEmitToAllEvent))
      .subscribe();

    this.redisService
      .fromEvent(REDIS_SOCKET_EVENT_EMIT_AUTHENTICATED_NAME)
      .pipe(tap(this.consumeEmitToAuthenticatedEvent))
      .subscribe();
  }

  public injectSocketServer(server: Server): RedisPropagatorService {
    this.socketServer = server;

    return this;
  }
}
```

感谢 redisService，我们可以很容易地订阅 Redis 事件。
使用 RxJS 的 tap 操作符，我们可以调用其中一个方法来对 observable 的事件流做出适当的反应。

## 改变 `socketStateAdapter`

我们还创建了一个 injectSocketServer 方法，该方法允许我们将 WebSocket 服务器实例注入到我们的服务中。
最好通过依赖项注入来实现这一点，但在编写自定义适配器时这是不可能的。
然而，有了这个方法，我们必须调整适配器的代码:

```ts
export class SocketStateAdapter extends IoAdapter implements WebSocketAdapter {
public constructor(
private readonly app: INestApplicationContext,
private readonly socketStateService: SocketStateService,
private readonly redisPropagatorService: RedisPropagatorService,
) {
super(app);
}

public create(port: number, options: socketio.ServerOptions = {}): socketio.Server {
const server = super.createIOServer(port, options);
this.redisPropagatorService.injectSocketServer(server);
// ...
}
```

我们已经使用依赖注入来获取 redisPropagatorService 的实例，并且在创建 WebSocket 服务器期间，我们只是将它注入到我们的单例服务中。

解决了这些问题之后，让我们回到 redisPropagatorService，并定义用于监听事件的方法。

## consumeSendEvent 方法

首先，我们将创建一个名为 consumeSendEvent 的方法来监听 Redis 事件，它告诉我们发送一个事件给指定的用户。

```ts
private consumeSendEvent = (eventInfo: RedisSocketEventSendDTO): void => {
const { userId, event, data, socketId } = eventInfo;

return this.socketStateService
.get(userId)
.filter((socket) => socket.id !== socketId)
.forEach((socket) => socket.emit(event, data));
};
```

在 eventInfo 中，我们传递以下信息:

```ts
export class RedisSocketEventSendDTO {
  public readonly userId: string;
  public readonly socketId: string;
  public readonly event: string;
  public readonly data: unknown;
}
```

知道将事件发送到何处(userId)、事件被称为什么(event)、它应该包含什么数据(data)以及事件起源于哪个套接字(socketId)，我们就可以安全地将事件发送到现有用户的套接字。

我们首先获取用户的套接字(通过提供的 socketId 过滤套接字来确保没有发送两次相同的事件)，然后使用每个套接字的 emit 方法来发送事件。

如果当前没有为用户打开的套接字(如果用户在某个其他实例上只有一个打开的连接)，则 socketStateService 的 get 方法将返回一个空数组，并且不会执行以下所有方法。

在拦截器内部，我们使用 propagateEvent 方法跨所有实例发送事件。
然后将事件发送到前端客户端。
这就是为什么我们要跟踪事件发生在哪个套接字上:以确保同一个事件不会在同一个套接字上发送两次。

## consumeEmitToAllEvent

```ts
private consumeEmitToAllEvent = (
eventInfo: RedisSocketEventEmitDTO,
): void => {
this.socketServer.emit(eventInfo.event, eventInfo.data);
};
```

该方法非常简单—所要做的就是使用套接字服务器的 emit 方法向所有当前打开的连接发送事件，无论是否经过身份验证。

## consumeEmitToAuthenticated

```ts
private consumeEmitToAuthenticatedEvent = (
eventInfo: RedisSocketEventEmitDTO,
): void => {
const { event, data } = eventInfo;

return this.socketStateService
.getAll()
.forEach((socket) => socket.emit(event, data));
};
```

在 consumeEmitToAuthenticated 方法中，我们使用了 socketStateService 的 getAll 方法。
在获得所有经过身份验证的套接字之后，我们使用套接字的 emit 方法来发送事件。

## 工作示例

最后要做的是创建一个网关来监听传入的事件并检查一切是否按预期工作。

```ts
@UseInterceptors(RedisPropagatorInterceptor)
@WebSocketGateway()
export class EventsGateway {
  @SubscribeMessage("events")
  public findAll(): Observable<any> {
    return from([1, 2, 3]).pipe(
      map((item) => {
        return { event: "events", data: item };
      })
    );
  }
}
```

通过使用@UseInterceptors 装饰器，我们注册了跨所有实例发出事件的拦截器。
如果希望传播事件，就必须在我们创建的每个网关上注册拦截器。

现在我们来看一个带有套接字的简单 HTML 文件。io-client 库:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Sockets test</title>
  </head>
  <body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.dev.js"></script>
    <script>
      window.s = io("http://localhost:3000", {
        query: {
          token: "123",
        },
      });

      s.emit("events", { event: "events", data: { test: true } });
      s.on("events", (response) => {
        console.log(response);
      });
    </script>
  </body>
</html>
```

提供的令牌显然是假的，我们只是想模拟有一个令牌。

从存储库中获取代码后，为了启动应用程序，运行:
docker-compose 起来
在观察模式下编译我们的应用程序

一旦服务器启动并运行，打开文件并检查控制台:

检查 HTML 文件中的控制台

知道提供了一个令牌，我们可以通过打开第二个选项卡来检查两个选项卡是否应该接收相同的事件(因为它们是来自一个用户的两个会话):

控制台反映两个会话

通过刷新一个选项卡，我们将使第二个选项卡也接收事件。
我们的事件通过 Redis 客户端，然后将它们转发到它们起源的同一个实例，但这一次，我们只发送到尚未收到事件的套接字。

完整的代码可以在[这里](https://github.com/maciejcieslar/scalable-websocket-nestjs)找到。

## 总结

当把 WebSockets 添加到我们的应用程序中时，我们面临着一个决定:我们的应用程序是否可伸缩。
一旦应用程序需要跨多个实例进行复制，那么预先决定使用可伸缩的解决方案将极大地造福于我们。
由于 Nest 的模块化，一旦实现，解决方案可以很容易地复制到其他项目。

确保我们的应用程序是可伸缩的是一项艰巨的工作。
在很大程度上，这需要我们彻底改变思维方式。
但这绝对值得。
