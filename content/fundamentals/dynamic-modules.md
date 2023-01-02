---
tags:
  - 动态模块
---

# 动态模块

[模块章节](/modules)涵盖了 Nest 模块的基础知识，并包含了[动态模块](https://docs.nestjs.com/modules#dynamic-modules)的简要介绍。
本章扩展了动态模块的主题。
完成后，您应该很好地掌握它们是什么，以及如何和何时使用它们。

## 介绍

文档的 **概述** 部分中的大多数应用程序代码示例使用常规或静态模块。
模块定义了一组组件，比如[providers](/providers)和[controllers](/controllers)，它们作为整体应用程序的模块化部分组合在一起。
它们为这些组件提供了执行上下文或范围。
例如，模块中定义的提供程序对模块的其他成员可见，而不需要导出它们。
当一个提供器需要在模块外部可见时，它首先从它的宿主模块导出，然后导入到它的消费模块。

让我们来看一个熟悉的例子。

首先，我们将定义一个`UsersModule`来提供和导出`UsersService`。
`UsersModule`是`UsersService`的宿主模块。

```typescript linenums="1" hl_lines="5 6 8"
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

接下来，我们将定义一个`AuthModule`，它将导入`UsersModule`，使`UsersModule`导出的提供器在`AuthModule`中可用:

```typescript linenums="1" hl_lines="6 10"
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

这些结构允许我们注入`UsersService`到`AuthService`中，例如，托管在`AuthModule`中的`AuthService`:

```typescript linenums="1" hl_lines="6"
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}
  /*
    Implementation that makes use of this.usersService
  */
}
```

我们将其称为 **静态** 模块绑定。
Nest 连接模块所需的所有信息都已经在宿主模块和消费模块中声明。
让我们来了解一下这个过程中发生了什么。
Nest 通过以下方式使`UsersService`在`AuthModule`中可用:

1. 实例化`UsersModule`，包括传递性地导入`UsersModule`本身使用的其他模块，并传递性地解析任何依赖关系 (查看[自定义提供器](https://docs.nestjs.com/fundamentals/custom-providers)).
2. 实例化`AuthModule`，并使`UsersModule`导出的提供器对`AuthModule`中的组件可用(就像它们已经在`AuthModule`中声明过一样).
3. 在 AuthService 中注入一个`UsersService`的实例。

## 动态模块用例

使用静态模块绑定，消费模块没有机会 **影响** 如何配置来自宿主模块的提供器。
为什么这很重要?考虑这样一种情况:我们有一个通用模块，它需要在不同的用例中表现不同。
这类似于许多系统中的`插件`概念，在这些系统中，通用功能在供使用者使用之前需要进行一些配置。

使用 Nest 的一个很好的例子是 **配置模块** 。
许多应用程序发现，通过使用配置模块外部化配置细节非常有用。
这使得在不同的部署中动态更改应用程序设置变得很容易:例如，开发人员的开发数据库，staging/testing 环境的 staging 数据库，等等。
通过将配置参数的管理委托给配置模块，应用程序源代码可以独立于配置参数。

挑战在于配置模块本身，因为它是通用的(类似于`插件`)，需要由它的消费模块进行定制。
这就是 _动态模块_ 发挥作用的地方。
使用动态模块特性，我们可以使配置模块 **动态** ，以便消费模块可以使用 API 来控制在导入配置模块时如何定制配置模块。

换句话说，动态模块提供了一个 API，用于将一个模块导入到另一个模块，并在导入时定制该模块的属性和行为，而不是使用我们目前看到的静态绑定。

## 配置模块的例子

在本节中，我们将使用[配置章](../techniques/configuration.md#service)中的示例代码的基本版本。
本章末尾的完整版本可以在这里找到[示例](https://github.com/nestjs/nest/tree/master/sample/25-dynamic-modules)。

我们的要求是让`ConfigModule`接受一个`options`对象来定制它。
这是我们想要支持的特性。
基本示例将`.env`文件的位置硬编码为在项目根文件夹中。
让我们假设我们想让它是可配置的，这样你就可以在你选择的任何文件夹中管理你的`.env`文件。
例如，假设你想要将各种`.env`文件存储在项目根目录`config`下的一个文件夹中(也就是`src`的同级文件夹)。
当在不同的项目中使用`ConfigModule`时，你希望能够选择不同的文件夹。

动态模块使我们能够向被导入的模块传递参数，这样我们就可以更改它的行为。
让我们看看它是如何工作的。
如果我们从最终目标(从消费模块的角度看这可能是什么样子)开始，然后往回看，这是很有帮助的。
首先，让我们快速回顾一下 _静态_ 导入`ConfigModule`的例子(即，一种无法影响被导入模块行为的方法)。
请密切关注`@Module()`装饰器中的`imports`数组:

```typescript linenums="1" hl_lines="7"
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

让我们考虑一下 _动态模块_ 导入是什么样子的，其中我们传递了一个配置对象。
比较这两个例子中的 `imports` 数组的区别:

```typescript linenums="1" hl_lines="7"
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule.register({ folder: './config`})],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

让我们看看在上面的动态例子中发生了什么。
什么是活动部件?

1. `ConfigModule`是一个普通的类，所以我们可以推断它必须有一个名为`register()`的静态方法。
   我们知道它是静态的，因为我们在`ConfigModule`类上调用它，而不是在类的 **实例** 上。
   注意:这个方法，我们很快就会创建，可以有任意的名字，但是按照惯例我们应该叫它`forRoot()`或者`register()`。
2. `register()`方法是由我们定义的，所以我们可以接受任何我们喜欢的输入参数。
   在本例中，我们将接受一个具有合适属性的简单`options`对象，这是典型的情况。
3. 我们可以推断`register()`方法必须返回类似于`module`的东西，因为它的返回值出现在我们熟悉的`imports`列表中，到目前为止，我们已经看到它包含了一个模块列表。

事实上，我们的`register()`方法将返回一个`DynamicModule`。
动态模块只不过是在运行时创建的模块，具有与静态模块完全相同的属性，外加一个名为`module`的额外属性。
让我们快速浏览一个静态模块声明示例，密切关注传递给装饰器的模块选项:

```typescript linenums="1" hl_lines="2"
@Module({
  imports: [DogsModule],
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService]
})
```

动态模块必须返回一个具有完全相同接口的对象，外加一个名为`module`的附加属性。
`module`属性用作模块的名称，并且应该与模块的类名相同，如下面的例子所示。

!!! info "对于一个动态模块，模块选项对象的所有属性都是可选的 **除了** ` module`。"

那么静态的 `register()` 方法呢?
我们现在可以看到它的工作是返回一个具有`DynamicModule`接口的对象。
当我们调用它时，我们有效地向`imports`列表提供了一个模块，类似于我们在静态情况下通过列出模块类名来实现的方式。
换句话说，动态模块 API 只是返回一个模块，但我们没有在`@Module`装饰器中修复属性，而是通过编程方式指定它们。

为了使图片更完整，还需要涉及一些细节:

1. 我们现在可以声明`@Module()`装饰器的`imports`属性不仅可以接受一个模块类名(例如 `imports:[UsersModule]` )，还可以接受一个函数 **返回** 一个动态模块(例如`imports:[ConfigModule.register(…)]`)。
2. 动态模块本身可以导入其他模块。
   本例中我们不会这样做，但如果动态模块依赖于其他模块的提供程序，你可以使用可选的`imports`属性来导入它们。
   同样，这与使用`@Module()`装饰器为静态模块声明元数据的方式完全相似。

有了这样的理解，我们现在可以看看我们的动态`ConfigModule`声明必须是什么样的。
让我们试一试。

```typescript linenums="1" hl_lines="6 7 8 9 10 11 12"
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  static register(): DynamicModule {
    return {
      module: ConfigModule,
      providers: [ConfigService],
      exports: [ConfigService],
    };
  }
}
```

现在应该很清楚各个部分是如何联系在一起的。
调用`ConfigModule.register(…)`将返回一个`DynamicModule`对象，其属性与我们通过`@Module()`装饰器提供的元数据本质上相同。

!!! info "`DynamicModule`从`@nestjs/common`导入。"

我们的动态模块还不是很有趣，但是，因为我们还没有引入任何功能来 **配置** 它，就像我们说过的那样。
让我们接下来讨论这个问题。

## 模块配置

定制`ConfigModule`行为的明显解决方案是在静态`register()`方法中向它传递一个`options`对象，正如我们上面所猜测的那样。
让我们再来看看我们消费模块的`imports`属性:

```typescript linenums="1" hl_lines="7"
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule.register({ folder: './config' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

这样就很好地处理了向动态模块传递`options`对象的问题。
那么我们如何使用 ConfigModule 中的 options 对象呢?让我们考虑一下。
我们知道我们的`ConfigModule`基本上是一个宿主，用于提供和导出一个可注入的服务 -`ConfigService`- 供其他提供器使用。
实际上我们的`ConfigService`需要读取`options`对象来定制其行为。
让我们假设现在我们知道如何从`register()`方法中获取`options`到`ConfigService`。
有了这个假设，我们可以对服务做一些更改，根据`options`对象的属性定制其行为。

!!! Note "目前，由于我们还 _没有_ 确定如何传递它，我们将只硬编码`options`。我们马上就会解决这个问题)."

```typescript linenums="1" hl_lines="3 4"
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { EnvConfig } from './interfaces';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor() {
    const options = { folder: './config' };

    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```

现在我们的`ConfigService`知道如何在`options`中指定的文件夹中找到`.env`文件。

我们剩下的任务是将`register()`步骤中的`options`对象注入到`ConfigService`中。
当然，我们将使用 _依赖注入_ 来实现它。
这是一个关键点，所以确保你理解它。
我们的`ConfigModule`提供了`ConfigService`。
`ConfigService`反过来依赖于`options`对象，该对象只在运行时提供。
因此，在运行时，我们需要首先将`options`对象绑定到 Nest IoC 容器，然后让 Nest 将其注入到我们的`ConfigService`中。
记住，在 **定制的提供器** 一章中，providers 可以[包括任何值](https://docs.nestjs.com/fundamentals/custom-providers#non-service-based-providers)，而不仅仅是服务，所以我们可以使用依赖注入来处理一个简单的`options`对象。

让我们首先处理将选项对象绑定到 IoC 容器的问题。
我们在静态的`register()`方法中执行此操作。
请记住，我们正在动态地构建一个模块，模块的属性之一是它的提供程序列表。
因此，我们需要做的是将选项对象定义为提供程序。
这将使它可注入到`ConfigService`中，我们将在下一步中利用这一点。
在下面的代码中，注意`providers`数组:

```typescript linenums="1" hl_lines="9 10 11 12 13 14 15"
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Module({})
export class ConfigModule {
  static register(options): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}
```

现在我们可以通过将`CONFIG_OPTIONS`提供器注入到`ConfigService`中来完成这个过程。
回想一下，当我们使用非类令牌定义提供器时，我们需要使用`@Inject()`装饰器[如此处所述](https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens)。

```typescript linenums="1" hl_lines="10"
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Injectable, Inject } from '@nestjs/common';
import { EnvConfig } from './interfaces';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;

  constructor(@Inject('CONFIG_OPTIONS') private options) {
    const filePath = `${process.env.NODE_ENV || 'development'}.env`;
    const envFile = path.resolve(__dirname, '../../', options.folder, filePath);
    this.envConfig = dotenv.parse(fs.readFileSync(envFile));
  }

  get(key: string): string {
    return this.envConfig[key];
  }
}
```

最后一点注意:为了简单起见，我们使用了上面基于字符串的注入令牌(`CONFIG_OPTIONS`)，但最佳实践是在单独的文件中将其定义为常量(或`Symbol`)，然后导入该文件。
例如:

```typescript linenums="1" hl_lines="1"
export const CONFIG_OPTIONS = 'CONFIG_OPTIONS';
```

## 例子

本章中完整的代码示例可以在[此处](https://github.com/nestjs/nest/tree/master/sample/25-dynamic-modules)找到.
