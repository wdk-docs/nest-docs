# gRPC

[gRPC](https://github.com/grpc/grpc-node)是一个现代的、开源的、高性能的 RPC 框架，可以在任何环境中运行。
它可以有效地连接数据中心内和跨数据中心的服务，支持负载均衡、跟踪、健康检查和身份验证。

与许多 RPC 系统一样，gRPC 基于以可以远程调用的函数(方法)定义服务的概念。
对于每个方法，您都定义了参数和返回类型。
服务、参数和返回类型定义在。<a href="https://developers.google.com/protocol-buffers">协议缓冲区</a>机制。

通过 gRPC 运输机，Nest 使用`.proto`的文件动态绑定客户端和服务器，使其易于实现远程过程调用，自动序列化和反序列化结构化数据。

## 安装

要开始构建基于 grpc 的微服务，首先要安装所需的包:

```bash
$ npm i --save @grpc/grpc-js @grpc/proto-loader
```

## 概述

像其他的 Nest 微服务传输层实现一样，你可以使用传递给`createMicroservice()`方法的 options 对象的`transport`属性来选择 gRPC 传输机制。
在下面的例子中，我们将设置一个英雄服务。
`options`属性提供关于该服务的元数据;它的属性描述[如下](microservices/grpc#options)。

```typescript
@@filename(main)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.GRPC,
  options: {
    package: `hero`,
    protoPath: join(__dirname, `hero/hero.proto`),
  },
});
@@switch
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.GRPC,
  options: {
    package: `hero`,
    protoPath: join(__dirname, `hero/hero.proto`),
  },
});
```

!!! info "**Hint**"

    `join()`函数从`path`包导入;`Transport`enum 是从`@nestjs/microservices`包中导入的。

在`nest-cli.json`文件中，我们添加了`assets`属性，它允许我们分发非 typescript 文件，以及`watchAssets`——用来打开监视所有非 typescript 资产。
在我们的例子中，我们希望`.proto`文件被自动复制到`dist`文件夹中。

```json
{
  "compilerOptions": {
    "assets": ["**/*.proto"],
    "watchAssets": true
  }
}
```

## 选项

**gRPC** 传输器选项对象公开了下面描述的属性。

| 选项          | 必选     | 默认                 | 描述                                                                                                                                                                        |
| ------------- | -------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package`     | Required |                      | Protobuf 包名(匹配<code>.proto</code>文件中的<code>package</code>设置)。                                                                                                    |
| `protoPath`   | Required |                      | <code>.proto</code>文件的绝对(或相对于根目录)路径。                                                                                                                         |
| `url`         | Optional | `localhost:5000`     | 连接 url。字符串，格式为<code>ip address/dns name:port</code>(例如，<code>`localhost:50051`</code>)，定义传输程序建立连接的地址/端口。                                      |
| `protoLoader` | Optional | `@grpc/proto-loader` | 用于加载<code>.proto</code>文件的实用程序的 NPM 包名称。                                                                                                                    |
| `loader`      | Optional |                      | `@grpc/proto-loader`选项。这些文件提供了对`.proto`文件行为的详细控制。查看[这里](https://github.com/grpc/grpc-node/blob/master/packages/proto-loader/README.md)了解更多细节 |
| credentials   | Optional |                      | 服务器证书。点击[这里](https://grpc.io/grpc/node/grpc.ServerCredentials.html)阅读更多                                                                                       |

## gRPC 服务示例

让我们定义名为`HeroesService`的示例 gRPC 服务。
在上面的`options`对象中，`protopath`属性设置了`.proto`定义文件`hero.proto`的路径。
`hero.proto`文件的结构使用[协议缓冲区](https://developers.google.com/protocol-buffers)。
它看起来是这样的:

```typescript
// hero/hero.proto
syntax = "proto3";

package hero;

service HeroesService {
  rpc FindOne (HeroById) returns (Hero) {}
}

message HeroById {
  int32 id = 1;
}

message Hero {
  int32 id = 1;
  string name = 2;
}
```

我们的`HeroesService`公开了一个`FindOne()`方法。
该方法期望一个类型为`HeroById`的输入参数并返回一个`Hero`消息(协议缓冲区使用`message`元素来定义参数类型和返回类型)。

接下来，我们需要实现服务。
要定义满足此定义的处理程序，我们在控制器中使用`@GrpcMethod()`装饰器，如下所示。
此装饰器提供将方法声明为 gRPC 服务方法所需的元数据。

!!! info "**Hint**"

    在之前的微服务章节中介绍的`@messageppattern()`装饰器([阅读更多信息](microservices/basics#request-response))没有用于基于 grpc 的微服务。

> `@GrpcMethod()`装饰器有效地取代了基于 grpc 的微服务。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @GrpcMethod(`HeroesService`, `FindOne`)
  findOne(data: HeroById, metadata: Metadata, call: ServerUnaryCall<any>): Hero {
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
@@switch
@Controller()
export class HeroesController {
  @GrpcMethod(`HeroesService`, `FindOne`)
  findOne(data, metadata, call) {
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
```

!!! info "**Hint**"

    `@GrpcMethod()`装饰器是从`@nestjs/microservices`包导入的，而`Metadata`和`ServerUnaryCall`则是从`grpc`包导入的。

上面显示的装饰器接受两个参数。
第一个是服务名称(例如，`HeroesService`)，对应于`hero.proto`中的`HeroesService`服务定义。
第二个(字符串`FindOne`)对应于`hero`中的`HeroesService`中定义的`FindOne()` rpc 方法。典型的文件。

`findOne()`处理程序方法有三个参数，从调用者传递的`数据`，存储 gRPC 的`元数据`
请求元数据和`调用`以获取`GrpcCall`对象属性，如`sendMetadata`用于向客户端发送元数据。

`@GrpcMethod()`装饰器参数都是可选的。
如果调用时没有第二个参数(例如，`FindOne`)， Nest 将自动关联`.proto`文件 rpc 方法和基于将处理程序名称转换为上驼峰大小写的处理程序(例如，`findOne`处理程序与`findOne`rpc 调用定义相关联)。
如下所示。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesController {
  @GrpcMethod(`HeroesService`)
  findOne(data: HeroById, metadata: Metadata, call: ServerUnaryCall<any>): Hero {
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
@@switch
@Controller()
export class HeroesController {
  @GrpcMethod(`HeroesService`)
  findOne(data, metadata, call) {
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
```

你也可以省略第一个`@GrpcMethod()`参数。
在这种情况下，Nest 根据定义处理程序的 **类** 名自动将处理程序与来自原定义文件的服务定义关联起来。
例如，在下面的代码中，类`HeroesService`将它的处理程序方法与`hero`中的`HeroesService`服务定义关联起来`.proto`文件，根据名称"`HeroesService`的匹配。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesService {
  @GrpcMethod()
  findOne(data: HeroById, metadata: Metadata, call: ServerUnaryCall<any>): Hero {
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
@@switch
@Controller()
export class HeroesService {
  @GrpcMethod()
  findOne(data, metadata, call) {
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
```

## 客户端

Nest 应用程序可以充当 gRPC 客户端，使用`典型的文件`。 您可以通过`ClientGrpc`对象访问远程服务。 可以通过几种方式获取`ClientGrpc`对象。

首选的技术是导入`ClientsModule`。
使用`register()`方法绑定类中定义的服务包`.proto`文件到注入令牌，并配置该服务。
`name`属性是注入令牌。
对于 gRPC 服务，请使用`transport: transport . gRPC`。
`options`属性是一个具有[上面](microservices/grpc#options)描述的相同属性的对象。

```typescript
imports: [
  ClientsModule.register([
    {
      name: `HERO_PACKAGE`,
      transport: Transport.GRPC,
      options: {
        package: `hero`,
        protoPath: join(__dirname, `hero/hero.proto`),
      },
    },
  ]),
];
```

!!! info "**Hint**"

    `register()`方法接受一个对象数组。

> 通过提供以逗号分隔的注册对象列表来注册多个包。

注册之后，我们可以用`@Inject()`注入配置好的`ClientGrpc`对象。
然后我们使用`ClientGrpc`对象的`getService()`方法来检索服务实例，如下所示。

```typescript
@Injectable()
export class AppService implements OnModuleInit {
  private heroesService: HeroesService;

  constructor(@Inject(`HERO_PACKAGE`) private client: ClientGrpc) {}

  onModuleInit() {
    this.heroesService = this.client.getService<HeroesService>(`HeroesService`);
  }

  getHero(): Observable<string> {
    return this.heroesService.findOne({ id: 1 });
  }
}
```

> error **Warning** gRPC 客户端不会发送名称中包含下划线`_` 的字段，除非`keepCase`选项在 proto 加载器配置中设置为`true`。在微服务传输配置中的 Keepcase’)。

注意，与其他微服务传输方法中使用的技术相比，这里有一个很小的区别。
我们没有使用`ClientProxy`类，而是使用`ClientGrpc`类，它提供了`getService()`方法。
`getService()`泛型方法接受一个服务名作为参数，并返回其实例(如果可用)。

或者，你可以使用`@Client()`装饰器来实例化一个`ClientGrpc`对象，如下所示:

```typescript
@Injectable()
export class AppService implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: `hero`,
      protoPath: join(__dirname, `hero/hero.proto`),
    },
  })
  client: ClientGrpc;

  private heroesService: HeroesService;

  onModuleInit() {
    this.heroesService = this.client.getService<HeroesService>(`HeroesService`);
  }

  getHero(): Observable<string> {
    return this.heroesService.findOne({ id: 1 });
  }
}
```

最后，对于更复杂的场景，我们可以使用`ClientProxyFactory`类注入动态配置的客户端，如[这里](/microservices/basics#client)所述。

在这两种情况下，我们最终都得到了对`HeroesService`代理对象的引用，它公开了在`典型的文件`。 现在，当我们访问这个代理对象(即`heroesService`)时，gRPC 系统自动序列化请求，将它们转发到远程系统，返回一个响应，并反序列化响应。 因为 gRPC 屏蔽了这些网络通信细节，所以`heroesService`看起来和行为都像本地提供者。

注意，所有的服务方法都是 **小写的** (为了遵循语言的自然惯例)。
例如，当我们的`.proto` 文件 `HeroesService`定义包含`FindOne()`函数，`HeroesService`实例将提供`FindOne()`方法。

```typescript
interface HeroesService {
  findOne(data: { id: number }): Observable<any>;
}
```

消息处理程序还能够返回一个`Observable`，在这种情况下，结果值将被发出，直到流完成。

```typescript
@@filename(heroes.controller)
@Get()
call(): Observable<any> {
  return this.heroesService.findOne({ id: 1 });
}
@@switch
@Get()
call() {
  return this.heroesService.findOne({ id: 1 });
}
```

要发送 gRPC 元数据(与请求一起)，可以传递第二个参数，如下所示:

```typescript
call(): Observable<any> {
  const metadata = new Metadata();
  metadata.add(`Set-Cookie`, `yummy_cookie=choco`);

  return this.heroesService.findOne({ id: 1 }, metadata);
}
```

!!! info "**Hint**"

    Metadata 类是从 grpc 包中导入的。

请注意，这将需要更新我们在前面几个步骤中定义的`HeroesService`接口。

## 例子

这里有一个可用的示例[此处](https://github.com/nestjs/nest/tree/master/sample/04-grpc).

## gRPC 流

gRPC 本身支持长期的实时连接，通常称为`流`。
流在聊天、观察或块数据传输等情况下非常有用。
在官方文档中找到更多细节[点击这里](https://grpc.io/docs/guides/concepts/).

Nest 以两种可能的方式支持 GRPC 流处理程序:

- RxJS `Subject` + `Observable` handler: 将响应写在 Controller 方法内部或传递给`Subject `/ `Observable`消费者是否有用
- 纯 GRPC 调用流处理程序: 传递给一些执行器是很有用的，它将为 Node 标准的`Duplex`流处理程序处理其余的调度。

## 流示例

让我们定义一个名为`HelloService`的新的 gRPC 服务示例。
`你好。Proto`文件的结构使用[协议缓冲区](https://developers.google.com/protocol-buffers)。
它看起来是这样的:

```typescript
// hello/hello.proto
syntax = "proto3";

package hello;

service HelloService {
  rpc BidiHello(stream HelloRequest) returns (stream HelloResponse);
  rpc LotsOfGreetings(stream HelloRequest) returns (HelloResponse);
}

message HelloRequest {
  string greeting = 1;
}

message HelloResponse {
  string reply = 1;
}
```

!!! info "**Hint**"

    `LotsOfGreetings`方法可以简单地用`@GrpcMethod`装饰器实现(如上例所示)，因为返回的流可以发出多个值。

基于这个`.proto`文件，让我们定义`HelloService`接口:

```typescript
interface HelloService {
  bidiHello(upstream: Observable<HelloRequest>): Observable<HelloResponse>;
  lotsOfGreetings(
    upstream: Observable<HelloRequest>,
  ): Observable<HelloResponse>;
}

interface HelloRequest {
  greeting: string;
}

interface HelloResponse {
  reply: string;
}
```

!!! info "**Hint**"

    proto 接口可以通过[ts-proto](https://github.com/stephenh/ts-proto) 包自动生成，了解更多信息[这里](https://github.com/stephenh/ts-proto/blob/main/NESTJS.markdown)。

## 主题策略

`@GrpcStreamMethod()`装饰器以 RxJS `Observable`的形式提供函数参数。
因此，我们可以接收和处理多个消息。

```typescript
@GrpcStreamMethod()
bidiHello(messages: Observable<any>, metadata: Metadata, call: ServerDuplexStream<any, any>): Observable<any> {
  const subject = new Subject();

  const onNext = message => {
    console.log(message);
    subject.next({
      reply: `Hello, world!`
    });
  };
  const onComplete = () => subject.complete();
  messages.subscribe({
    next: onNext,
    complete: onComplete,
  });


  return subject.asObservable();
}
```

> warning **Warning** 为了支持与`@GrpcStreamMethod()`装饰器的全双工交互，控制器方法必须返回一个 RxJS `Observable`。

!!! info "**Hint**"

    `Metadata`和`ServerUnaryCall`类/接口是从`grpc`包导入的。

根据服务定义(在`.proto`文件)，`BidiHello`方法应该将请求流发送到服务。
为了从客户端向流发送多个异步消息，我们利用了 RxJS 的`ReplaySubject`类。

```typescript
const helloService = this.client.getService<HelloService>(`HelloService`);
const helloRequest$ = new ReplaySubject<HelloRequest>();

helloRequest$.next({ greeting: `Hello (1)!` });
helloRequest$.next({ greeting: `Hello (2)!` });
helloRequest$.complete();

return helloService.bidiHello(helloRequest$);
```

在上面的例子中，我们向流写入了两条消息(`next()`调用)，并通知服务我们已经完成了数据的发送(`complete()`调用)。

## 调用流处理程序

当方法返回值定义为`stream`时，`@GrpcStreamCall()`装饰器将函数参数定义为`grpc`。`ServerDuplexStream`，它支持像这样的标准方法。(`数据`,回调)`、`.write(消息)`或`.cancel()`。
可用方法的完整文档可以在这里找到[此处](https://grpc.github.io/grpc/node/grpc-ClientDuplexStream.html).

或者，当方法返回值不是`stream`时，`@GrpcStreamCall()`装饰器提供两个函数形参，分别是`grpc。ServerReadableStream`(阅读更多[这里](https://grpc.github.io/grpc/node/grpc-ServerReadableStream.html))和`callback`。

让我们从实现`BidiHello`开始，它应该支持全双工交互。

```typescript
@GrpcStreamCall()
bidiHello(requestStream: any) {
  requestStream.on(`data`, message => {
    console.log(message);
    requestStream.write({
      reply: `Hello, world!`
    });
  });
}
```

!!! info "**Hint**"

    这个装饰器不需要提供任何特定的返回参数。

> 预期流的处理方式将与任何其他标准流类型类似。

在上面的例子中，我们使用`write()`方法将对象写入响应流。
传递给`.on()`方法的回调作为第二个参数将在每次服务接收到新的数据块时被调用。

让我们实现`LotsOfGreetings`方法。

```typescript
@GrpcStreamCall()
lotsOfGreetings(requestStream: any, callback: (err: unknown, value: HelloResponse) => void) {
  requestStream.on(`data`, message => {
    console.log(message);
  });
  requestStream.on(`end`, () => callback(null, { reply: `Hello, world!` }));
}
```

这里我们使用`callback`函数在`requestStream`处理完成后发送响应。

## gRPC 元数据

元数据是键-值对列表形式的关于特定 RPC 调用的信息，其中键是字符串，值通常是字符串，但也可以是二进制数据。
元数据对 gRPC 本身是不透明的——它允许客户机向服务器提供与调用相关的信息，反之亦然。
元数据可能包括身份验证令牌、用于监视目的的请求标识符和标记，以及数据信息，如数据集中的记录数量。

要读取`@GrpcMethod()`处理程序中的元数据，请使用第二个参数(metadata)，其类型为`metadata`(从`grpc`包导入)。

要从处理程序发送回元数据，使用`ServerUnaryCall#sendMetadata()`方法(第三个处理程序参数)。

```typescript
@@filename(heroes.controller)
@Controller()
export class HeroesService {
  @GrpcMethod()
  findOne(data: HeroById, metadata: Metadata, call: ServerUnaryCall<any>): Hero {
    const serverMetadata = new Metadata();
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];

    serverMetadata.add(`Set-Cookie`, `yummy_cookie=choco`);
    call.sendMetadata(serverMetadata);

    return items.find(({ id }) => id === data.id);
  }
}
@@switch
@Controller()
export class HeroesService {
  @GrpcMethod()
  findOne(data, metadata, call) {
    const serverMetadata = new Metadata();
    const items = [
      { id: 1, name: `John` },
      { id: 2, name: `Doe` },
    ];

    serverMetadata.add(`Set-Cookie`, `yummy_cookie=choco`);
    call.sendMetadata(serverMetadata);

    return items.find(({ id }) => id === data.id);
  }
}
```

同样，要在用`@GrpcStreamMethod()`处理程序([subject strategy](microservices/grpc#subject-strategy))注释的处理程序中读取元数据，请使用第二个参数(metadata)，它的类型为`metadata`(从`grpc`包导入)。

要从处理程序发送回元数据，使用`ServerDuplexStream#sendMetadata()`方法(第三个处理程序参数)。

要从[调用流处理程序](microservices/grpc#call-stream-handler)(带有`@GrpcStreamCall()`装饰器注释的处理程序)内读取元数据，请听`requestStream`引用上的`metadata`事件，如下所示:

```typescript
requestStream.on(`metadata`, (metadata: Metadata) => {
  const meta = metadata.get(`X-Meta`);
});
```
