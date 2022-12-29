---
title: "WebSocket cluster with NestJs and Redis"
linkTitle: "ws 集群"
date: "2020-04-07"
---

> <https://medium.com/@mohsenes/websocket-cluster-with-nestjs-and-redis-a18882d418ed>

扩展是后端应用程序生活中不可避免的一部分，一旦您决定将应用程序扩展到多个实例，您将面临一个问题:如何处理拥有多个客户机(电话、笔记本电脑等)的用户，每个客户机都连接到集群的随机实例。
在这篇文章中，我们将定义这个问题，并使用 NestJs 和 Redis 来解决它。

需求:

- 有使用 Nodejs 和 NestJs 的经验
- 安装 Nodejs
- 安装了 NestJs CLI
- 安装 Redis

问题:

- 在 WebSocket 上发出的消息需要发送到与我们的每个实例相连的接收方的设备上

解决方案:

- 我们将使用 Redis PubSub 流处理消息到多个实例，为了在 NestJs 上实现这一点，我们将创建一个名为 socket 模块的模块，我们将放置一个网关来处理 socket 客户端和一个服务来进行发现，连接到 Redis 和分发消息。

我们将逐步介绍这一点。

## 准备安装

### 安装 NestJs CLI

以全局包的形式安装 NestJs CLI

```sh
# run with sudo if you are on ubuntu
npm i -g @nestjs/cli
```

### 创建 NestJS 项目

创建新的 NestJS 项目，依赖项也将通过这个命令通过向导安装

```sh
nest g socket-cluster-app
```

### 生成 Socket 模块

生成我们讨论过的 Socket 模块

```sh
# go into project folder
cd socket-cluster-app/

# generate socket module
nest g module socket

# generate socket service
nest g service socket

# generate socket gateway
nest g gateway socket/socket
```

使用`nest g`命令会自动将你的服务和套接字添加到它们的相关模块中

### 安装 WebSocket 适配器

```sh
npm i @nestjs/platform-ws
npm i @nestjs/websockets
```

## 用例实现

在`main.ts`文件中注册适配器

```ts
import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // register adapter
  app.useWebSocketAdapter(new WsAdapter(app) as any);
  await app.listen(parseInt(process.env["PORT"], 10) || 3000);
}
bootstrap();
```

### 标识每个套接字

然后，我们将在 handleConnection 调用中标识每个套接字，并将为每个客户端添加一个“userId”属性。
在这个例子中，我们将通过客户端发送的令牌 cookie 设置 userId，在一个真实的例子中，您需要验证令牌，
并通过查询数据库或某些身份验证服务将 userId 分配给客户端。

src/socket.gateway.ts

```ts
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from "@nestjs/websockets";

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  public connectedSockets: { [key: string]: any[] } = {};

  async handleConnection(client: any, req: Request) {
    try {
      const token = req.headers["cookie"]
        .split(";")
        .map((p) => p.trim())
        .find((p) => p.split("=")[0] === "token")
        .split("=")[1];

      // for this example, we simply set userId by token
      client.userId = token;

      if (!this.connectedSockets[client.userId])
        this.connectedSockets[client.userId] = [];

      this.connectedSockets[client.userId].push(client);
    } catch (error) {
      client.close(4403, "set JWT cookie to authenticate");
    }
  }

  handleDisconnect(client: any) {
    this.connectedSockets[client.userId] = this.connectedSockets[
      client.userId
    ].filter((p) => p.id !== client.id);
  }
}
```

### 套接字服务

现在我们需要实现套接字服务，我们需要一个 Redis 包在实例之间分发消息。

```sh
npm i redis
npm i --save-dev @types/redis
```

- Socket 服务将有多个构造函数，第 0 步是在构造函数方法中为我们的服务分配一个随机 id，并注入我们在上一步中实现的“SocketGateWay”。

  src/main.ts

  ```ts
      constructor(private readonly socketGateway: SocketGateway) {
          this.serviceId =
              'SOCKET_CHANNEL_' +
              Math.random()
                  .toString(26)
                  .slice(2);
      }
  ```

