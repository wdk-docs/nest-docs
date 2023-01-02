# 异常过滤器

Nest 自带一个内置的 **异常层** ，负责处理整个应用程序中所有未处理的异常。
当应用程序代码没有处理异常时，该层会捕获异常，然后自动发送适当的用户友好响应。

<figure>
  <img src="/assets/Filter_1.png" />
</figure>

开箱即用，这个动作是由内置的 **全局异常过滤器** 执行的，它处理类型为 `HttpException` 的异常(及其子类)。
当一个异常是 **不可识别的** (既不是 `HttpException` ，也不是继承自 `HttpException` 的类)，内置的异常过滤器生成以下默认 JSON 响应:

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

!!! info "全局异常过滤器部分支持 `http-errors` 库。"

> 基本上，任何抛出的异常包含 `statusCode` 和 `message` 属性将被正确填充并作为响应发送回(而不是默认的 `InternalServerErrorException` 对于未识别的异常)。

## 抛出标准异常

Nest 提供了一个内置的 `HttpException` 类，从 `@nestjs/common` 包中公开。
对于典型的基于 HTTP REST/GraphQL API 的应用程序，最佳实践是在出现某些错误条件时发送标准 HTTP 响应对象。

例如，在 `CatsController` 中，我们有一个 `findAll()` 方法(一个 `GET` 路由处理器)。
让我们假设这个路由处理程序出于某种原因抛出了一个异常。
为了演示这一点，我们将其硬编码如下:

=== "cats.controller.ts"

    ```ts
    @Get()
    async findAll() {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    ```

!!! info

    我们在这里使用了 `HttpStatus` 。
    这是从 `@nestjs/common` 包中导入的 `helper enum`。

当客户端调用这个端点时，响应看起来像这样:

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

`HttpException` 构造函数有两个必需的参数来决定响应:

- 参数 `response` 定义了 JSON 响应体。它可以是`字符串`或`对象`，如下所述。
- `status` 参数定义了[HTTP 状态码](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).

默认情况下，JSON 响应体包含两个属性:

- `statusCode`: 默认为`status`参数中提供的 HTTP 状态码
- `message`: 基于`status`的 HTTP 错误的简短描述

要覆盖 JSON 响应体的消息部分，请在 `response` 参数中提供一个字符串。
要覆盖整个 JSON 响应体，在 `response` 参数中传递一个对象。
Nest 将序列化该对象并将其作为 JSON 响应体返回。

第二个构造函数参数 - `status` - 应该是一个有效的 HTTP 状态码。
最佳实践是使用从 `@nestjs/common` 中导入的 `HttpStatus` 枚举。

下面是一个覆盖整个响应体的例子:

=== "cats.controller.ts"

    ```ts
    @Get()
    async findAll() {
      throw new HttpException({
        status: HttpStatus.FORBIDDEN,
        error: 'This is a custom message',
      }, HttpStatus.FORBIDDEN);
    }
    ```

使用上面的方法，下面是响应的样子:

```json
{
  "status": 403,
  "error": "This is a custom message"
}
```

## 自定义异常

在许多情况下，您不需要编写自定义异常，可以使用内置的 Nest HTTP 异常，如下一节所述。
如果你确实需要创建自定义异常，最好创建你自己的 **异常层次** 结构，其中你的自定义异常继承自基类 `HttpException` 。
使用这种方法，Nest 将识别出你的异常，并自动处理错误响应。
让我们实现这样一个自定义异常:

=== "forbidden.exception.ts"

    ```ts
    export class ForbiddenException extends HttpException {
      constructor() {
        super('Forbidden', HttpStatus.FORBIDDEN);
      }
    }
    ```

由于 `ForbiddenException` 扩展了基础的 `HttpException` ，它将与内置的异常处理程序无缝地工作，因此我们可以在 `findAll()` 方法中使用它。

=== "cats.controller.ts"

    ```ts
    @Get()
    async findAll() {
      throw new ForbiddenException();
    }
    ```

## 内置的 HTTP 异常

Nest 提供了一组从基本的 `HttpException` 继承的标准异常。
这些是从 `@nestjs/common` 包中公开的，代表了许多最常见的 HTTP 异常:

