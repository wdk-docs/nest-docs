# 控制器

控制器负责处理传入的 **请求** 并返回 **响应** 给客户端。

<figure><img src="/assets/Controllers_1.png" /></figure>

控制器的作用是接收应用程序的特定请求。
**路由** 机制控制哪个控制器接收哪个请求。
通常，每个控制器有多个路由，不同的路由可以执行不同的操作。

为了创建一个基本控制器，我们使用类和 **装饰器** 。
装饰器将类与所需的元数据关联起来，并使 Nest 能够创建路由映射(将请求绑定到相应的控制器)。

!!! info

    为了使用内置的[验证](https://docs.nestjs.com/techniques/validation)快速创建 CRUD 控制器，您可以使用 CLI 的[CRUD 生成器](https://docs.nestjs.com/recipes/crud-generator#crud-generator): `nest g resource [name]`.

## 路由

在下面的例子中，我们将使用`@Controller()`装饰器，它是定义一个基本控制器所必需的。
我们将指定一个可选的路由路径前缀`cats`。
在`@Controller()`装饰器中使用路径前缀可以让我们轻松地对一组相关的路由进行分组，并最小化重复代码。
例如，我们可以选择将一组管理与客户实体交互的路由分组在路由`/customers`下。
在这种情况下，我们可以在`@Controller()`装饰器中指定路径前缀`customers`，这样我们就不必为文件中的每个路由重复这部分路径。

=== "cats.controller.ts"

    ```ts
    import { Controller, Get } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Get()
      findAll(): string {
        return 'This action returns all cats';
      }
    }
    ```

=== "cats.controller.js"

    ```js
    import { Controller, Get } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Get()
      findAll() {
        return 'This action returns all cats';
      }
    }
    ```

!!! info "要使用 CLI 创建控制器，只需执行`$ nest g controller cats`命令。"

在`findAll()`方法之前的`@Get()` HTTP 请求方法装饰器告诉 Nest 为 HTTP 请求的特定端点创建处理程序。
端点对应于 HTTP 请求方法(在本例中为 GET)和路由路径。
什么是路由路径?
处理程序的路由路径是通过连接为控制器声明的(可选的)前缀和方法装饰器中指定的任何路径来确定的。
因为我们为每个路由声明了前缀(`cats`)，并且没有在装饰器中添加任何路径信息，所以 Nest 将把`GET /cats`请求映射到这个处理程序。
如前所述，路径既包括可选的控制器路径前缀， **也** 包括请求方法装饰器中声明的任何路径字符串。
例如，路径前缀`customers`结合装饰器`@Get('profile')`将为`GET /customers/profile`等请求生成路由映射。

在上面的示例中，当向该端点发出 GET 请求时，Nest 将该请求路由到用户定义的`findAll()`方法。
注意，我们在这里选择的方法名完全是任意的。
显然，我们必须声明一个方法来绑定路由，但是 Nest 不会给选择的方法名赋予任何意义。

该方法将返回一个 200 状态码和相关的响应，在本例中只是一个字符串。
为什么会这样?
为了解释，我们首先介绍 Nest 使用两种 **不同的** 选项来操纵响应的概念:

<table>
  <tr>
    <td>标准 (推荐)</td>
    <td>
      使用这个内置方法，当请求处理程序返回一个JavaScript对象或数组时，它将<strong>自动</strong>被序列化为JSON。
      当它返回一个JavaScript原始类型(例如，<code>string</code>， <code>number</code>， <code>boolean</code>)，然而，Nest将只发送值，而不试图序列化它。
      这使得响应处理变得简单:只返回值，其余的由Nest负责。<br /> <br />
      此外，响应的<strong>状态码</strong>默认情况下总是200，使用201的POST请求除外。
      我们可以通过在处理程序级添加<code>@HttpCode(…)</code>装饰器来轻松改变这种行为(参见<a href='controllers# Status -code'>状态码</a>)。
    </td>
  </tr>
  <tr>
    <td>库指定</td>
    <td>
      我们可以使用特定于库的(例如，Express) <a href="https://expressjs.com/en/api.html#res" rel="nofollow" target="_blank">响应对象</a>，可以在方法处理程序签名中使用<code>@Res()</code>装饰器注入(例如，<code>findAll(@Res() response)</code>)。
      通过这种方法，您可以使用该对象公开的本机响应处理方法。
      例如，使用Express，您可以使用以下代码来构造响应:<code>response.status(200).send()</code>。
    </td>
  </tr>
</table>

!!! warning

    Nest 检测处理程序何时使用`@Res()`或`@Next()`，表明您选择了特定于库的选项。
    如果同时使用这两种方法，标准方法将自动对这个单一路由禁用，并且不再按预期工作。
    要同时使用这两种方法(例如，通过注入响应对象来只设置 cookie/header，但仍然将其余的留给框架)，你必须在`@Res({ passthrough: true })`装饰器中将`passthrough`选项设置为`true`。

## 请求对象

处理程序通常需要访问客户端 **请求** 细节。
Nest 提供了对底层平台(默认为 Express)的[请求对象](https://expressjs.com/en/api.html#req)的访问。
我们可以通过在处理程序的签名中添加 `@Req()` 装饰器来指示 Nest 注入请求对象来访问请求对象。

=== "cats.controller.ts"

    ```ts
    import { Controller, Get, Req } from '@nestjs/common';
    import { Request } from 'express';

    @Controller('cats')
    export class CatsController {
      @Get()
      findAll(@Req() request: Request): string {
        return 'This action returns all cats';
      }
    }
    ```

=== "cats.controller.js"

    ```js
    import { Controller, Bind, Get, Req } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Get()
      @Bind(Req())
      findAll(request) {
        return 'This action returns all cats';
      }
    }
    ```

!!! info "为了利用`express`类型(如上面的`request: request`参数示例)，安装`@types/express`包。"

请求对象表示 HTTP 请求，并具有请求查询字符串、参数、HTTP 头和正文的属性(更多信息请访问https://expressjs.com/en/api.html#req)。
在大多数情况下，没有必要手动获取这些属性。
我们可以使用专门的装饰器，例如`@Body()`或`@Query()`，它们都是开箱即用的。
下面列出了提供的装饰器以及它们所表示的特定于平台的对象。

<table>
  <tbody>
    <tr>
      <td><code>@Request(), @Req()</code></td>
      <td><code>req</code></td></tr>
    <tr>
      <td><code>@Response(), @Res()</code><span class="table-code-asterisk">*</span></td>
      <td><code>res</code></td>
    </tr>
    <tr>
      <td><code>@Next()</code></td>
      <td><code>next</code></td>
    </tr>
    <tr>
      <td><code>@Session()</code></td>
      <td><code>req.session</code></td>
    </tr>
    <tr>
      <td><code>@Param(key?: string)</code></td>
      <td><code>req.params</code> / <code>req.params[key]</code></td>
    </tr>
    <tr>
      <td><code>@Body(key?: string)</code></td>
      <td><code>req.body</code> / <code>req.body[key]</code></td>
    </tr>
    <tr>
      <td><code>@Query(key?: string)</code></td>
      <td><code>req.query</code> / <code>req.query[key]</code></td>
    </tr>
    <tr>
      <td><code>@Headers(name?: string)</code></td>
      <td><code>req.headers</code> / <code>req.headers[name]</code></td>
    </tr>
    <tr>
      <td><code>@Ip()</code></td>
      <td><code>req.ip</code></td>
    </tr>
    <tr>
      <td><code>@HostParam()</code></td>
      <td><code>req.hosts</code></td>
    </tr>
  </tbody>
</table>

<sup>\*</sup>
为了兼容跨底层 HTTP 平台(例如，Express 和 Fastify)的类型，Nest 提供了`@Res()`和`@Response()`装饰器。
`@Res()`只是`@Response()`的别名。
两者都直接暴露了底层的本机平台`响应`对象接口。
在使用它们时，您还应该导入底层库的类型(例如，`@types/express`)以充分利用它们。
请注意，当你在方法处理程序中注入`@Res()`或`@Response()`时，你将 Nest 置于该处理程序的特定于 **库** 的模式中，你将负责管理响应。
当这样做时，你必须通过调用`response`对象(例如`res.json(…)'或`res.send(…)')来发出某种响应，否则 HTTP 服务器将挂起。

!!! info "要学习如何创建自己的自定义装饰器，请访问[这个](/custom-decorators)章节。"

## 资源

前面，我们定义了一个端点来获取 cats 资源( **GET** 路由)。
我们通常还希望提供一个创建新记录的端点。
为此，让我们创建一个 **POST** 处理器:

=== "cats.controller.ts"

    ```ts
    import { Controller, Get, Post } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Post()
      create(): string {
        return 'This action adds a new cat';
      }

      @Get()
      findAll(): string {
        return 'This action returns all cats';
      }
    }
    ```

=== "cats.controller.js"

    ```js
    import { Controller, Get, Post } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Post()
      create() {
        return 'This action adds a new cat';
      }

      @Get()
      findAll() {
        return 'This action returns all cats';
      }
    }
    ```

就是这么简单。
Nest 为所有标准 HTTP 方法提供了装饰器:`@Get()`， `@Post()`， `@Put()`， `@Delete()`， `@Patch()`， `@Options()`和`@Head()`。
此外，`@All()`定义了一个端点来处理所有它们。

## 泛路由

也支持基于模式的路由。
例如，星号用作通配符，将匹配任何字符组合。

```typescript
@Get('ab*cd')
findAll() {
  return 'This route uses a wildcard';
}
```

`ab*cd`路由路径将匹配`abcd`， `ab_cd`， `abecd`，等等。 人物的?'， `+`， `*`和`()`可以在路由路径中使用，它们是它们对应的正则表达式的子集。 连字符(`-`)和点(`.`)按字面意思解释基于字符串的路径。

## 状态码

如前所述，响应状态码默认总是 **200**，除了 POST 请求是**201** 。
我们可以通过在处理程序级别添加`@HttpCode(…)`装饰器来轻松地改变这种行为。

```typescript
@Post()
@HttpCode(204)
create() {
  return 'This action adds a new cat';
}
```

!!! info "从`@nestjs/common`包中导入`HttpCode`。"

通常，您的状态代码不是静态的，而是取决于各种因素。
在这种情况下，可以使用特定于库的 **response** (使用`@Res()`注入)对象(或者，在出现错误时，抛出异常)。

## 头部

要指定自定义响应头，你可以使用`@Header()`装饰器或特定于库的响应对象(并直接调用`res.header()`)。

```typescript
@Post()
@Header('Cache-Control', 'none')
create() {
  return 'This action adds a new cat';
}
```

!!! info "从`@nestjs/common`包中导入`Header`。"

## 重定向

要将响应重定向到特定的 URL，你可以使用`@Redirect()`装饰器或库特定的响应对象(并直接调用`res.redirect()`)。

`@Redirect()`有两个参数，`url`和`statusCode`，都是可选的。
如果省略，`statusCode`的默认值是`302 `(`Found`)。

```typescript
@Get()
@Redirect('https://nestjs.com', 301)
```

有时，您可能希望动态地确定 HTTP 状态代码或重定向 URL。
通过从路由处理程序方法返回一个带有形状的对象来实现:

```json
{
  "url": string,
  "statusCode": number
}
```

返回值将覆盖传递给`@Redirect()`装饰器的任何参数。
例如:

```typescript
@Get('docs')
@Redirect('https://docs.nestjs.com', 302)
getDocs(@Query('version') version) {
  if (version && version === '5') {
    return { url: 'https://docs.nestjs.com/v5/' };
  }
}
```

## 路由参数

当你需要接受动态数据作为请求的一部分时(例如，`GET /cats/1`来获取 id 为`1`的猫)，静态路径的路由将不起作用。
为了定义带有参数的路由，我们可以在路由路径中添加路由参数令牌，以捕获请求 URL 中那个位置的动态值。
下面的`@Get()`装饰器示例中的路由参数令牌演示了这种用法。
以这种方式声明的路由参数可以使用`@Param()`装饰器来访问，它应该被添加到方法签名中。

=== "TypeScript"

    ```ts
    @Get(':id')
    findOne(@Param() params): string {
      console.log(params.id);
      return `This action returns a #${params.id} cat`;
    }
    ```

=== "JavaScript"

    ```js
    @Get(':id')
    @Bind(Param())
    findOne(params) {
      console.log(params.id);
      return `This action returns a #${params.id} cat`;
    }
    ```

`@Param()`被用来修饰一个方法参数(在上面的例子中是`params`)，并使 **route** 参数作为修饰后的方法参数的属性在方法体中可用。
正如上面的代码所示，我们可以通过引用`params.id`来访问`id`参数。
你也可以将一个特定的参数标记传递给装饰器，然后在方法体中直接通过名称引用路由参数。

!!! info "从`@nestjs/common`包导入`Param`。"

=== "TypeScript"

    ```ts
    @Get(':id')
    findOne(@Param('id') id: string): string {
      return `This action returns a #${id} cat`;
    }
    ```

=== "JavaScript"

    ```js
    @Get(':id')
    @Bind(Param('id'))
    findOne(id) {
      return `This action returns a #${id} cat`;
    }
    ```

## 子域路由

`@Controller`装饰器可以接受`host`选项，要求传入请求的 HTTP 主机匹配特定的值。

```typescript
@Controller({ host: 'admin.example.com' })
export class AdminController {
  @Get()
  index(): string {
    return 'Admin page';
  }
}
```

!!! warning "由于**fasttify** 缺乏对嵌套路由器的支持，所以在使用子域路由时，应该使用(默认的)Express 适配器。"

与路由`path`类似，`hosts`选项可以使用令牌来捕获主机名中该位置的动态值。
下面的`@Controller()`装饰器示例中的主机参数令牌演示了这种用法。
以这种方式声明的主机参数可以使用`@HostParam()`装饰器访问，该装饰器应该添加到方法签名中。

```typescript
@Controller({ host: ':account.example.com' })
export class AccountController {
  @Get()
  getInfo(@HostParam('account') account: string) {
    return account;
  }
}
```

## 范围

对于具有不同编程语言背景的人来说，可能会意外地发现，在 Nest 中，几乎所有的请求都是共享的。
我们有一个到数据库的连接池，有全局状态的单例服务，等等。
记住 Node.js 并不遵循请求/响应多线程无状态模型，在该模型中，每个请求都由单独的线程处理。
因此，使用单例实例对我们的应用程序是完全安全的。

然而，在某些边缘情况下，基于请求的控制器生命周期可能是理想的行为，例如 GraphQL 应用程序中的每个请求缓存、请求跟踪或多租户。
学习如何控制作用域[在这里](/fundamentals/injection-scopes)。

## 异步性

我们喜欢现代 JavaScript，我们知道数据提取大部分是异步的。
这就是为什么 Nest 支持`异步`函数并能很好地工作。

!!! info "了解有关`async/await`特性的更多信息[在这里][kamilmysliwiec]"

[kamilmysliwiec]: https://kamilmysliwiec.com/typescript-2-1-introduction-async-await

每个异步函数都必须返回一个`Promise`。
这意味着您可以返回一个递延值，而 Nest 将能够自行解析该值。
让我们来看一个例子:

=== "cats.controller.ts"

    ```ts
    @Get()
    async findAll(): Promise<any[]> {
      return [];
    }
    ```

=== "cats.controller.js"

    ```js
    @Get()
    async findAll() {
      return [];
    }
    ```

以上代码是完全有效的。
此外，Nest 的路由处理程序更强大，因为它能够返回 RxJS[可观察流](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html)。
Nest 将自动订阅下面的源并获取最后发出的值(一旦流完成)。

=== "cats.controller.ts"

    ```ts
    @Get()
    findAll(): Observable<any[]> {
      return of([]);
    }
    ```

=== "cats.controller.js"

    ```js
    @Get()
    findAll() {
      return of([]);
    }
    ```

以上两种方法都可以工作，您可以使用任何适合您需求的方法。

## 请求的有效载荷

我们前面的 POST 路由处理程序示例不接受任何客户端参数。
让我们通过在这里添加`@Body()`装饰器来修复这个问题。

但首先(如果你使用 TypeScript)，我们需要确定 **DTO** (数据传输对象)模式。
DTO 是一个对象，它定义如何通过网络发送数据。
我们可以通过使用 **TypeScript** 接口或简单的类来确定 DTO 模式。
有趣的是，我们建议在这里使用 **类** 。
为什么?类是 JavaScript ES6 标准的一部分，因此它们在编译后的 JavaScript 中被保留为真实的实体。
另一方面，由于 TypeScript 接口在编译过程中被移除，所以 Nest 不能在运行时引用它们。
这是很重要的，因为像 **Pipes** 这样的功能在运行时访问变量的元类型时，可以提供额外的可能性。

让我们创建`CreateCatDto`类:

```ts title="create-cat.dto"
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

它只有三种基本性质。
然后，我们可以在`CatsController`中使用新创建的 DTO:

=== "cats.controller.ts"

    ```ts
    @Post()
    async create(@Body() createCatDto: CreateCatDto) {
      return 'This action adds a new cat';
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @Bind(Body())
    async create(createCatDto) {
      return 'This action adds a new cat';
    }
    ```

!!! info "我们的`ValidationPipe`可以过滤掉不应该被方法处理程序接收的属性。"

    在这种情况下，我们可以将可接受的属性列入白名单，任何不包括在白名单中的属性将自动从结果对象中删除。
    在`CreateCatDto`示例中，我们的白名单是`name`、`age`和`breed`属性。
    了解更多[这里](https://docs.nestjs.com/techniques/validation#stripping-properties)。

## 处理错误

有一个单独的章节是关于处理错误(例如，处理异常)的[这里](/异常过滤器)。

## 完整的资源示例

下面是一个使用几种可用装饰器创建基本控制器的示例。
这个控制器公开了两个方法来访问和操作内部数据。

=== "cats.controller.ts"

    ```ts
    import {
      Controller,
      Get,
      Query,
      Post,
      Body,
      Put,
      Param,
      Delete,
    } from '@nestjs/common';
    import { CreateCatDto, UpdateCatDto, ListAllEntities } from './dto';

    @Controller('cats')
    export class CatsController {
      @Post()
      create(@Body() createCatDto: CreateCatDto) {
        return 'This action adds a new cat';
      }

      @Get()
      findAll(@Query() query: ListAllEntities) {
        return `This action returns all cats (limit: ${query.limit} items)`;
      }

      @Get(':id')
      findOne(@Param('id') id: string) {
        return `This action returns a #${id} cat`;
      }

      @Put(':id')
      update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
        return `This action updates a #${id} cat`;
      }

      @Delete(':id')
      remove(@Param('id') id: string) {
        return `This action removes a #${id} cat`;
      }
    }
    ```

=== "cats.controller.js"

    ```js
    import {
      Controller,
      Get,
      Query,
      Post,
      Body,
      Put,
      Param,
      Delete,
      Bind,
    } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Post()
      @Bind(Body())
      create(createCatDto) {
        return 'This action adds a new cat';
      }

      @Get()
      @Bind(Query())
      findAll(query) {
        console.log(query);
        return `This action returns all cats (limit: ${query.limit} items)`;
      }

      @Get(':id')
      @Bind(Param('id'))
      findOne(id) {
        return `This action returns a #${id} cat`;
      }

      @Put(':id')
      @Bind(Param('id'), Body())
      update(id, updateCatDto) {
        return `This action updates a #${id} cat`;
      }

      @Delete(':id')
      @Bind(Param('id'))
      remove(id) {
        return `This action removes a #${id} cat`;
      }
    }
    ```

!!! info "**Hint**"

    Nest CLI 提供了一个自动生成所有样板代码的生成器(原理图)，以帮助我们避免做所有这些，并使开发人员体验更简单。
    阅读更多关于这个特性[这里](/recipes/crude-generator)。

## 启动和运行

上面的控制器完全定义后，Nest 仍然不知道`CatsController`存在，因此不会创建该类的实例。

控制器总是属于一个模块，这就是为什么我们在`@Module()`装饰器中包含`Controllers`数组。
因为除了根模块 AppModule，我们还没有定义任何其他模块，我们将使用它来引入`CatsController`:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { CatsController } from './cats/cats.controller';

    @Module({
      controllers: [CatsController],
    })
    export class AppModule {}
    ```

