### 异常过滤器

HTTP[异常过滤器](/exception-filters)层和相应的web套接字层之间的唯一区别是，你应该使用`WsException`而不是抛出`HttpException`。

```typescript
throw new WsException('Invalid credentials.');
```

> info **Hint** `WsException`类是从`@nestjs/websockets`包中导入的。

在上面的示例中，Nest将处理抛出的异常，并使用以下结构发出`exception`消息:

```typescript
{
  status: 'error',
  message: 'Invalid credentials.'
}
```

#### 过滤器

Web套接字异常过滤器的行为等同于HTTP异常过滤器。
下面的示例使用手动实例化的method-scoped过滤器。
就像基于HTTP的应用程序一样，你也可以使用gateway-scoped的过滤器(例如，在网关类的前缀加上一个`@UseFilters()`装饰器)。

```typescript
@UseFilters(new WsExceptionFilter())
@SubscribeMessage('events')
onEvent(client, data: any): WsResponse<any> {
  const event = 'events';
  return { event, data };
}
```

#### 继承

Typically, you'll create fully customized exception filters crafted to fulfill your application requirements. However, there might be use-cases when you would like to simply extend the **core exception filter**, and override the behavior based on certain factors.

In order to delegate exception processing to the base filter, you need to extend `BaseWsExceptionFilter` and call the inherited `catch()` method.

```typescript
@@filename()
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception, host) {
    super.catch(exception, host);
  }
}
```

The above implementation is just a shell demonstrating the approach. Your implementation of the extended exception filter would include your tailored **business logic** (e.g., handling various conditions).