- `BadRequestException`
- `UnauthorizedException`
- `NotFoundException`
- `ForbiddenException`
- `NotAcceptableException`
- `RequestTimeoutException`
- `ConflictException`
- `GoneException`
- `HttpVersionNotSupportedException`
- `PayloadTooLargeException`
- `UnsupportedMediaTypeException`
- `UnprocessableEntityException`
- `InternalServerErrorException`
- `NotImplementedException`
- `ImATeapotException`
- `MethodNotAllowedException`
- `BadGatewayException`
- `ServiceUnavailableException`
- `GatewayTimeoutException`
- `PreconditionFailedException`

## 异常过滤器

虽然基本的(内置的)异常过滤器可以自动为你处理许多情况，但你可能想要对异常层进行完全控制。
例如，您可能希望根据一些动态因素添加日志记录或使用不同的 JSON 模式。
**异常过滤器** 正是为此目的而设计的。
它们允许您控制确切的控制流和发送回客户机的响应的内容。

让我们创建一个异常过滤器，它负责捕捉异常，这些异常是 `HttpException` 类的一个实例，并为它们实现定制的响应逻辑。
为此，我们需要访问底层平台的 `Request` 和 `Response` 对象。
我们将访问 `Request` 对象，这样我们就可以取出原始的 `url` ，并将其包含在日志信息中。
我们将使用 `Response` 对象来直接控制发送的响应，使用`response.json()`方法。

=== "http-exception.filter.ts"

    ```ts
    import {
      ExceptionFilter,
      Catch,
      ArgumentsHost,
      HttpException,
    } from '@nestjs/common';
    import { Request, Response } from 'express';

    @Catch(HttpException)
    export class HttpExceptionFilter implements ExceptionFilter {
      catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
    ```

=== "http-exception.filter.js"

    ```js
    import { Catch, HttpException } from '@nestjs/common';

    @Catch(HttpException)
    export class HttpExceptionFilter {
      catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();

        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
    ```

!!! info

    所有异常过滤器都应该实现通用的`ExceptionFilter<T>`接口。
    这需要你提供带有指定签名的`catch(exception: T, host: ArgumentsHost)` 方法。
    `T` 表示异常的类型。

`@Catch(HttpException)` 装饰器将所需的元数据绑定到异常过滤器，告诉 Nest 这个特定的过滤器正在寻找 `HttpException` 类型的异常，而不是其他类型的异常。
`@Catch()` 装饰器可以接受单个参数，或者一个逗号分隔的列表。
这允许您一次为几种类型的异常设置过滤器。

## 参数主机

让我们看看 `catch()` 方法的参数。
`exception` 参数是当前正在处理的异常对象。
`host` 参数是一个 `ArgumentsHost` 对象。
`ArgumentsHost` 是一个功能强大的实用程序对象，我们将在[执行上下文章节](/fundamentals/execute-context)中进一步研究它。
在这个代码示例中，我们使用它来获取对传递给原始请求处理程序的 `Request` 和 `Response` 对象的引用(在产生异常的控制器中)。
在这个代码示例中，我们在 `ArgumentsHost` 上使用了一些 helper 方法来获得所需的 `Request` 和 `Response` 对象。
了解更多关于 `ArgumentsHost` 的信息[在这里](/基本面/执行上下文)。

这个抽象级别的原因是 `ArgumentsHost` 在所有上下文中都有作用(例如，我们现在处理的 HTTP 服务器上下文中，还有微服务和 WebSockets)。
在执行上下文这一章中，我们将看到如何使用 `ArgumentsHost` 及其辅助函数的功能访问 **任意** 执行上下文的相应的<a href="https://docs.nestjs.com/fundamentals/execution-context#host-methods">底层参数</a>。
这将允许我们编写跨所有上下文操作的通用异常过滤器。

## 绑定的过滤器

让我们把新的 `HttpExceptionFilter` 绑定到 `CatsController` 的 `create()` 方法。

=== "cats.controller.ts"

    ```ts
    @Post()
    @UseFilters(new HttpExceptionFilter())
    async create(@Body() createCatDto: CreateCatDto) {
      throw new ForbiddenException();
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @UseFilters(new HttpExceptionFilter())
    @Bind(Body())
    async create(createCatDto) {
      throw new ForbiddenException();
    }
    ```

!!! info "**Hint**"

    `@UseFilters()` 装饰器是从 `@nestjs/common` 包中导入的。

这里我们使用了 `@UseFilters()` 装饰器。
类似于 `@Catch()` 装饰器，它可以接受单个过滤器实例，也可以接受逗号分隔的过滤器实例列表。
这里，我们在适当的地方创建了 `HttpExceptionFilter` 的实例。
或者，你可以传递类(而不是实例)，将实例化的责任留给框架，并启用依赖注入。

