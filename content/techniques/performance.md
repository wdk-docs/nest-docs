# 性能(Fastify)

默认情况下，Nest 使用[Express](https://expressjs.com/)框架。
如前所述，Nest 还提供了与其他库的兼容性，例如[Fastify](https://github.com/fastify/fastify)。
Nest 通过实现一个框架适配器来实现这种框架独立性，该适配器的主要功能是针对代理中间件和针对特定于库的实现的处理程序。

!!! info "**Hint**"

    注意，为了实现框架适配器，目标库必须提供与 Express 中类似的请求/响应管道处理。

[Fastify](https://github.com/fastify/fastify)为 Nest 提供了一个很好的替代框架，因为它以类似于 Express 的方式解决了设计问题。
然而，fastify 比 Express 快得多，实现的基准结果几乎是 Express 的两倍。
一个合理的问题是，为什么 Nest 使用 Express 作为默认的 HTTP 提供者?原因是 Express 被广泛使用、众所周知，并且有大量兼容的中间件，Nest 用户可以开箱即用。

但是由于 Nest 提供了框架独立性，您可以轻松地在它们之间进行迁移。
当您高度重视非常快的性能时，Fastify 可能是一个更好的选择。
要使用 Fastify，只需选择本章所示的内置`FastifyAdapter`。

## 安装

首先，我们需要安装所需的软件包:

```bash
$ npm i --save @nestjs/platform-fastify
```

> warning **Warning** 当使用`@nestjs/platform-fastify ` 版本 `>=7.5.0`和`apolo -server-fastify`时，GraphQL playground 可能会因为与`fastify `version `^3.0.0`不兼容而无法工作。
> 您可能想使用不稳定的`apollo-server-fastify ` 版本 `^3.0.0-alpha。3` 或暂时选择快递代替。

## 适配器

一旦安装了 Fastify 平台，我们就可以使用`FastifyAdapter`。

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.listen(3000);
}
bootstrap();
```

默认情况下，Fastify 只侦听`localhost 127.0.0.1`接口([阅读更多](https://www.fastify.io/docs/latest/Getting-Started/#your-first-server))。
如果你想在其他主机上接受连接，你应该在`listen()`调用中指定`0.0.0.0`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.listen(3000, '0.0.0.0');
}
```

## 特定于平台的包

请记住，当你使用`FastifyAdapter`时，Nest 使用 Fastify 作为 **HTTP 提供器** 。
这意味着，每个依赖 Express 的配方可能不再有效。
相反，您应该使用与 Fastify 等价的包。

## 重定向响应

Fastify 处理重定向响应的方式与 Express 略有不同。
要使用 Fastify 做一个适当的重定向，返回状态码和 URL，如下:

```typescript
@Get()
index(@Res() res) {
  res.status(302).redirect('/login');
}
```

## Fastify 选项

你可以通过`FastifyAdapter`构造函数将选项传递给 Fastify 构造函数。
例如:

```typescript
new FastifyAdapter({ logger: true });
```

## 例子

[此处](https://github.com/nestjs/nest/tree/master/sample/10-fastify)提供了一个工作示例。
