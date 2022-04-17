### 提供器

提供器是 Nest 的一个基本概念。
许多基本的 Nest 类都可以被视为提供器—服务、存储库、工厂、助手等等。
提供器的主要思想是，它可以作为依赖**注入**;
这意味着对象之间可以创建各种关系，`连接`对象实例的功能可以在很大程度上委托给 Nest 运行时系统。

<figure><img src="/assets/Components_1.png" /></figure>

在前一章中，我们构建了一个简单的`CatsController`。
控制器应该处理 HTTP 请求，并将更复杂的任务委托给**提供器**。
提供器是在[module](/modules)中声明为`Providers`的普通 JavaScript 类。

> info **Hint** 由于 Nest 能够以更面向对象的方式设计和组织依赖，我们强烈建议遵循[SOLID](<https://zh.wikipedia.org/wiki/SOLID_(%E9%9D%A2%E5%90%91%E5%AF%B9%E8%B1%A1%E8%AE%BE%E8%AE%A1)>)原则。

#### 服务

让我们从创建一个简单的`CatsService`开始。
该服务将负责数据存储和检索，并被设计为由`CatsController`使用，因此将其定义为提供器是一个很好的候选对象。

```typescript
@@filename(cats.service)
import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';

@Injectable()
export class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat) {
    this.cats.push(cat);
  }

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

  create(cat) {
    this.cats.push(cat);
  }

  findAll() {
    return this.cats;
  }
}
```

> info **Hint** 要使用 CLI 创建服务，只需执行`$ nest g service cats`命令。

我们的`CatsService`是一个有一个属性和两个方法的基本类。
唯一的新特性是它使用了@Injectable()装饰器。
`@Injectable()`装饰器附加元数据，它声明`CatsService`是一个可以由 Nest IoC 容器管理的类。
顺便说一下，这个例子也使用了`Cat`接口，大概是这样的:

```typescript
@@filename(interfaces/cat.interface)
export interface Cat {
  name: string;
  age: number;
  breed: string;
}
```

现在我们有了一个服务类来检索 cats，让我们在`CatsController`中使用它:

```typescript
@@filename(cats.controller)
import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }
}
@@switch
import { Controller, Get, Post, Body, Bind, Dependencies } from '@nestjs/common';
import { CatsService } from './cats.service';

@Controller('cats')
@Dependencies(CatsService)
export class CatsController {
  constructor(catsService) {
    this.catsService = catsService;
  }

  @Post()
  @Bind(Body())
  async create(createCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll() {
    return this.catsService.findAll();
  }
}
```

`CatsService`是通过类构造函数**注入**的。
注意`private`语法的使用。
这种简写方式允许我们立即在同一个位置声明和初始化`catsService`成员。

#### 依赖注入

Nest 是围绕通常被称为**依赖注入**的强设计模式构建的。
我们建议在官方[Angular](https://angular.io/guide/dependency-injection)文档中阅读一篇关于这个概念的优秀文章。

在 Nest 中，由于 TypeScript 的功能，管理依赖项非常容易，因为它们只根据类型解析。
在下面的例子中，Nest 将通过创建并返回一个`catsService`的实例来解析`catsService`(或者，在单例的正常情况下，如果它已经在其他地方被请求，则返回现有的实例)。
这个依赖被解析并传递给你的控制器的构造函数(或者赋值给指定的属性):

```typescript
constructor(private catsService: CatsService) {}
```

#### 作用域

提供器的生命周期(`作用域`)通常与应用程序的生命周期同步。
当应用程序启动时，必须解析每个依赖项，因此必须实例化每个提供器。
类似地，当应用程序关闭时，每个提供器都将被销毁。
然而，也有一些方法可以使你的提供器的生命周期**以请求为范围**。
你可以在[这里](/fundamentals/injection-scopes)阅读更多关于这些技术的信息。

#### 定制的提供器

Nest 有一个内置的控制反转(`IoC`)容器，用来解决提供器之间的关系。
这个特性是上面描述的依赖注入特性的基础，但实际上它比我们目前所描述的要强大得多。
定义提供器有几种方法:可以使用普通值、类以及异步或同步工厂。
[这里](/fundamentals/dependency-injection)提供了更多的例子。

#### 可选的提供器

有时候，您可能有一些不需要解析的依赖项。
例如，你的类可能依赖于一个**配置对象**，但如果没有传递，则应该使用默认值。
在这种情况下，依赖项变成可选的，因为缺少配置提供程序不会导致错误。

要指出提供器是可选的，在构造函数的签名中使用`@Optional()`装饰器。

```typescript
import { Injectable, Optional, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  constructor(@Optional() @Inject('HTTP_OPTIONS') private httpClient: T) {}
}
```

请注意，在上面的例子中，我们使用的是一个自定义提供器，这就是为什么我们包含了`HTTP_OPTIONS`自定义**令牌**。
前面的例子显示了基于构造函数的注入，通过构造函数中的类指示依赖关系。
阅读更多关于定制提供器及其相关令牌的信息[此处](/fundamentals/custom-providers)。

#### 基于属性的注入

到目前为止，我们使用的技术称为基于构造函数的注入，因为提供程序是通过构造函数方法注入的。
在一些非常特殊的情况下，基于属性的注入可能会很有用。
例如，如果你的顶级类依赖于一个或多个提供器，那么通过调用构造函数中的子类中的`super()`来传递它们会非常繁琐。
为了避免这种情况，你可以在属性级使用`@Inject()`装饰器。

```typescript
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class HttpService<T> {
  @Inject('HTTP_OPTIONS')
  private readonly httpClient: T;
}
```

> warning **Warning** 如果你的类没有扩展其他提供器，你应该总是倾向于使用基于构造函数的\*\*注入。

#### 提供器登记

现在我们已经定义了提供器(`CatsService`)，并且有了该服务的消费者(`CatsController`)，我们需要向 Nest 注册该服务，以便它可以执行注入。
我们通过编辑模块文件(`app.module.ts`)，并将该服务添加到`@Module()`装饰器的`providers`数组中来实现这一点。

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

Nest 现在将能够解析`CatsController`类的依赖项。

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
<div class="item">cats.service.ts</div>
</div>
<div class="item">app.module.ts</div>
<div class="item">main.ts</div>
</div>
</div>

#### 手动实例化

到目前为止，我们已经讨论了 Nest 如何自动处理解析依赖关系的大部分细节。
在某些情况下，你可能需要跳出内置的依赖注入系统，手动检索或实例化提供器。
下面我们简要讨论两个这样的主题。

要获取现有的实例，或者动态实例化提供器，你可以使用[模块引用](https://docs.nestjs.com/fundamentals/module-ref)。

要在`bootstrap()`函数中获取提供器(例如，对于没有控制器的独立应用程序，或者在引导过程中利用配置服务)，请参阅[独立应用程序](https://docs.nestjs.com/standalone-applications)。