我们使用`@Module()`装饰器将元数据附加到模块类中，现在 Nest 可以轻松地反映必须安装哪些控制器。

## 特有的方法

到目前为止，我们已经讨论了操纵响应的 Nest 标准方法。
操纵响应的第二种方法是使用特定于库的[response object](https://expressjs.com/en/api.html#res)。
为了注入一个特定的响应对象，我们需要使用`@Res()`装饰器。
为了显示差异，让我们重写`CatsController`如下:

=== "TypeScript"

    ```ts
    import { Controller, Get, Post, Res, HttpStatus } from '@nestjs/common';
    import { Response } from 'express';

    @Controller('cats')
    export class CatsController {
      @Post()
      create(@Res() res: Response) {
        res.status(HttpStatus.CREATED).send();
      }

      @Get()
      findAll(@Res() res: Response) {
        res.status(HttpStatus.OK).json([]);
      }
    }
    ```

=== "JavaScript"

    ```js
    import {
      Controller,
      Get,
      Post,
      Bind,
      Res,
      Body,
      HttpStatus,
    } from '@nestjs/common';

    @Controller('cats')
    export class CatsController {
      @Post()
      @Bind(Res(), Body())
      create(res, createCatDto) {
        res.status(HttpStatus.CREATED).send();
      }

      @Get()
      @Bind(Res())
      findAll(res) {
        res.status(HttpStatus.OK).json([]);
      }
    }
    ```

虽然这种方法是可行的，而且实际上通过提供对响应对象的完全控制(头信息处理、特定于库的特性等)在某些方面允许了更大的灵活性，但应该谨慎使用。
一般来说，这种方法不太清晰，确实有一些缺点。
主要缺点是您的代码变得依赖于平台(因为底层库在响应对象上可能有不同的 api)，并且更难测试(您将不得不模拟响应对象，等等)。

此外，在上面的例子中，你失去了与依赖于 Nest 标准响应处理的 Nest 特性的兼容性，例如拦截器和`@HttpCode()`/`@Header()`装饰器。
要解决这个问题，你可以将`passthrough`选项设置为`true`，如下所示:

=== "TypeScript"

    ```ts
    @Get()
    findAll(@Res({ passthrough: true }) res: Response) {
      res.status(HttpStatus.OK);
      return [];
    }
    ```

=== "JavaScript"

    ```js
    @Get()
    @Bind(Res({ passthrough: true }))
    findAll(res) {
      res.status(HttpStatus.OK);
      return [];
    }
    ```

现在您可以与本机响应对象交互(例如，根据特定条件设置 cookie 或 header)，但将其余工作留给框架。
