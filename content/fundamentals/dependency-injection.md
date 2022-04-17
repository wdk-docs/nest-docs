### 定制的提供器

在前面的章节中，我们谈到了**依赖注入(DI)**的各个方面，以及它在 Nest 中是如何使用的。
其中一个例子就是[基于构造函数](https://docs.nestjs.com/providers#dependency-injection)依赖注入，它将实例(通常是服务提供器)注入到类中。
你不会惊讶于依赖注入以一种基本的方式内置到 Nest 核心中。
到目前为止，我们只研究了一个主要模式。
随着应用程序变得越来越复杂，您可能需要利用 DI 系统的全部特性，因此让我们更详细地研究它们。

#### DI 基本面

依赖注入是一种[控制反转(IoC)](https://en.wikipedia.org/wiki/Inversion_of_control)技术，在这种技术中，你将依赖的实例化委托给 IoC 容器(在我们的例子中，是 NestJS 运行时系统)，而不是在你自己的代码中执行。
让我们来看看[Providers 章节](https://docs.nestjs.com/providers)中的这个例子中发生了什么。

首先，我们定义一个提供器。
' @Injectable() '装饰器将' CatsService '类标记为提供器。

```typescript
@@filename(cats.service)
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  findAll(): Cat[] {
    return this.cats;
  }
}
@@switch
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  constructor() {
    this.cats = [];
  }

  findAll() {
    return this.cats;
  }
}
```

然后我们请求 Nest 将该提供器注入到我们的控制器类中:

```typescript
@@filename(cats.controller)
import { Controller, Get } from '@nestjs/common';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
@@switch
import { Controller, Get, Bind, Dependencies } from '@nestjs/common';
import { CatsService } from './cats.service';

@Controller('cats')
@Dependencies(CatsService)
export class CatsController {
  constructor(catsService) {
    this.catsService = catsService;
  }

  @Get()
  async findAll() {
    return this.catsService.findAll();
  }
}
```

最后，我们向 Nest IoC 容器注册该提供器:

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';
import { CatsService } from './cats/cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class AppModule {}
```

到底是什么让这一切发生的?在这个过程中有三个关键步骤:

1.  在“cat.sservice.ts”中，“@Injectable()”装饰器将“CatsService”类声明为一个可以被 Nest IoC 容器管理的类。
2.  在' cat.scontroller.ts '中，' CatsController '通过构造函数注入声明了对' CatsService '令牌的依赖:

    ```typescript
      constructor(private catsService: CatsService)
    ```

3.  在“app.module.ts”中，我们将令牌“CatsService”与“cat.sservice.ts”文件中的类“CatsService”关联起来。
    下面我们将确切地[看到](/fundamentals/custom-providers#standard-providers)这个关联(也称为*registration*)是如何发生的。

当 Nest IoC 容器实例化一个“CatsController”时，它首先查找任何依赖项。
当它找到' CatsService '依赖项时，它对' CatsService '令牌执行查找，该令牌返回' CatsService '类，每一个注册步骤(上面的第 3 条)。
假设为' SINGLETON '范围(默认行为)，Nest 将创建一个' CatsService '的实例，缓存它，然后返回它，或者如果一个已经被缓存，返回现有的实例。

为了说明这一点，这个解释有点简化了。
我们忽略的一个重要方面是，分析依赖关系的代码的过程非常复杂，并且发生在应用程序引导期间。
一个关键特性是依赖关系分析(或“创建依赖关系图”)是可传递的。
在上面的例子中，如果' CatsService '本身有依赖项，这些依赖项也会被解析。
依赖关系图确保依赖关系按照正确的顺序解析——本质上是“自底向上”。
这种机制使开发人员不必管理如此复杂的依赖关系图。

#### 标准的提供器

Let's take a closer look at the `@Module()` decorator.
In `app.module`, we declare:

```typescript
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
```

The `providers` property takes an array of `providers`.
So far, we've supplied those providers via a list of class names.
In fact, the syntax `providers: [CatsService]` is short-hand for the more complete syntax:

```typescript
providers: [
  {
    provide: CatsService,
    useClass: CatsService,
  },
];
```

Now that we see this explicit construction, we can understand the registration process.
Here, we are clearly associating the token `CatsService` with the class `CatsService`.
The short-hand notation is merely a convenience to simplify the most common use-case, where the token is used to request an instance of a class by the same name.

#### 定制的提供器

What happens when your requirements go beyond those offered by _Standard providers_? Here are a few examples:

- You want to create a custom instance instead of having Nest instantiate (or return a cached instance of) a class
- You want to re-use an existing class in a second dependency
- You want to override a class with a mock version for testing

Nest allows you to define Custom providers to handle these cases.
It provides several ways to define custom providers.
Let's walk through them.

> info **Hint** If you are having problems with dependency resolution you can set the `NEST_DEBUG` environment variable and get extra dependency resolution logs during startup.

#### 值提供器: `useValue`

The `useValue` syntax is useful for injecting a constant value, putting an external library into the Nest container, or replacing a real implementation with a mock object.
Let's say you'd like to force Nest to use a mock `CatsService` for testing purposes.

```typescript
import { CatsService } from './cats.service';

const mockCatsService = {
  /* mock implementation
  ...
  */
};

@Module({
  imports: [CatsModule],
  providers: [
    {
      provide: CatsService,
      useValue: mockCatsService,
    },
  ],
})
export class AppModule {}
```

In this example, the `CatsService` token will resolve to the `mockCatsService` mock object.
`useValue` requires a value - in this case a literal object that has the same interface as the `CatsService` class it is replacing.
Because of TypeScript's [structural typing](https://www.typescriptlang.org/docs/handbook/type-compatibility.html), you can use any object that has a compatible interface, including a literal object or a class instance instantiated with `new`.

#### 非基于类的提供器令牌

So far, we've used class names as our provider tokens (the value of the `provide` property in a provider listed in the `providers` array).
This is matched by the standard pattern used with [constructor based injection](https://docs.nestjs.com/providers#dependency-injection), where the token is also a class name.
(Refer back to <a href="/fundamentals/custom-providers#di-fundamentals">DI Fundamentals</a> for a refresher on tokens if this concept isn't entirely clear).
Sometimes, we may want the flexibility to use strings or symbols as the DI token.
For example:

```typescript
import { connection } from './connection';

@Module({
  providers: [
    {
      provide: 'CONNECTION',
      useValue: connection,
    },
  ],
})
export class AppModule {}
```

In this example, we are associating a string-valued token (`'CONNECTION'`) with a pre-existing `connection` object we've imported from an external file.

> warning **Notice** In addition to using strings as token values, you can also use JavaScript [symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol) or TypeScript [enums](https://www.typescriptlang.org/docs/handbook/enums.html).

We've previously seen how to inject a provider using the standard [constructor based injection](https://docs.nestjs.com/providers#dependency-injection) pattern.
This pattern **requires** that the dependency be declared with a class name.
The `'CONNECTION'` custom provider uses a string-valued token.
Let's see how to inject such a provider.
To do so, we use the `@Inject()` decorator.
This decorator takes a single argument - the token.

```typescript
@@filename()
@Injectable()
export class CatsRepository {
  constructor(@Inject('CONNECTION') connection: Connection) {}
}
@@switch
@Injectable()
@Dependencies('CONNECTION')
export class CatsRepository {
  constructor(connection) {}
}
```

> info **Hint** The `@Inject()` decorator is imported from `@nestjs/common` package.

While we directly use the string `'CONNECTION'` in the above examples for illustration purposes, for clean code organization, it's best practice to define tokens in a separate file, such as `constants.ts`.
Treat them much as you would symbols or enums that are defined in their own file and imported where needed.

#### 类提供器: `useClass`

The `useClass` syntax allows you to dynamically determine a class that a token should resolve to.
For example, suppose we have an abstract (or default) `ConfigService` class.
Depending on the current environment, we want Nest to provide a different implementation of the configuration service.
The following code implements such a strategy.

```typescript
const configServiceProvider = {
  provide: ConfigService,
  useClass:
    process.env.NODE_ENV === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}
```

Let's look at a couple of details in this code sample.
You'll notice that we define `configServiceProvider` with a literal object first, then pass it in the module decorator's `providers` property.
This is just a bit of code organization, but is functionally equivalent to the examples we've used thus far in this chapter.

Also, we have used the `ConfigService` class name as our token.
For any class that depends on `ConfigService`, Nest will inject an instance of the provided class (`DevelopmentConfigService` or `ProductionConfigService`) overriding any default implementation that may have been declared elsewhere (e.g., a `ConfigService` declared with an `@Injectable()` decorator).

#### 工厂的提供器: `useFactory`

The `useFactory` syntax allows for creating providers **dynamically**.
The actual provider will be supplied by the value returned from a factory function.
The factory function can be as simple or complex as needed.
A simple factory may not depend on any other providers.
A more complex factory can itself inject other providers it needs to compute its result.
For the latter case, the factory provider syntax has a pair of related mechanisms:

1.  The factory function can accept (optional) arguments.
2.  The (optional) `inject` property accepts an array of providers that Nest will resolve and pass as arguments to the factory function during the instantiation process.
    The two lists should be correlated: Nest will pass instances from the `inject` list as arguments to the factory function in the same order.

The example below demonstrates this.

```typescript
@@filename()
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
})
export class AppModule {}
@@switch
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
})
export class AppModule {}
```

#### 别名提供器: `useExisting`

The `useExisting` syntax allows you to create aliases for existing providers.
This creates two ways to access the same provider.
In the example below, the (string-based) token `'AliasedLoggerService'` is an alias for the (class-based) token `LoggerService`.
Assume we have two different dependencies, one for `'AliasedLoggerService'` and one for `LoggerService`.
If both dependencies are specified with `SINGLETON` scope, they'll both resolve to the same instance.

```typescript
@Injectable()
class LoggerService {
  /* implementation details */
}

const loggerAliasProvider = {
  provide: 'AliasedLoggerService',
  useExisting: LoggerService,
};

@Module({
  providers: [LoggerService, loggerAliasProvider],
})
export class AppModule {}
```

#### 非服务提供器

While providers often supply services, they are not limited to that usage.
A provider can supply **any** value.
For example, a provider may supply an array of configuration objects based on the current environment, as shown below:

```typescript
const configFactory = {
  provide: 'CONFIG',
  useFactory: () => {
    return process.env.NODE_ENV === 'development' ? devConfig : prodConfig;
  },
};

@Module({
  providers: [configFactory],
})
export class AppModule {}
```

#### 导出自定义服务提供器程序

Like any provider, a custom provider is scoped to its declaring module.
To make it visible to other modules, it must be exported.
To export a custom provider, we can either use its token or the full provider object.

The following example shows exporting using the token:

```typescript
@@filename()
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: ['CONNECTION'],
})
export class AppModule {}
@@switch
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: ['CONNECTION'],
})
export class AppModule {}
```

Alternatively, export with the full provider object:

```typescript
@@filename()
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: [connectionFactory],
})
export class AppModule {}
@@switch
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
  exports: [connectionFactory],
})
export class AppModule {}
```
