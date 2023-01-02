# 自定义提供器

在前面的章节中，我们谈到了 **依赖注入(DI)** 的各个方面，以及它在 Nest 中是如何使用的。
其中一个例子就是[基于构造函数](https://docs.nestjs.com/providers#dependency-injection)依赖注入，它将实例(通常是服务提供器)注入到类中。
你不会惊讶于依赖注入以一种基本的方式内置到 Nest 核心中。
到目前为止，我们只研究了一个主要模式。
随着应用程序变得越来越复杂，您可能需要利用 DI 系统的全部特性，因此让我们更详细地研究它们。

## DI 基本面

依赖注入是一种[控制反转(IoC)](https://en.wikipedia.org/wiki/Inversion_of_control)技术，在这种技术中，你将依赖的实例化委托给 IoC 容器(在我们的例子中，是 NestJS 运行时系统)，而不是在你自己的代码中执行。
让我们来看看[Providers 章节](https://docs.nestjs.com/providers)中的这个例子中发生了什么。

首先，我们定义一个提供器。
`@Injectable()` 装饰器将 `CatsService` 类标记为提供器。

=== "cats.service.ts"

    ```typescript linenums="1" hl_lines="4 5"
    import { Injectable } from '@nestjs/common';
    import { Cat } from './interfaces/cat.interface';

    @Injectable()
    export class CatsService {
      private readonly cats: Cat[] = [];

      findAll(): Cat[] {
        return this.cats;
      }
    }
    ```

=== "cats.service.js"

    ```js linenums="1" hl_lines="3 4"
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

=== "cats.controller.ts"

    ```typescript linenums="1" hl_lines="7"
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
    ```

=== "cats.controller.js"

    ```js  linenums="1" hl_lines="5 7 8 9"
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

```typescript title="app.module"  linenums="1" hl_lines="3 7"
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

1.  在`cat.sservice.ts`中，`@Injectable()`装饰器将`CatsService`类声明为一个可以被 Nest IoC 容器管理的类。
2.  在 `cat.scontroller.ts` 中， `CatsController` 通过构造函数注入声明了对 `CatsService` 令牌的依赖:

    ```typescript linenums="1" hl_lines="1"
      constructor(private catsService: CatsService)
    ```

3.  在`app.module.ts`中，我们将令牌`CatsService`与`cat.sservice.ts`文件中的类`CatsService`关联起来。
    下面我们将确切地[看到](/fundamentals/custom-providers#standard-providers)这个关联(也称为 _登记_)是如何发生的。

当 Nest IoC 容器实例化一个`CatsController`时，它首先查找任何依赖项。
当它找到 `CatsService` 依赖项时，它对 `CatsService` 令牌执行查找，该令牌返回 `CatsService` 类，每一个注册步骤(上面的第 3 条)。
假设为 `单件模式` 范围(默认行为)，Nest 将创建一个 `CatsService` 的实例，缓存它，然后返回它，或者如果一个已经被缓存，返回现有的实例。

为了说明这一点，这个解释有点简化了。
我们忽略的一个重要方面是，分析依赖关系的代码的过程非常复杂，并且发生在应用程序引导期间。
一个关键特性是依赖关系分析(或`创建依赖关系图`)是可传递的。
在上面的例子中，如果 `CatsService` 本身有依赖项，这些依赖项也会被解析。
依赖关系图确保依赖关系按照正确的顺序解析——本质上是`自底向上`。
这种机制使开发人员不必管理如此复杂的依赖关系图。

## 标准的提供器

让我们仔细看看`@Module()`装饰器。
在`app.module`,中，我们声明:

```typescript linenums="1"
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
```

`providers`属性采用了一系列`providers`。
到目前为止，我们已经通过类名列表提供了这些提供器。
事实上，语法`providers: [CatsService]`是更完整语法的简写:

```typescript linenums="1"
providers: [
  {
    provide: CatsService,
    useClass: CatsService,
  },
];
```

现在我们看到了这种明确的构造，我们可以了解注册过程。
这里，我们明确地将令牌`CatsService`与类`CatsService`关联起来。
短表示法只是简化最常见的用例的便利性，在该案例中，令牌用于以同一名称要求类实例。

## 定制的提供器

当您的要求超出 _标准提供器_ 提供的要求时会发生什么？这里有一些例子：

- 您要创建一个自定义实例，而不是让 NEST 实例化（或返回一个缓存的实例）类
- 您想在第二个依赖项中重复使用现有类
- 您想覆盖一个带有模拟版本的课程

NEST 允许您定义自定义提供器来处理这些情况。
它提供了几种定义自定义提供器的方法。
让我们走过他们。

!!! info "**Hint**"

    如果你在解决依赖关系时遇到问题，你可以设置`NEST_DEBUG`环境变量，在启动时获得额外的依赖关系解决日志。

## 值提供器: `useValue`

`useValue` 语法在注入常量值、将外部库放入 Nest 容器或用模拟对象替换实际实现时非常有用。
假设你想强迫 Nest 使用一个模拟的`CatsService`来进行测试。

```typescript linenums="1" hl_lines="13 14"
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

在本例中，`CatsService`令牌将解析为`mockCatsService`模拟对象。
`useValue`需要一个值-在这种情况下，一个文字对象具有与它正在替换的`CatsService`类相同的接口。
由于 TypeScript 的[结构类型](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)，你可以使用任何具有兼容接口的对象，包括文字对象或用`new`实例化的类实例。

## 非基于类的提供器令牌

到目前为止，我们使用类名作为我们的提供器令牌(在`providers`数组中列出的提供器`provider`属性的值)。
这与[基于构造函数的注入](https://docs.nestjs.com/providers#dependency-injection)使用的标准模式相匹配，其中令牌也是一个类名。
(如果这个概念不完全清楚，可以参考[DI fundamentals](/fundamentals/custom-providers#di-fundamentals)来复习标记)。
有时，我们可能希望灵活地使用字符串或符号作为 DI 令牌。
例如:

```typescript linenums="1" hl_lines="6 7"
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

在这个例子中，我们将一个字符串值的令牌(`'CONNECTION'`)与我们从外部文件导入的一个预先存在的`connection`对象相关联。

!!! warning "**Notice**"

    除了使用字符串作为标记值，你还可以使用JavaScript [symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)或TypeScript [enums](https://www.typescriptlang.org/docs/handbook/enums.html)。

我们之前已经了解了如何使用标准的[基于构造函数的注入](https://docs.nestjs.com/providers#dependency-injection)模式注入提供程序。

此模式要求使用类名声明依赖项。
`'CONNECTION'`自定义提供程序使用字符串值令牌。
让我们看看如何注入这样一个提供程序。
为此，我们使用`@Inject()`装饰器。
这个装饰器只有一个参数 - 令牌。

=== "TypeScript"

    ```typescript linenums="1" hl_lines="1 3"
    @Injectable()
    export class CatsRepository {
      constructor(@Inject('CONNECTION') connection: Connection) {}
    }
    ```

=== "JavaScript"

    ```js  linenums="1" hl_lines="1 2 4"
    @Injectable()
    @Dependencies('CONNECTION')
    export class CatsRepository {
      constructor(connection) {}
    }
    ```

!!! info "**Hint**"

    `@Inject()`装饰器是从`@nestjs/common`包中导入的。

虽然我们在上面的例子中直接使用字符串`'CONNECTION'` 来进行演示，但为了组织干净的代码，最好在单独的文件中定义令牌，例如`constants.ts`。
对待它们就像对待在自己的文件中定义并在需要时导入的符号或枚举一样。

## 类提供器: `useClass`

`useClass`语法允许您动态地确定一个令牌应该解析到的类。
例如，假设我们有一个抽象(或默认)`ConfigService`类。
根据当前环境的不同，我们希望 Nest 提供配置服务的不同实现。
下面的代码实现了这样的策略。

```typescript linenums="1" hl_lines="3 4 5 6"
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

让我们看看这个代码示例中的一些细节。
你会注意到我们先用一个文字对象定义`configServiceProvider`，然后将它传递到模块装饰器的`providers`属性中。
这只是一些代码组织，但在功能上与本章迄今为止使用的示例相当。

同样，我们使用了`ConfigService`类名作为我们的令牌。
对于任何依赖于`ConfigService`的类，Nest 将注入一个所提供类的实例(`DevelopmentConfigService`或`ProductionConfigService`)，覆盖任何可能在其他地方声明的默认实现(例如，`ConfigService`声明了一个`@Injectable()`装饰器)。

## 工厂的提供器: `useFactory`

`useFactory`语法允许*动态*地创建提供器。
实际的提供程序将由工厂函数返回的值提供。
工厂功能可以根据需要简单或复杂。
简单工厂可能不依赖于任何其他提供器。
一个更复杂的工厂可以自己注入它需要的其他提供器来计算它的结果。
对于后一种情况，工厂提供程序语法有一对相关的机制:

1.  工厂函数可以接受(可选的)参数。
2.  (可选)`inject`属性接受一个提供程序数组，Nest 将在实例化过程中解析并将其作为参数传递给工厂函数。
    这两个列表应该是相关的:Nest 将以相同的顺序将`inject`列表中的实例作为参数传递给工厂函数。

下面的示例演示了这一点。

=== "TypeScript"

    ```typescript title=""  linenums="1" hl_lines="3 4 5 6"
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
    ```

=== "JavaScript"

    ```js title=""  linenums="1" hl_lines="3 4 5 6"
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

## 别名提供器: `useExisting`

`useExisting`语法允许您为现有的提供程序创建别名。
这就创建了两种访问同一提供程序的方法。
在下面的例子中，(基于字符串的)令牌`'AliasedLoggerService'`是(基于类的)令牌`LoggerService`的别名。
假设我们有两个不同的依赖项，一个用于`'AliasedLoggerService'`，另一个用于`LoggerService`。
如果这两个依赖都指定为 `SINGLETON` 作用域，它们将解析到同一个实例。

```typescript linenums="1" hl_lines="6 7 8 9"
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

## 非服务提供器

虽然提供器经常提供服务，但它们并不局限于这种用途。
提供器可以提供 **任意** 值。
例如，提供器可以根据当前环境提供一个配置对象数组，如下所示:

```typescript linenums="1" hl_lines="4"
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

## 导出自定义服务提供器程序

与任何提供程序一样，自定义提供程序的作用域仅限于其声明模块。
为了使它对其他模块可见，必须导出它。
要导出自定义提供程序，可以使用它的令牌或完整的提供程序对象。

下面的例子展示了使用令牌进行导出:

=== "TypeScript"

    ```typescript title=""  linenums="1" hl_lines="12"
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
    ```

=== "JavaScript"

    ```js title=""  linenums="1" hl_lines="12"
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

或者，使用完整的 provider 对象导出:

=== "TypeScript"

    ```typescript title=""  linenums="1" hl_lines="12"
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
    ```

=== "JavaScript"

    ```js title=""  linenums="1" hl_lines="12"
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
