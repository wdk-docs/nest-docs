# 异常过滤器

HTTP[异常过滤器](/exception-filters)层和相应的 web 套接字层之间的唯一区别是，你应该使用`WsException`而不是抛出`HttpException`。

```typescript
throw new WsException('Invalid credentials.');
```

!!! info "**Hint**"

    `WsException`类是从`@nestjs/websockets`包中导入的。

在上面的示例中，Nest 将处理抛出的异常，并使用以下结构发出`exception`消息:

```typescript
{
  status: 'error',
  message: 'Invalid credentials.'
}
```

## 过滤器

Web 套接字异常过滤器的行为等同于 HTTP 异常过滤器。
下面的示例使用手动实例化的 method-scoped 过滤器。
就像基于 HTTP 的应用程序一样，你也可以使用 gateway-scoped 的过滤器(例如，在网关类的前缀加上一个`@UseFilters()`装饰器)。

```typescript
@UseFilters(new WsExceptionFilter())
@SubscribeMessage('events')
onEvent(client, data: any): WsResponse<any> {
  const event = 'events';
  return { event, data };
}
```

## 继承

通常，您将创建完全定制的异常过滤器来满足您的应用程序需求。
然而，在有些用例中，您可能希望简单地扩展 **核心异常过滤器** ，并基于某些因素覆盖行为。

为了将异常处理委托给基本过滤器，你需要扩展`BaseWsExceptionFilter`并调用继承的`catch()`方法。

=== "TypeScript"

```ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}
```

=== "JavaScript"

```js
import { Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception, host) {
    super.catch(exception, host);
  }
}
```

上面的实现只是演示该方法的 shell。
扩展异常过滤器的实现将包括定制的 **业务逻辑** (例如，处理各种条件)。
