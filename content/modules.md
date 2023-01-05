# 模块

模块是一个带有`@Module()`装饰器的类。
`@Module()`装饰器提供了元数据， **Nest** 利用这些元数据来组织应用程序结构。

<figure><img src="/assets/Modules_1.png" /></figure>

每个应用程序至少有一个模块，一个 **根模块** 。
根模块是 Nest 用来构建应用程序图的起点——Nest 用来解析模块和提供器关系和依赖关系的内部数据结构。
虽然非常小的应用程序理论上可能只有根模块，但这不是典型的情况。
我们要强调的是，强烈建议将模块作为组织组件的有效方式。
因此，对于大多数应用程序，最终的体系结构将使用多个模块，每个模块封装了一组密切相关的功能。

`@Module()`装饰器接受单个对象，其属性描述了该模块:

| 对象          | 描述                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `providers`   | 这些提供器将被 Nest 注入器实例化，并且至少可以在整个模块中共享                                                               |
| `controllers` | 在该模块中定义的必须实例化的控制器集                                                                                         |
| `imports`     | 导入此模块中所需的提供程序的导入模块列表                                                                                     |
| `exports`     | 由本模块提供的 `providers` 子集，应该在导入本模块的其他模块中可用。你可以使用提供器本身，也可以只使用它的令牌(`provider` 值) |

默认情况下，模块 **封装** 提供程序。
这意味着不可能注入既不直接属于当前模块也不从导入模块导出的提供器。
因此，您可以将模块中导出的提供器视为该模块的公共接口或 API。

## 功能模块