- 另外，我们在 socket 服务中实现了 onModuleInit 函数，它将创建并连接到 3 个 Redis 客户端。

  - 用 redisClient 通过通道发现更新服务关键字
  - 通过 subscriberClient 获取分布式消息
  - publisherClient 将消息分发到其他实例

    src/socket/socket.service.ts

    ```ts
        async onModuleInit() {
            this.redisClient = await this.newRedisClient();
            this.subscriberClient = await this.newRedisClient();
            this.publisherClient = await this.newRedisClient();

            this.subscriberClient.subscribe(this.serviceId);

            this.subscriberClient.on('message', (channel, message) => {
                const { userId, payload } = JSON.parse(message);
                this.sendMessage(userId, payload, true);
            });

            await this.channelDiscovery();
        }

        private async newRedisClient() {
            return createClient({
                host: 'localhost',
                port: 6379,
            });
        }
    ```

- createClient 是从“redis”包导入的
  channelDiscovery 将保存它的 serviceId 在 Redis 与过期 3 秒。
  它还将启动自我重复超时，每 2 秒重新执行一次。
  这样，所有实例都可以访问已更新的套接字服务列表，以便分发消息。
  清除发现间隔超时
  在测试此服务时，防止开放处理程序的问题将是一个好主意。

  src/socket/socket.service.ts

  ```ts
  private async channelDiscovery() {
      this.redisClient.setex(this.serviceId, 3, Date.now().toString());
      this.discoveryInterval = setTimeout(() => {
          this.channelDiscovery();
      }, 2000);
  }

  async onModuleDestroy() {
      this.discoveryInterval && clearTimeout(this.discoveryInterval);
  }
  ```

- sendMessage 最后一步是向特定用户的每个连接的客户端发送消息。
  我们将消息发送到连接的客户端，并将此消息分发给其他实例。
  如果消息已经由另一个实例分发，“if(!fromRedisChannel)” 则将阻止分发。

  src/socket/socket.service.ts

  ```ts
      async sendMessage(
          userId: string,
          payload: string,
          fromRedisChannel: boolean,
      ) {
          this.socketGateway.connectedSockets[userId]?.forEach(socket =>
              socket.send(payload),
          );
          if (!fromRedisChannel) {
              this.redisClient.keys('SOCKET_CHANNEL_', (err, ids) => {
                  ids.filter(p => p != this.serviceId).forEach(id => {
                      this.publisherClient.publish(
                          id,
                          JSON.stringify({
                              payload,
                              userId,
                          }),
                      );
                  });
              });
          }
      }
  ```

## 测试场景

好的，我们完成了，现在我们可以设置测试场景。
首先，我们将创建一个简单的测试脚本，该脚本将连接到我们的一个实例并打印接收到的消息。
通过运行“npm i ws”来安装 ws 包

```ts
const ws = require("ws");
const port = 3001;
const socket = new ws(`ws://localhost:${port}`, {
  headers: { Cookie: "token=user1" },
});
socket.on("message", (data) => {
  console.log(`Received message`, data);
});
socket.on("open", (data) => {
  console.log(`Connected to port ${port}`);
});
socket.on("close", (data) => {
  console.log(`Disconnected from port ${port}`);
});
```

然后，我们向套接字服务添加一个简单的间隔，用于向 user1 发送时间。

```sh

  constructor(private readonly socketGateway: SocketGateway) {
    this.serviceId = 'SOCKET_CHANNEL_' + Math.random()
      .toString(26)
      .slice(2);

      setInterval(() => {
        this.sendMessage(
          'user1',
          new Date().toLocaleTimeString() +
            ` | from server on port ${process.env['PORT']}`,
          false,
        );
      }, 3000);
  }