=== "cats.controller.ts"

    ```ts
    @Post()
    @UseFilters(HttpExceptionFilter)
    async create(@Body() createCatDto: CreateCatDto) {
      throw new ForbiddenException();
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @UseFilters(HttpExceptionFilter)
    @Bind(Body())
    async create(createCatDto) {
      throw new ForbiddenException();
    }
    ```

!!! info

    如果可能的话，最好使用类而不是实例来应用过滤器。
    它减少了内存的使用，因为 Nest 可以轻松地在整个模块中重用同一个类的实例。

在上面的例子中， `HttpExceptionFilter` 只应用于单一的 `create()` 路由处理程序，使其限于方法范围。
异常筛选器可以定义在不同的级别:方法范围的、控制器范围的或全局范围的。
例如，要将过滤器设置为控制器作用域，你需要执行以下操作:

=== "cats.controller.ts"

```ts
@UseFilters(new HttpExceptionFilter())
export class CatsController {}
```

这个构造为 `CatsController` 中定义的每个路由处理程序设置了 `HttpExceptionFilter` 。

要创建一个全局作用域的过滤器，你需要执行以下操作:

=== "main.ts"

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

!!! warning "`useGlobalFilters()` 方法不为网关或混合应用程序设置过滤器。"

全局范围的过滤器在整个应用程序中使用，用于每个控制器和每个路由处理程序。
在依赖注入方面，从任何模块外部注册的全局过滤器(如上面的例子中的 `useGlobalFilters()` )不能注入依赖，因为这是在任何模块的上下文之外完成的。
为了解决这个问题，你可以直接从任何模块 **注册一个全局作用域的过滤器** ，使用以下构造:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { APP_FILTER } from '@nestjs/core';

    @Module({
      providers: [
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    })
    export class AppModule {}
    ```

!!! info

    当使用此方法为过滤器执行依赖注入时，请注意，无论在哪个模块中使用此构造，过滤器实际上都是全局的。
    这应该在哪里做?选择定义过滤器(在上面的例子中为 `HttpExceptionFilter` )的模块。
    此外， `useClass` 并不是处理自定义提供器注册的唯一方法。
    了解更多[这](/fundamentals/custom-providers)。

你可以根据需要使用这种技术添加尽可能多的过滤器;只需将它们添加到提供器数组中。

## 抓住一切

为了捕获 **每个** 未处理的异常(不管异常类型是什么)，让 `@Catch()` 装饰器的形参列表为空，例如 `@Catch()` 。

在下面的例子中，我们有一个与平台无关的代码，因为它使用[HTTP 适配器](./faq/http-adapter)来传递响应，而不直接使用任何平台特定的对象(`Request`和`Response`):

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
```

## 继承

通常，您将创建完全定制的异常过滤器，以满足您的应用程序需求。
然而，在某些情况下，您可能想简单地扩展内置的默认 **全局异常过滤器** ，并基于某些因素覆盖行为。

为了将异常处理委托给基过滤器，您需要扩展 `BaseExceptionFilter` 并调用继承的 `catch()` 方法。

=== "all-exceptions.filter.ts"

    ```ts
    import { Catch, ArgumentsHost } from '@nestjs/common';
    import { BaseExceptionFilter } from '@nestjs/core';

    @Catch()
    export class AllExceptionsFilter extends BaseExceptionFilter {
      catch(exception: unknown, host: ArgumentsHost) {
        super.catch(exception, host);
      }
    }
    ```

=== "all-exceptions.filter.js"

    ```js
    import { Catch } from '@nestjs/common';
    import { BaseExceptionFilter } from '@nestjs/core';

    @Catch()
    export class AllExceptionsFilter extends BaseExceptionFilter {
      catch(exception, host) {
        super.catch(exception, host);
      }
    }
    ```

!!! warning

    扩展了 `BaseExceptionFilter` 的方法范围和控制器范围的过滤器不应该用 `new` 实例化。
    相反，让框架自动实例化它们。

上面的实现只是一个演示该方法的 shell。
您的扩展异常过滤器的实现将包括您定制的 **业务** 逻辑(例如，处理各种条件)。

全局过滤器 **可以** 扩展基过滤器。
这有两种方法。

第一个方法是在实例化自定义全局过滤器时注入 `HttpServer` 引用:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(3000);
}
bootstrap();
```

第二种方法是使用 `APP_FILTER` 令牌<a href="exception-filters#bind-filters">如下所示</a>。
