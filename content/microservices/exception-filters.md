# 异常过滤器

HTTP [异常过滤器](/exception-filters)层和相应的微服务层之间的唯一区别是，你应该使用`RpcException`而不是抛出`HttpException`。

```typescript
throw new RpcException('Invalid credentials.');
```

!!! info "**Hint**"

    `RpcException` 类是从 `@nestjs/microservices` 包中导入的。

在上面的例子中，Nest 将处理抛出的异常，并以如下结构返回 `error` 对象:

```json
{
  "status": "error",
  "message": "Invalid credentials."
}
```

## 过滤器

微服务异常过滤器的行为类似于 HTTP 异常过滤器，只有一个小区别。
`catch()`方法必须返回一个`Observable`。

```typescript
@@filename(rpc-exception.filter)
import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(exception.getError());
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { throwError } from 'rxjs';

@Catch(RpcException)
export class ExceptionFilter {
  catch(exception, host) {
    return throwError(exception.getError());
  }
}
```

> warning **Warning** 当使用[混合应用程序](/faq/hybrid-application)时，默认情况下全局微服务异常过滤器不启用.

下面的示例使用一个手动实例化的方法范围的过滤器。
就像基于 HTTP 的应用程序一样，您也可以使用控制器作用域的过滤器(即，在控制器类前面加上 `@UseFilters()` 装饰器)。

```typescript
@@filename()
@UseFilters(new ExceptionFilter())
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@UseFilters(new ExceptionFilter())
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```

## 继承

通常，您将创建完全定制的异常过滤器来满足您的应用程序需求。
然而，在有些用例中，您可能希望简单地扩展 **核心异常过滤器** ，并基于某些因素覆盖行为。

为了将异常处理委托给基本过滤器，你需要扩展 `BaseExceptionFilter` 并调用继承的`catch()`方法。

```typescript
@@filename()
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch()
export class AllExceptionsFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    return super.catch(exception, host);
  }
}
@@switch
import { Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch()
export class AllExceptionsFilter extends BaseRpcExceptionFilter {
  catch(exception, host) {
    return super.catch(exception, host);
  }
}
```

上面的实现只是演示该方法的 shell。
扩展异常过滤器的实现将包括定制的 **业务逻辑** (例如，处理各种条件)。
