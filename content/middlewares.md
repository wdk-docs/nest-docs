# 中间件

中间件是一个在路由处理器 **之前** 被称为的函数。
中间件函数可以访问[request](https://expressjs.com/en/4x/api.html#req)和[response](https://expressjs.com/en/4x/api.html#res)对象，以及应用程序请求-响应周期中的 `next()` 中间件函数。
**next** 中间件函数通常由一个名为`next`的变量表示。

<figure><img src="/assets/Middlewares_1.png" /></figure>

默认情况下，Nest 中间件等价于[express](https://expressjs.com/en/guide/using-middleware.html)中间件。
以下是官方文档中对中间件功能的描述:

<blockquote class="external">
  中间件功能可以执行以下任务:
  <ul>
    <li>执行任何代码。</li>
    <li>对请求和响应对象进行更改。</li>
    <li>结束请求-响应周期。</li>
    <li>调用堆栈中的下一个中间件函数。</li>
    <li>如果当前的中间件函数没有结束请求-响应周期，它必须调用<code>next()</code>来将控制权传递给下一个中间件函数。否则，请求将保持挂起状态。</li>
  </ul>
</blockquote>

你可以在一个函数或一个带有 `@Injectable()` 装饰器的类中实现定制的 Nest 中间件。
类应该实现`NestMiddleware`接口，而函数没有任何特殊要求。
让我们从使用类方法实现一个简单的中间件特性开始。

=== "logger.middleware.ts"

    ```ts
    import { Injectable, NestMiddleware } from '@nestjs/common';
    import { Request, Response, NextFunction } from 'express';

    @Injectable()
    export class LoggerMiddleware implements NestMiddleware {
      use(req: Request, res: Response, next: NextFunction) {
        console.log('Request...');
        next();
      }
    }
    ```

=== "logger.middleware.js"

    ```js
    import { Injectable } from '@nestjs/common';

    @Injectable()
    export class LoggerMiddleware {
      use(req, res, next) {
        console.log('Request...');
        next();
      }
    }
    ```

## 依赖注入

嵌套中间件完全支持依赖注入。
就像提供程序和控制器一样，它们能够注入在同一个模块中可用的 **依赖项** 。
通常，这是通过`构造函数`来完成的。

## 应用中间件

在 `@Module()` 装饰器中没有中间件的位置。
相反，我们使用模块类的 `configure()` 方法来设置它们。
包含中间件的模块必须实现 `NestModule` 接口。
让我们在`AppModule`级别设置`LoggerMiddleware`。

=== "app.module.ts"

    ```ts
    import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
    import { LoggerMiddleware } from './common/middleware/logger.middleware';
    import { CatsModule } from './cats/cats.module';

    @Module({
      imports: [CatsModule],
    })
    export class AppModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('cats');
      }
    }
    ```

=== "app.module.js"

    ```js
    import { Module } from '@nestjs/common';
    import { LoggerMiddleware } from './common/middleware/logger.middleware';
    import { CatsModule } from './cats/cats.module';

    @Module({
      imports: [CatsModule],
    })
    export class AppModule {
      configure(consumer) {
        consumer.apply(LoggerMiddleware).forRoutes('cats');
      }
    }
    ```

在上面的例子中，我们为之前在 CatsController 中定义的路由处理器`/cats`设置了`LoggerMiddleware`。
在配置中间件时，我们还可以通过将包含路径和请求方法的对象传递给 forRoutes()方法来进一步限制中间件只能使用特定的请求方法。
在下面的例子中，请注意我们导入了 `RequestMethod` enum 来引用所需的请求方法类型。

=== "app.module.ts"

    ```ts
    import {
      Module,
      NestModule,
      RequestMethod,
      MiddlewareConsumer,
    } from '@nestjs/common';
    import { LoggerMiddleware } from './common/middleware/logger.middleware';
    import { CatsModule } from './cats/cats.module';

    @Module({
      imports: [CatsModule],
    })
    export class AppModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(LoggerMiddleware)
          .forRoutes({ path: 'cats', method: RequestMethod.GET });
      }
    }
    ```

=== "app.module.js"

    ```js
    import { Module, RequestMethod } from '@nestjs/common';
    import { LoggerMiddleware } from './common/middleware/logger.middleware';
    import { CatsModule } from './cats/cats.module';

    @Module({
      imports: [CatsModule],
    })
    export class AppModule {
      configure(consumer) {
        consumer
          .apply(LoggerMiddleware)
          .forRoutes({ path: 'cats', method: RequestMethod.GET });
      }
    }
    ```

!!! info "**Hint**"

    可以使用 `async/await` 方法使 `configure()` 方法变为异步的(例如，你可以在 `configure()` 方法体中 `await` 异步操作的完成)。

## 路由通配符

也支持基于模式的路由。
例如，星号被用作 **通配符** ，它将匹配任何字符组合:

```typescript
forRoutes({ path: 'ab*cd', method: RequestMethod.ALL });
```

`ab*cd` 路由路径将匹配 `abcd`， `ab_cd`， `abecd`，等等。 字符`?`， `+`， `*`和`()`可以在路由路径中使用，它们是它们对应的正则表达式的子集。 连字符(`-`)和点(`.` )按字面意思解释基于字符串的路径。

!!! warning

    `fastify` 包使用 `path-to-regexp` 包的最新版本，该包不再支持通配符星号 `*` 。
    相反,您必须使用参数(如`(.*)`, `:splat*`)。

## 中间件的消费者

`MiddlewareConsumer`是一个助手类。
它提供了几个内建的方法来管理中间件。
所有这些都可以用[流利的风格]简单地链接起来(https://en.wikipedia.org/wiki/Fluent_interface)。
`forRoutes()` 方法可以接受一个字符串，多个字符串，一个 `RouteInfo` 对象，一个控制器类，甚至多个控制器类。
在大多数情况下，你可能只是传递一个以逗号分隔的`控制器`列表。
下面是一个单控制器的例子:

=== "app.module.ts"

      ```ts
      import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
      import { LoggerMiddleware } from './common/middleware/logger.middleware';
      import { CatsModule } from './cats/cats.module';
      import { CatsController } from './cats/cats.controller.ts';

      @Module({
        imports: [CatsModule],
      })
      export class AppModule implements NestModule {
        configure(consumer: MiddlewareConsumer) {
          consumer.apply(LoggerMiddleware).forRoutes(CatsController);
        }
      }
      ```

=== "app.module.js"

    ```js
    import { Module } from '@nestjs/common';
    import { LoggerMiddleware } from './common/middleware/logger.middleware';
    import { CatsModule } from './cats/cats.module';
    import { CatsController } from './cats/cats.controller.ts';

    @Module({
      imports: [CatsModule],
    })
    export class AppModule {
      configure(consumer) {
        consumer.apply(LoggerMiddleware).forRoutes(CatsController);
      }
    }
    ```

!!! info "**Hint**"

    `apply()` 方法可以使用单个中间件，也可以使用多个参数来指定[multiple middleware](/middleware#multiple-middleware)。

## 不包括路由

有时我们想要从中间件应用中排除某些路由。
我们可以使用`exclude()`方法轻松地排除某些路由。
这个方法可以接受一个字符串，多个字符串，或者一个 `RouteInfo` 对象来标识要排除的路由，如下所示:

```typescript
consumer
  .apply(LoggerMiddleware)
  .exclude(
    { path: 'cats', method: RequestMethod.GET },
    { path: 'cats', method: RequestMethod.POST },
    'cats/(.*)',
  )
  .forRoutes(CatsController);
```

!!! info "**Hint**"

    `exclude()`方法支持使用[path-to-regexp](https://github.com/pillarjs/path-to-regexp#parameters)包的通配符参数。

在上面的例子中， `LoggerMiddleware` 将被绑定到 `CatsController` 中定义的所有路由，除了传递给 `exclude()` 方法的三个路由。

<a id="functional-middleware"></a>

## 功能中间件

我们使用的 LoggerMiddleware 类非常简单。
它没有成员，没有额外的方法，也没有依赖关系。
为什么我们不能在一个简单的函数中定义它，而不是在一个类中?事实上，我们可以。
这种类型的中间件被称为功能中间件。
让我们将 logger 中间件从基于类的中间件转换为功能中间件来说明两者的区别:

=== "logger.middleware.ts"

    ```ts
    import { Request, Response, NextFunction } from 'express';

    export function logger(req: Request, res: Response, next: NextFunction) {
      console.log(`Request...`);
      next();
    }
    ```

=== "logger.middleware.js"

    ```js
    export function logger(req, res, next) {
      console.log(`Request...`);
      next();
    }
    ```

并在 `AppModule` 中使用它:

=== "app.module.ts"

    ```ts
    consumer.apply(logger).forRoutes(CatsController);
    ```

!!! info "当你的中间件不需要任何依赖时，考虑使用更简单的功能中间件。"

## 多个中间件

如上所述，为了绑定多个顺序执行的中间件，只需在`apply()`方法中提供一个逗号分隔的列表:

```typescript
consumer.apply(cors(), helmet(), logger).forRoutes(CatsController);
```

## 全局中间件

如果我们想要将中间件绑定到每一个注册的路由，我们可以使用 `INestApplication` 实例提供的 `use()` 方法:

=== "main.ts"

    ```ts
    const app = await NestFactory.create(AppModule);
    app.use(logger);
    await app.listen(3000);
    ```

!!! info

    访问全局中间件中的 DI 容器是不可能的。
    当使用 `app.use()` 时，你可以使用[功能中间件](middleware#functional-middleware)来代替。
    或者，你也可以使用一个类中间件，在 `AppModule` (或任何其他模块)中使用 `.forroutes('*')` 来使用它。