```

最后，按顺序运行以下命令

```sh
PORT=3001 npm start
PORT=3002 npm start
node test-script.js
```

测试脚本应该每 3 秒记录一条来自两个实例的消息。

```sh
# output
Received message 8:21:55 AM | from server on port 3001
Received message 8:21:57 AM | from server on port 3002
```

这向我们表明，现在我们的服务能够将来自不同实例的 WebSocket 消息分发到特定的客户机。

## 完整示例

我们在本文中所采取的步骤的一个完整的工作示例可以在这里找到 <https://github.com/m-esm/socket-cluster-app>

- main.js

  ```ts
  import { NestFactory } from "@nestjs/core";
  import { WsAdapter } from "@nestjs/platform-ws";

  import { AppModule } from "./app.module";

  async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // register adapter
    app.useWebSocketAdapter(new WsAdapter(app) as any);

    await app.listen(parseInt(process.env["PORT"], 10) || 3000);
  }
  bootstrap();
  ```

- socket

  - socket.service.ts

    ```ts
    import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
    import { createClient, RedisClient } from "redis";

    import { SocketGateway } from "./socket.gateway";

    @Injectable()
    export class SocketService implements OnModuleInit, OnModuleDestroy {
      public redisClient: RedisClient;
      public publisherClient: RedisClient;
      private subscriberClient: RedisClient;
      private discoveryInterval;
      private serviceId: string;

      constructor(private readonly socketGateway: SocketGateway) {
        this.serviceId =
          "SOCKET_CHANNEL_" + Math.random().toString(26).slice(2);

        setInterval(() => {
          this.sendMessage(
            "user1",
            new Date().toLocaleTimeString() +
              ` | from server on port ${process.env["PORT"]}`,
            false
          );
        }, 3000);
      }

      async onModuleInit() {
        this.redisClient = await this.newRedisClient();
        this.subscriberClient = await this.newRedisClient();
        this.publisherClient = await this.newRedisClient();

        this.subscriberClient.subscribe(this.serviceId);

        this.subscriberClient.on("message", (channel, message) => {
          const { userId, payload } = JSON.parse(message);
          this.sendMessage(userId, payload, true);
        });

        await this.channelDiscovery();
      }
      private async newRedisClient() {
        return createClient({
          host: "localhost",
          port: 6379,
        });
      }

      async onModuleDestroy() {
        this.discoveryInterval && clearTimeout(this.discoveryInterval);
      }

      private async channelDiscovery() {
        this.redisClient.setex(this.serviceId, 3, Date.now().toString());
        this.discoveryInterval = setTimeout(() => {
          this.channelDiscovery();
        }, 2000);
      }

      async sendMessage(
        userId: string,
        payload: string,
        fromRedisChannel: boolean
      ) {
        this.socketGateway.connectedSockets[userId]?.forEach((socket) =>
          socket.send(payload)
        );
        if (!fromRedisChannel) {
          this.redisClient.keys("SOCKET_CHANNEL_*", (err, ids) => {
            ids
              .filter((p) => p != this.serviceId)
              .forEach((id) => {
                this.publisherClient.publish(
                  id,
                  JSON.stringify({
                    payload,
                    userId,
                  })
                );
              });
          });
        }
      }
    }
    ```

    - socket.gateway.ts

    ```ts
    import {
      OnGatewayConnection,
      OnGatewayDisconnect,
      WebSocketGateway,
    } from "@nestjs/websockets";

    @WebSocketGateway()
    export class SocketGateway
      implements OnGatewayConnection, OnGatewayDisconnect
    {
      public connectedSockets: { [key: string]: any[] } = {};

      async handleConnection(client: any, req: Request) {
        try {
          const token = req.headers["cookie"]
            .split(";")
            .map((p) => p.trim())
            .find((p) => p.split("=")[0] === "token")
            .split("=")[1];

          // for this example, we simply set userId by token
          client.userId = token;

          if (!this.connectedSockets[client.userId])
            this.connectedSockets[client.userId] = [];

          this.connectedSockets[client.userId].push(client);
        } catch (error) {
          client.close(4403, "set JWT cookie to authenticate");
        }
      }

      handleDisconnect(client: any) {
        this.connectedSockets[client.userId] = this.connectedSockets[
          client.userId
        ].filter((p) => p.id !== client.id);
      }
    }
    ```