`CatsController`和`CatsService`属于同一个应用程序域。
因为它们是密切相关的，所以将它们移到特性模块中是有意义的。
特性模块只是组织与特定特性相关的代码，保持代码的组织和建立清晰的边界。
这有助于我们管理复杂性并使用[SOLID](https://en.wikipedia.org/wiki/SOLID)原则进行开发，特别是当应用程序和/或团队的规模增长时。

为了演示这一点，我们将创建`CatsModule`。

=== "cats/cats.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { CatsController } from './cats.controller';
    import { CatsService } from './cats.service';

    @Module({
      controllers: [CatsController],
      providers: [CatsService],
    })
    export class CatsModule {}
    ```

!!! info "要使用 CLI 创建模块，只需执行`$ nest g module cats`命令。"

上面，我们在`cats.module`中定义了`CatsModule`。并将与此模块相关的所有内容移到`cats`目录中。
我们需要做的最后一件事是将这个模块导入到根模块(`AppModule`，定义在`app.module.module`中。ts 文件)。

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { CatsModule } from './cats/cats.module';

    @Module({
      imports: [CatsModule],
    })
    export class AppModule {}
    ```

下面是我们现在的目录结构:

<div class="file-tree">
  <div class="item">src</div>
  <div class="children">
    <div class="item">cats</div>
    <div class="children">
      <div class="item">dto</div>
      <div class="children">
        <div class="item">create-cat.dto.ts</div>
      </div>
      <div class="item">interfaces</div>
      <div class="children">
        <div class="item">cat.interface.ts</div>
      </div>
      <div class="item">cats.controller.ts</div>
      <div class="item">cats.module.ts</div>
      <div class="item">cats.service.ts</div>
    </div>
    <div class="item">app.module.ts</div>
    <div class="item">main.ts</div>
  </div>
</div>

## 共享模块

在 Nest 中，模块默认情况下是 **单例** 的，因此你可以毫不费力地在多个模块之间共享任何提供器的同一个实例。

<figure><img src="/assets/Shared_Module_1.png" /></figure>

每个模块自动成为一个共享模块。
一旦创建，它就可以被任何模块重用。
让我们假设我们想要在几个其他模块之间共享`CatsService`的实例。
为了做到这一点，我们首先需要通过将`CatsService `provider 添加到模块的`exports`数组中来 **export** ，如下所示:

=== "cats.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { CatsController } from './cats.controller';
    import { CatsService } from './cats.service';

    @Module({
      controllers: [CatsController],
      providers: [CatsService],
      exports: [CatsService],
    })
    export class CatsModule {}
    ```

现在，任何导入`CatsModule`的模块都可以访问`CatsService`，并将与所有导入它的其他模块共享同一个实例。

## 模块再出口

如上所述，模块可以导出它们的内部提供程序。
此外，它们还可以重新导出所导入的模块。
在下面的例子中， `CommonModule` 被导入到 `CoreModule` 中， **也** 从 `CoreModule` 中导出，使得它可以被其他导入这个模块的模块使用。

```typescript
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

## 依赖注入

模块类也可以 **注入** 提供器(例如，用于配置目的):

=== "cats.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { CatsController } from './cats.controller';
    import { CatsService } from './cats.service';

    @Module({
      controllers: [CatsController],
      providers: [CatsService],
    })
    export class CatsModule {
      constructor(private catsService: CatsService) {}
    }
    ```

=== "cats.module.js"

    ```js
    import { Module, Dependencies } from '@nestjs/common';
    import { CatsController } from './cats.controller';
    import { CatsService } from './cats.service';

    @Module({
      controllers: [CatsController],
      providers: [CatsService],
    })
    @Dependencies(CatsService)
    export class CatsModule {
      constructor(catsService) {
        this.catsService = catsService;
      }
    }
    ```

然而，由于[circular dependency](/fundamentals/circular-dependency)，模块类本身不能作为提供器注入。

## 全局模块

如果您必须在所有地方导入相同的模块集，这可能会很乏味。
与 Nest 不同的是，[Angular](https://angular.io)`providers`是在全局作用域中注册的。
一旦定义，它们就无处不在。
然而，Nest 将提供程序封装在模块范围内。
如果不先导入封装模块，就不能在其他地方使用模块的提供器。

当你想要提供一组在任何地方都可以开箱即用的提供程序(例如，助手，数据库连接等)时，使用`@Global()`装饰器将模块设为 **global** 。

```typescript
import { Module, Global } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Global()
@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}
```

`@Global()`装饰器使模块成为全局作用域。
全局模块应该 **只注册一次** ，通常由根模块或核心模块注册。
在上面的例子中，`CatsService`提供器将是普遍存在的，希望注入该服务的模块将不需要在 imports 数组中导入`CatsModule`。

!!! info "全局化并不是一个好的设计决策。"

    全局模块可用来减少必要的样板文件的数量。
    `imports`数组通常是让消费者可以使用模块 API 的首选方式。

## 动态模块

Nest 模块系统包含一个强大的特性，称为动态模块。
这个特性使您能够轻松地创建可定制的模块，这些模块可以动态地注册和配置提供器。
动态模块在[这里](/fundamentals/dynamic-modules)有广泛的介绍。
在本章中，我们将简要概述以完成对模块的介绍。

下面是`DatabaseModule`的动态模块定义示例:

=== "TypeScript"

    ```ts
    import { Module, DynamicModule } from '@nestjs/common';
    import { createDatabaseProviders } from './database.providers';
    import { Connection } from './connection.provider';

    @Module({
      providers: [Connection],
    })
    export class DatabaseModule {
      static forRoot(entities = [], options?): DynamicModule {
        const providers = createDatabaseProviders(options, entities);
        return {
          module: DatabaseModule,
          providers: providers,
          exports: providers,
        };
      }
    }
    ```

=== "JavaScript"

    ```js
    import { Module } from '@nestjs/common';
    import { createDatabaseProviders } from './database.providers';
    import { Connection } from './connection.provider';

    @Module({
      providers: [Connection],
    })
    export class DatabaseModule {
      static forRoot(entities = [], options?) {
        const providers = createDatabaseProviders(options, entities);
        return {
          module: DatabaseModule,
          providers: providers,
          exports: providers,
        };
      }
    }
    ```

!!! info "`forRoot()`方法可以同步或异步地返回一个动态模块(例如，通过`Promise`)。"

该模块默认定义了`Connection`提供程序(在`@Module()`装饰器元数据中)，但另外-取决于传递给`forRoot()`方法的`entities`和`options`对象-公开了一个提供程序集合，例如，存储库。
请注意，动态模块 **返回的属性扩展** (而不是覆盖)在`@Module()`装饰器中定义的基本模块元数据。
这就是如何从模块中导出静态声明的`Connection`提供程序 **和动态生成的存储库提供程序** 的。

如果你想在全局作用域中注册一个动态模块，将`global`属性设置为`true`。

```typescript
{
  global: true,
  module: DatabaseModule,
  providers: providers,
  exports: providers,
}
```

!!! warning "就像前面提到的，将所有内容都设置为全局并不是一个好的设计决策。"

`DatabaseModule`可以通过以下方式导入和配置:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule.forRoot([User])],
})
export class AppModule {}
```

如果你想重新导出一个动态模块，你可以省略 exports 数组中的`forRoot()`方法调用:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule.forRoot([User])],
  exports: [DatabaseModule],
})
export class AppModule {}
```

[动态模块](./fundamentals/dynamic-modules.md)一章更详细地介绍了这个主题，并包括了一个[工作示例][example]。

[example]: https://github.com/nestjs/nest/tree/master/sample/25-dynamic-modules
