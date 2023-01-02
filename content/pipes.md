# 管道

管道是一个带有 `@Injectable()` 装饰器的类。
管道应该实现 `PipeTransform` 接口。

<figure>
  <img src="/assets/Pipe_1.png" />
</figure>

管道有两种典型的用例:

- **transformation** : 将输入数据转换为所需的形式(例如，从字符串转换为整数)
- **validation** : 计算输入数据，如果有效，则不加更改地传递;否则，当数据不正确时抛出异常

在这两种情况下，管道都对[控制器路由处理器](controllers#route-parameters)处理的 `arguments` 进行操作。
Nest 在调用方法之前插入一个管道，该管道接收用于该方法的参数并对其进行操作。
任何转换或验证操作都将在此时进行，之后将使用任何(可能的)转换后的参数调用路由处理程序。

Nest 附带了许多内置管道，您可以开箱即用。
您还可以构建自己的自定义管道。
在本章中，我们将介绍内置管道，并展示如何将它们绑定到路由处理程序。
然后，我们将研究几个定制的管道，以展示如何从头构建一个管道。

!!! info "**Hint**"

    管道运行在异常区域内。
    这意味着，当 Pipe 抛出一个异常时，它是由异常层(全局异常过滤器和应用于当前上下文的任何[异常过滤器](/exception-filters)处理的。
    鉴于上述情况，应该很清楚，当在 Pipe 中抛出异常时，随后不会执行控制器方法。
    这为您提供了在系统边界验证来自外部源进入应用程序的数据的最佳实践技术。

## 内置的管道

Nest 有 8 个现成的管道:

- `ValidationPipe`
- `ParseIntPipe`
- `ParseFloatPipe`
- `ParseBoolPipe`
- `ParseArrayPipe`
- `ParseUUIDPipe`
- `ParseEnumPipe`
- `DefaultValuePipe`

!!! info "**Hint**"

    它们是从 `@nestjs/common` 包中导出的。

让我们快速看看如何使用 `ParseIntPipe` 。
这是一个 **转换** 用例的例子，管道确保一个方法处理参数被转换为 JavaScript 整数(或在转换失败时抛出一个异常)。
在本章的后面，我们将展示一个 `ParseIntPipe` 的简单自定义实现。
下面的示例技术也适用于其他内置转换管道( `ParseBoolPipe` ， `ParseFloatPipe` ， `ParseEnumPipe` ， `ParseArrayPipe` 和 `ParseUUIDPipe` ，我们将在本章中称之为 `Parse*` 管道)。

## 绑定管道

要使用管道，我们需要将管道类的实例绑定到适当的上下文。
在我们的 `ParseIntPipe` 例子中，我们希望将管道与一个特定的路由处理程序方法相关联，并确保它在方法被调用之前运行。
我们使用下面的结构来实现这一点，我们将其称为在方法参数级别绑定管道:

```typescript
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {
  return this.catsService.findOne(id);
}
```

这将确保以下两个条件之一为真:我们在 `findOne()` 方法中接收到的参数是一个数字(正如我们在调用`this.catsService.findOne()`时所期望的那样)，或者在调用路由处理程序之前抛出一个异常。

例如，假设路由是这样调用的:

```bash
GET localhost:3000/abc
```

Nest 将抛出这样的异常:

```json
{
  "statusCode": 400,
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request"
}
```

该异常将阻止 `findOne()` 方法体的执行。

在上面的例子中，我们传递了一个类( `ParseIntPipe` )，而不是一个实例，将实例化的责任留给框架，并启用依赖注入。
与管道和守卫一样，我们可以传递一个就地实例。
如果我们想通过传递选项自定义内置管道的行为，传递一个就地实例是很有用的:

```typescript
@Get(':id')
async findOne(
  @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }))
  id: number,
) {
  return this.catsService.findOne(id);
}
```

绑定其他转换管道(所有 **Parse\*** 管道)的工作方式类似。
这些管道都在验证路由参数、查询字符串参数和请求体值的上下文中工作。

例如，使用查询字符串参数:
=== "JavaScript"

```typescript
@Get()
async findOne(@Query('id', ParseIntPipe) id: number) {
  return this.catsService.findOne(id);
}
```

下面是一个使用 `ParseUUIDPipe` 来解析字符串参数并验证它是否为 UUID 的示例。

=== "TypeScript"

    ```ts
    @Get(':uuid')
    async findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
      return this.catsService.findOne(uuid);
    }
    ```

=== "JavaScript"

    ```js
    @Get(':uuid')
    @Bind(Param('uuid', new ParseUUIDPipe()))
    async findOne(uuid) {
      return this.catsService.findOne(uuid);
    }
    ```

!!! info "**Hint**"

    当使用 `ParseUUIDPipe()` 时，你正在解析版本 3、4 或 5 中的 UUID，如果你只需要一个特定的 UUID 版本，你可以在管道选项中传递一个版本。

上面我们已经看到了绑定各种 `Parse*` 内置管道家族的例子。
绑定验证管道有点不同;我们将在下一节对此进行讨论。

!!! info "**Hint**"

    另外，请参阅[验证技术](/techniques/vlidation)了解更多验证管道的例子。

## 自定义的管道

如前所述，您可以构建自己的自定义管道。
虽然 Nest 提供了健壮的内置 `ParseIntPipe` 和 `ValidationPipe` ，但让我们从头构建它们的简单自定义版本，看看自定义管道是如何构建的。

我们从一个简单的 `ValidationPipe` 开始。
最初，我们将让它简单地接受一个输入值并立即返回相同的值，就像一个恒等函数一样。

=== "validation.pipe.ts"

    ```ts
    import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

    @Injectable()
    export class ValidationPipe implements PipeTransform {
      transform(value: any, metadata: ArgumentMetadata) {
        return value;
      }
    }
    ```

=== "validation.pipe.js"

    ```js
    import { Injectable } from '@nestjs/common';

    @Injectable()
    export class ValidationPipe {
      transform(value, metadata) {
        return value;
      }
    }
    ```

!!! info "**Hint**"

    `PipeTransform<T, R>` 是一个通用接口，必须由任何管道实现。
    泛型接口使用 `T` 表示输入 `value` 的类型，使用 `R` 表示 `transform()` 方法的返回类型。

每个管道必须实现 `transform()` 方法来实现 `PipeTransform` 接口契约。
这个方法有两个参数:

- `value`
- `metadata`

`value` 参数是当前处理的方法参数(在它被路由处理方法接收之前)， `metadata` 是当前处理的方法参数的元数据。
元数据对象具有以下属性:

```typescript
export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: Type<unknown>;
  data?: string;
}
```

这些属性描述当前处理的参数。

<table>
  <tr>
    <td>
      <code>type</code>
    </td>
    <td>Indicates whether the argument is a body
      <code>@Body()</code>, query
      <code>@Query()</code>, param
      <code>@Param()</code>, or a custom parameter (read more
      <a routerLink="/custom-decorators">here</a>).</td>
  </tr>
  <tr>
    <td>
      <code>metatype</code>
    </td>
    <td>
      Provides the metatype of the argument, for example,
      <code>String</code>.
Note: the value is
      <code>undefined</code> if you either omit a type declaration in the route handler method signature, or use vanilla JavaScript.
    </td>
  </tr>
  <tr>
    <td>
      <code>data</code>
    </td>
    <td>The string passed to the decorator, for example
      <code>@Body('string')</code>.
It's
      <code>undefined</code> if you leave the decorator parenthesis empty.</td>
  </tr>
</table>

!!! warning

    TypeScript 接口在编译过程中消失。
    因此，如果方法参数的类型声明为接口而不是类，则“元类型”值将为“对象”。

## 基于模式的验证

让我们让验证管道更有用一些。
仔细看看 `CatsController` 的 `create()` 方法，我们可能希望在尝试运行我们的 service 方法之前确保 post 主体对象是有效的。

=== "TypeScript"

    ```ts
    @Post()
    async create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

=== "JavaScript"

    ```js
    @Post()
    async create(@Body() createCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

让我们关注主体参数“createCatDto”。
它的类型是 `CreateCatDto` :

=== "create-cat.dto.ts"

    ```ts
    export class CreateCatDto {
      name: string;
      age: number;
      breed: string;
    }
    ```

我们希望确保对 create 方法的任何传入请求都包含一个有效的主体。
因此，我们必须验证 `createCatDto` 对象的三个成员。
我们可以在路由处理程序方法中这样做，但这样做并不理想，因为它会打破“单一责任规则”(SRP)。

另一种方法可能是创建一个 **验证器类** ，并将任务委托给它。
这样做的缺点是，我们必须记住在每个方法开始时调用这个验证器。

创建验证中间件怎么样?
这是可行的，但不幸的是，不可能创建能够跨整个应用程序的所有上下文使用的 **通用中间件** 。
这是因为中间件不知道 **执行上下文** ，包括将被调用的处理程序和它的任何参数。

当然，这正是管道设计的用例。
让我们继续改进我们的验证管道。

## 对象模式验证

有几种方法可以以干净的[DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)方式进行对象验证。
一种常见的方法是使用 **基于模式** 的验证。
让我们尝试一下这种方法。

[Joi](https://github.com/sideway/joi)库允许您通过一个可读的 API 以直接的方式创建模式。
让我们构建一个使用基于 joi 的模式的验证管道。

首先安装所需的软件包:

```bash
$ npm install --save joi
$ npm install --save-dev @types/joi
```

在下面的代码示例中，我们创建了一个简单的类，它接受一个模式作为“构造函数”参数。
然后应用 `schema.validate()` 方法，它根据所提供的模式验证传入的参数。

如前所述， **验证管道** 要么原样返回值，要么抛出异常。

在下一节中，您将看到我们如何使用 `@UsePipes()` 装饰器为给定的控制器方法提供适当的模式。
这样做可以使我们的验证管道跨上下文重用，就像我们开始做的那样。

=== "TypeScript"

    ```ts
    import {
      PipeTransform,
      Injectable,
      ArgumentMetadata,
      BadRequestException,
    } from '@nestjs/common';
    import { ObjectSchema } from 'joi';

    @Injectable()
    export class JoiValidationPipe implements PipeTransform {
      constructor(private schema: ObjectSchema) {}

      transform(value: any, metadata: ArgumentMetadata) {
        const { error } = this.schema.validate(value);
        if (error) {
          throw new BadRequestException('Validation failed');
        }
        return value;
      }
    }
    ```

=== "JavaScript"

    ```js
    import { Injectable, BadRequestException } from '@nestjs/common';

    @Injectable()
    export class JoiValidationPipe {
      constructor(schema) {
        this.schema = schema;
      }

      transform(value, metadata) {
        const { error } = this.schema.validate(value);
        if (error) {
          throw new BadRequestException('Validation failed');
        }
        return value;
      }
    }
    ```

## 绑定验证管道

在前面，我们看到了如何绑定转换管道(如 `ParseIntPipe` 和 `Parse*` 管道的其余部分)。

绑定验证管道也非常简单。

在本例中，我们希望在方法调用级别绑定管道。
在我们当前的例子中，我们需要做以下事情来使用 `JoiValidationPipe` :

1. 创建一个“JoiValidationPipe”的实例
2. 在管道的类构造函数中传递特定于上下文的 Joi 模式
3. 将管道绑定到方法

我们使用“@UsePipes()”装饰器来完成，如下所示:

=== "TypeScript"

    ```ts
    @Post()
    @UsePipes(new JoiValidationPipe(createCatSchema))
    async create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

=== "JavaScript"

    ```js
    @Post()
    @Bind(Body())
    @UsePipes(new JoiValidationPipe(createCatSchema))
    async create(createCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

!!! info "**Hint**"

    `@UsePipes()` 装饰器是从 `@nestjs/common` 包中导入的。

## 类验证器

!!! warning

    本节中提到的技术需要 TypeScript，如果你的应用是用 JavaScript 编写的，那么它是不可用的。

让我们看看验证技术的另一种实现。

Nest 与[class-validator](https://github.com/typestack/class-validator)库一起工作得很好。
这个功能强大的库允许您使用基于装饰器的验证。
基于装饰器的验证非常强大，特别是当与 Nest 的 **Pipe** 功能结合使用时，因为我们可以访问被处理属性的“元类型”。
在开始之前，我们需要安装所需的软件包:

```bash
$ npm i --save class-validator class-transformer
```

一旦安装了这些，我们可以添加一些装饰器到 `CreateCatDto` 类。
这里我们看到了这种技术的一个显著优势:“CreateCatDto”类仍然是 Post 主体对象的唯一真实源(而不是必须创建一个单独的验证类)。

=== "create-cat.dto.ts"

    ```ts
    import { IsString, IsInt } from 'class-validator';

    export class CreateCatDto {
      @IsString()
      name: string;

      @IsInt()
      age: number;

      @IsString()
      breed: string;
    }
    ```

!!! info "**Hint**"

    阅读更多关于类验证器装饰器的信息[此处](https://github.com/typestack/class-validator#usage).

现在我们可以创建一个使用这些注释的 `ValidationPipe` 类。

=== "validation.pipe.ts"

    ```ts
    import {
      PipeTransform,
      Injectable,
      ArgumentMetadata,
      BadRequestException,
    } from '@nestjs/common';
    import { validate } from 'class-validator';
    import { plainToClass } from 'class-transformer';

    @Injectable()
    export class ValidationPipe implements PipeTransform<any> {
      async transform(value: any, { metatype }: ArgumentMetadata) {
        if (!metatype || !this.toValidate(metatype)) {
          return value;
        }
        const object = plainToClass(metatype, value);
        const errors = await validate(object);
        if (errors.length > 0) {
          throw new BadRequestException('Validation failed');
        }
        return value;
      }

      private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
      }
    }
    ```

!!! warning

    在上面，我们使用了[class-transformer](https://github.com/typestack/class-transformer)库。
    它与 **类验证器** 库是由同一作者编写的，因此，它们可以很好地结合在一起。

让我们来看看这段代码。
首先，请注意 `transform()` 方法被标记为 `async` 。
这是可能的，因为 Nest 同时支持同步和 **异步** 管道。
我们使这个方法为 `async` ，因为一些类验证器验证[可以是 async](https://github.com/typestack/class-validator#custom-validation-classes)(利用 Promises)。

接下来注意，我们正在使用解构来提取元类型字段(仅从 `ArgumentMetadata` 中提取这个成员)到我们的 `metatype` 参数中。
这只是获取完整的 `ArgumentMetadata` 的简写，然后有一个额外的语句来分配元类型变量。

接下来，请注意助手函数 `toValidate()` 。
当当前处理的参数是本地 JavaScript 类型时，它负责绕过验证步骤(这些参数不能附加验证修饰符，所以没有理由通过验证步骤运行它们)。

接下来，我们使用类转换器函数 `plainToClass()` 将普通 JavaScript 参数对象转换为类型化对象，以便应用验证。
我们必须这样做的原因是，传入的 post 主体对象，当从网络请求反序列化时， **没有任何类型信息** (这是底层平台，如 Express 的工作方式)。
类验证器需要使用前面为 DTO 定义的验证修饰器，因此需要执行此转换，将传入的主体视为适当修饰的对象，而不仅仅是普通的对象。

最后，如前所述，由于这是一个 **验证管道** ，所以它要么不加修改地返回值，要么抛出异常。

最后一步是绑定 `ValidationPipe` 。
管道可以是参数作用域、方法作用域、控制器作用域或全局作用域。
在前面的基于 joi 的验证管道中，我们看到了一个在方法级别绑定管道的示例。
在下面的例子中，我们将把管道实例绑定到路由处理器的 `@Body()` 装饰器上，这样我们的管道就会被调用来验证发送主体。

=== "cats.controller.ts"

    ```ts
    @Post()
    async create(
      @Body(new ValidationPipe()) createCatDto: CreateCatDto,
    ) {
      this.catsService.create(createCatDto);
    }
    ```

当验证逻辑只涉及一个指定参数时，参数作用域的管道很有用。

## 全球范围的管道

由于“ValidationPipe”被创建得尽可能通用，我们可以通过将它设置为一个 **全局作用域的** 管道来实现它的完整实用，这样它就可以应用于整个应用程序中的每个路由处理程序。

=== "main.ts"

    ```ts
    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      app.useGlobalPipes(new ValidationPipe());
      await app.listen(3000);
    }
    bootstrap();
    ```

!!! warning

    在<a href="faq/hybrid-application">hybrid apps</a>的情况下， `useGlobalPipes()` 方法不为网关和微服务设置管道。
    对于“标准”(非混合)微服务应用， `useGlobalPipes()` 会全局安装管道。

全局管道用于整个应用程序，包括每个控制器和每个路由处理程序。

注意，在依赖项注入方面，从任何模块外部注册的全局管道(如上面的例子中使用 `useGlobalPipes()` )不能注入依赖项，因为绑定已经在任何模块的上下文之外完成了。
为了解决这个问题，你可以 **直接从任何模块** 建立一个全局管道，使用以下结构:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { APP_PIPE } from '@nestjs/core';

    @Module({
      providers: [
        {
          provide: APP_PIPE,
          useClass: ValidationPipe,
        },
      ],
    })
    export class AppModule {}
    ```

!!! info "**Hint**"

    当使用这种方法对管道执行依赖注入时，请注意，无论使用这种结构的模块是什么，管道实际上都是全局的。
    这应该在哪里做?选择管道(上面例子中的 `ValidationPipe` )定义的模块。
    此外， `useClass` 并不是处理自定义提供程序注册的唯一方法。
    了解更多[这里](/fundamentals/custom-providers)。

## 内置的 ValidationPipe

提醒一下，你不需要自己构建一个通用的验证管道，因为 `ValidationPipe` 是由 Nest 开箱即用提供的。
内置的 `ValidationPipe` 比我们在本章中构建的示例提供了更多的选项，在本章中，为了演示自定义构建管道的机制，我们一直保持基本的示例。
您可以在[这里](/techniques/validation)找到完整的细节，以及大量的示例。

## 转换用例

验证并不是自定义管道的唯一用例。
在本章的开始，我们提到管道也可以 **转换** 输入数据到所需的格式。
这是可能的，因为 `transform` 函数返回的值完全覆盖了参数之前的值。

这在什么时候有用?
考虑到有时从客户端传递的数据需要进行一些更改—例如将字符串转换为整数—然后才能由路由处理程序方法正确处理。
此外，一些必需的数据字段可能会丢失，我们希望应用默认值。
转换管道可以通过在客户端请求和请求处理程序之间插入处理函数来执行这些功能。

下面是一个简单的“ParseIntPipe”，它负责将字符串解析为整数值。
(如前所述，Nest 有一个更复杂的内置 `ParseIntPipe` ;我们将其作为一个简单的自定义转换管道示例)。

=== "parse-int.pipe.ts"

    ```ts
    import {
      PipeTransform,
      Injectable,
      ArgumentMetadata,
      BadRequestException,
    } from '@nestjs/common';

    @Injectable()
    export class ParseIntPipe implements PipeTransform<string, number> {
      transform(value: string, metadata: ArgumentMetadata): number {
        const val = parseInt(value, 10);
        if (isNaN(val)) {
          throw new BadRequestException('Validation failed');
        }
        return val;
      }
    }
    ```

=== "parse-int.pipe.js"

    ```js
    import { Injectable, BadRequestException } from '@nestjs/common';

    @Injectable()
    export class ParseIntPipe {
      transform(value, metadata) {
        const val = parseInt(value, 10);
        if (isNaN(val)) {
          throw new BadRequestException('Validation failed');
        }
        return val;
      }
    }
    ```

然后，我们可以将该管道绑定到选定的参数，如下所示:

=== "TypeScript"

    ```ts
    @Get(':id')
    async findOne(@Param('id', new ParseIntPipe()) id) {
      return this.catsService.findOne(id);
    }
    ```

=== "JavaScript"

    ```js
    @Get(':id')
    @Bind(Param('id', new ParseIntPipe()))
    async findOne(id) {
      return this.catsService.findOne(id);
    }
    ```

另一个有用的转换案例是使用请求中提供的 id 从数据库中选择一个现有用户实体:

=== "TypeScript"

    ```ts
    @Get(':id')
    findOne(@Param('id', UserByIdPipe) userEntity: UserEntity) {
      return userEntity;
    }
    ```

=== "JavaScript"

    ```js
    @Get(':id')
    @Bind(Param('id', UserByIdPipe))
    findOne(userEntity) {
      return userEntity;
    }
    ```

我们将该管道的实现留给读者，但是请注意，像所有其他转换管道一样，它接收一个输入值(一个“id”)并返回一个输出值(一个“UserEntity”对象)。
这可以使您的代码更具有声明性和[DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)，方法是将样板代码从处理程序中抽象出来，放到一个公共管道中。

## 提供默认值

`Parse*` 管道希望定义参数的值。
它们在接收到“null”或“undefined”值时抛出异常。
为了允许端点处理缺失的 querystring 参数值，我们必须在 `Parse*` 管道对这些值进行操作之前提供一个默认值来注入。
`DefaultValuePipe` 可以达到这个目的。
只需在 `@Query()` 装饰器中相关的 `Parse*` 管道之前实例化一个 `DefaultValuePipe` ，如下所示:

=== "TypeScript"

    ```ts
    @Get()
    async findAll(
      @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe) activeOnly: boolean,
      @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    ) {
      return this.catsService.findAll({ activeOnly, page });
    }
    ```
