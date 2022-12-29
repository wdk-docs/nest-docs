# 拦截器

拦截器是用`@Injectable()`装饰器注解的类。
拦截器实现了 `NestInterceptor` 接口。

<figure><img src="/assets/Interceptors_1.png" /></figure>

拦截器有一组有用的功能，它们受到了[面向方面编程 (AOP)](https://en.wikipedia.org/wiki/Aspect-oriented_programming)技术的启发。
它们使以下事情成为可能:

- 在方法执行之前/之后绑定额外的逻辑
- 转换函数返回的结果
- 转换函数抛出的异常
- 扩展基本函数行为
- 根据特定条件完全重写函数(例如，为了缓存)

## 基本

每个拦截器都实现了 `intercept()` 方法，该方法接受两个参数。
第一个是 `ExecutionContext` 实例(与[守卫](/guards)的对象完全相同)。
`ExecutionContext` 继承自 `ArgumentsHost`。
我们在之前的异常过滤器一章中看到了`ArgumentsHost`。
在这里，我们看到它是传递给原始处理程序的参数的包装器，并包含基于应用程序类型的不同参数数组。
您可以参考[异常过滤器](https://docs.nestjs.com/exception-filters#arguments-host)了解更多关于这个主题的信息。

## 执行上下文

通过扩展`ArgumentsHost`， `ExecutionContext`还增加了几个新的助手方法，提供关于当前执行过程的额外细节。
这些细节有助于构建更通用的拦截器，这些拦截器可以跨广泛的控制器、方法和执行上下文工作。
[这里](/fundamentals/execution-context)可以了解更多关于 `ExecutionContext` 的信息。

## 调用管理器

第二个参数是 `CallHandler`。
`CallHandler` 接口实现了 `handle()` 方法，你可以在拦截器的某个点上使用它来调用路由处理程序方法。
如果你没有在你的 `intercept()` 方法的实现中调用 `handle()` 方法，路由处理程序方法将根本不会被执行。

这种方法意味着 `intercept()` 方法有效地 **包装** 了请求/响应流。
因此，你可以在最终路由处理器执行 **之前和之后** 都实现自定义逻辑。
很明显，你可以在你的 `intercept()` 方法中编写代码，在调用 `handle()` **之前** 执行，但你如何影响之后发生的事情?
因为 `handle()` 方法返回一个 `Observable`，所以我们可以使用功能强大的[RxJS](https://github.com/ReactiveX/rxjs)操作符来进一步操作响应。
使用面向方面编程术语，路由处理程序的调用(例如，调用`handle()`)称为[切入点](<(https://en.wikipedia.org/wiki/Pointcut)>)，表明它是插入额外逻辑的点。

例如，考虑一个传入的`POST /cats`请求。
这个请求的目的地是 `CatsController` 中定义的 `create()` 处理程序。
如果一个没有调用 `handle()` 方法的拦截器在这个过程中被调用，`create()` 方法将不会被执行。
一旦 `handle()` 被调用(并且它的 `Observable` 已经被返回)，`create()` 处理器就会被触发。
一旦响应流通过 `Observable` 被接收，就可以在流上执行额外的操作，并将最终的结果返回给调用者。

## 切面拦截

我们将看到的第一个用例是使用拦截器来记录用户交互(例如，存储用户调用、异步调度事件或计算时间戳)。
下面我们展示了一个简单的 `LoggingInterceptor`:

```typescript
@@filename(logging.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');

    const now = Date.now();
    return next
      .handle()
      .pipe(tap(() => console.log(`After...${Date.now() - now}ms`)));
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor {
  intercept(context, next) {
    console.log('Before...');
    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => console.log(`After...${Date.now() - now}ms`)),
      );
  }
}
```

!!! info "**Hint**"

    `NestInterceptor<T, R>` 是一个泛型接口，其中` T` 表示 `Observable<T>` (支持响应流)的类型，`R` 是 `Observable<R>` 包装的值的类型。

> warning **Notice** 拦截器，比如控制器、提供器、守卫等等，可以通过它们的“构造函数”**注入** 依赖。

因为 `handle()` 返回 `RxJS` 的 `Observable`，所以我们有很多操作符可以用来操作流。
在上面的例子中，我们使用了 `tap()` 操作符，它会在可观察流优雅或异常终止时调用我们的匿名日志函数，但不会干扰响应周期。

## 拦截器绑定

为了设置这个拦截器，我们使用从 `@nestjs/common` 包中导入的 `@UseInterceptors()` 装饰器。
像[管道](/pipes)和[守卫](/guards)一样，拦截器可以是`控制器作用域`、`方法作用域`或`全局作用域`。

```typescript
@@filename(cats.controller)
@UseInterceptors(LoggingInterceptor)
export class CatsController {}
```

!!! info "**Hint**"

    `@UseInterceptors()` 装饰器是从 `@nestjs/common` 包中导入的。

使用上面的构造，每个在`CatsController`中定义的路由处理器将使用`LoggingInterceptor`。
当有人调用`GET /cats`端点时，你会在标准输出中看到如下输出:

```typescript
Before...
After...
1ms
```

请注意，我们传递了 `LoggingInterceptor` 类型(而不是实例)，将实例化的责任留给框架并启用依赖注入。
与管道、守卫和异常过滤器一样，我们也可以传递一个就地实例:

```typescript
@@filename(cats.controller)
@UseInterceptors(new LoggingInterceptor())
export class CatsController {}
```

如上所述，上面的构造将拦截器附加到这个控制器声明的每个处理程序上。
如果我们想要将拦截器的作用域限制到单个方法，我们只需在 **方法级别** 应用装饰器。

为了设置一个全局拦截器，我们使用了 Nest 应用实例的 `useGlobalInterceptors()` 方法:

```typescript
const app = await NestFactory.create(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

全局拦截器在整个应用中被使用，用于每个控制器和每个路由处理程序。
在依赖注入方面，从任何模块外部注册的全局拦截器(使用 `useGlobalInterceptors()`，就像上面的例子)不能注入依赖，因为这是在任何模块的上下文之外完成的。
为了解决这个问题，你可以使用下面的构造直接从任何模块中建立一个拦截器:

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

!!! info "**Hint**"

    当使用此方法为拦截器执行依赖注入时，请注意，无论在哪个模块中使用此构造，拦截器实际上都是全局的。

> 这应该在哪里做?
> 选择定义拦截器的模块(在上面的例子中为 `LoggingInterceptor`)。
> 此外，`useClass` 并不是处理自定义提供器注册的唯一方法。
> 了解更多[在这里](/fundamentals/custom-providers).

## 响应映射

我们已经知道 `handle()` 返回一个 `Observable`。
这个流包含从路由处理程序返回的 **值** ，因此我们可以很容易地使用 RxJS 的 `map()` 操作符来改变它。

> warning **Warning** 响应映射特性不能用于特定于库的响应策略(直接使用 `@Res()` 对象是被禁止的)。

让我们创建 `TransformInterceptor`，它将以一种简单的方式修改每个响应，以演示该过程。
它将使用 `RxJS` 的 `map()` 操作符将响应对象分配给新创建对象的 `data` 属性，并将新对象返回给客户端。

```typescript
@@filename(transform.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map(data => ({ data })));
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor {
  intercept(context, next) {
    return next.handle().pipe(map(data => ({ data })));
  }
}
```

!!! info "**Hint**"

    嵌套拦截器同时使用同步和异步的 `intercept()` 方法。

> 如果需要，你可以简单地将该方法切换到`async`。

在上面的构造中，当有人调用 `GET /cats` 端点时，响应会像下面这样(假设路由处理程序返回一个空数组`[]`):

```json
{
  "data": []
}
```

拦截器在为整个应用程序中出现的需求创建可重用的解决方案方面有很大的价值。
例如，假设我们需要将每个`null`值的出现转换为空字符串`''`。
我们可以使用一行代码，并全局绑定拦截器，这样每个注册的处理程序都会自动使用它。

```typescript
@@filename()
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(map(value => value === null ? '' : value ));
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor {
  intercept(context, next) {
    return next
      .handle()
      .pipe(map(value => value === null ? '' : value ));
  }
}
```

## 异常映射

另一个有趣的用例是利用 RxJS 的 `catchError()` 操作符来重写抛出的异常:

```typescript
@@filename(errors.interceptor)
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  BadGatewayException,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(
        catchError(err => throwError(new BadGatewayException())),
      );
  }
}
@@switch
import { Injectable, BadGatewayException } from '@nestjs/common';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor {
  intercept(context, next) {
    return next
      .handle()
      .pipe(
        catchError(err => throwError(new BadGatewayException())),
      );
  }
}
```

## 流覆盖

我们有时可能希望完全避免调用处理程序而返回一个不同的值，原因有几个。
一个明显的例子是实现缓存以提高响应时间。
让我们来看看一个简单的 **缓存拦截器** ，它从缓存中返回响应。
在实际的示例中，我们希望考虑其他因素，如 `TTL` 、缓存失效、缓存大小等，但这超出了本文的讨论范围。
这里我们将提供一个演示主要概念的基本示例。

```typescript
@@filename(cache.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isCached = true;
    if (isCached) {
      return of([]);
    }
    return next.handle();
  }
}
@@switch
import { Injectable } from '@nestjs/common';
import { of } from 'rxjs';

@Injectable()
export class CacheInterceptor {
  intercept(context, next) {
    const isCached = true;
    if (isCached) {
      return of([]);
    }
    return next.handle();
  }
}
```

我们的`CacheInterceptor`有一个硬编码的 `cache` 变量和一个硬编码的响应 `[]`。
需要注意的关键点是，我们在这里返回了一个由 `RxJS` 的`of()` 操作符创建的新流，因此路由处理器 **根本不会被调用** 。
当有人调用使用 `CacheInterceptor` 的端点时，响应(一个硬编码的空数组)将立即返回。
为了创建通用的解决方案，您可以利用 `Reflector` 并创建一个自定义装饰器。
`Reflector` 在[守卫](/guards)章节中有很好的描述。

## 更多的操作符

使用 `RxJS` 操作符操作流的可能性为我们提供了许多功能。
让我们考虑另一个常见的用例。
假设你想处理路由请求的 **超时** 。
当端点在一段时间后没有返回任何内容时，您希望以一个错误响应结束。
下面的构造可以实现这一点:

```typescript
@@filename(timeout.interceptor)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(new RequestTimeoutException());
        }
        return throwError(err);
      }),
    );
  };
};
@@switch
import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor {
  intercept(context, next) {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(new RequestTimeoutException());
        }
        return throwError(err);
      }),
    );
  };
};
```

5 秒后，请求处理将被取消。
你也可以在抛出`RequestTimeoutException`(例如释放资源)之前添加自定义逻辑。
