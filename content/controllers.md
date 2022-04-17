### 控制器

控制器负责处理传入的**请求**并返回**响应**给客户端。

<figure><img src="/assets/Controllers_1.png" /></figure>

控制器的作用是接收应用程序的特定请求。
**路由**机制控制哪个控制器接收哪个请求。
通常，每个控制器有多个路由，不同的路由可以执行不同的操作。

为了创建一个基本控制器，我们使用类和**装饰器**。
装饰器将类与所需的元数据关联起来，并使 Nest 能够创建路由映射(将请求绑定到相应的控制器)。

> info **Hint** 为了使用内置的[验证](https://docs.nestjs.com/techniques/validation)快速创建 CRUD 控制器，您可以使用 CLI 的[CRUD 生成器](https://docs.nestjs.com/recipes/crud-generator#crud-generator): `nest g resource [name]`.

#### 路由

在下面的例子中，我们将使用`@Controller()`装饰器，它是定义一个基本控制器所必需的。
我们将指定一个可选的路由路径前缀`cats`。
在`@Controller()`装饰器中使用路径前缀可以让我们轻松地对一组相关的路由进行分组，并最小化重复代码。
例如，我们可以选择将一组管理与客户实体交互的路由分组在路由`/customers`下。
在这种情况下，我们可以在`@Controller()`装饰器中指定路径前缀`customers`，这样我们就不必为文件中的每个路由重复这部分路径。

```typescript
@@filename(cats.controller)
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
@@switch
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll() {
    return 'This action returns all cats';
  }
}
```

> info **Hint** 要使用 CLI 创建控制器，只需执行`$ nest g controller cats`命令。

在`findAll()`方法之前的`@Get()` HTTP 请求方法装饰器告诉 Nest 为 HTTP 请求的特定端点创建处理程序。
端点对应于 HTTP 请求方法(在本例中为 GET)和路由路径。
什么是路由路径?
处理程序的路由路径是通过连接为控制器声明的(可选的)前缀和方法装饰器中指定的任何路径来确定的。
因为我们为每个路由声明了前缀(`cats`)，并且没有在装饰器中添加任何路径信息，所以 Nest 将把`GET /cats`请求映射到这个处理程序。
如前所述，路径既包括可选的控制器路径前缀，**也**包括请求方法装饰器中声明的任何路径字符串。
例如，路径前缀`customers`结合装饰器`@Get('profile')`将为`GET /customers/profile`等请求生成路由映射。

在上面的示例中，当向该端点发出 GET 请求时，Nest 将该请求路由到用户定义的`findAll()`方法。
注意，我们在这里选择的方法名完全是任意的。
显然，我们必须声明一个方法来绑定路由，但是 Nest 不会给选择的方法名赋予任何意义。

该方法将返回一个 200 状态码和相关的响应，在本例中只是一个字符串。
为什么会这样?
为了解释，我们首先介绍 Nest 使用两种**不同的**选项来操纵响应的概念:

<table>
  <tr>
    <td>标准 (推荐)</td>
    <td>
      Using this built-in method, when a request handler returns a JavaScript object or array, 
      it will <strong>automatically</strong>be serialized to JSON.
      When it returns a JavaScript primitive type (e.g., <code>string</code>, <code>number</code>, <code>boolean</code>), 
      however, Nest will send just the value without attempting to serialize it.
      This makes response handling simple: just return the value, and Nest takes care of the rest.<br /><br /> 
      Furthermore, the response's <strong>status code</strong> is always 200 by default, except for POST requests which use 201.
      We can easily change this behavior by adding the <code>@HttpCode(...)</code> decorator at a handler-level (see <a href='controllers#status-code'>Status codes</a>).
    </td>
  </tr>
  <tr>
    <td>库指定</td>
    <td>
      We can use the library-specific (e.g., Express) <a href="https://expressjs.com/en/api.html#res" rel="nofollow" target="_blank">response object</a>, which can be injected using the <code>@Res()</code> decorator in the method handler signature (e.g., <code>findAll(@Res() response)</code>).
      With this approach, you have the ability to use the native response handling methods exposed by that object.
      For example, with Express, you can construct responses using code like <code>response.status(200).send()</code>.
    </td>
  </tr>
</table>

> warning **Warning** Nest detects when the handler is using either `@Res()` or `@Next()`, indicating you have chosen the library-specific option.
> If both approaches are used at the same time, the Standard approach is **automatically disabled** for this single route and will no longer work as expected.
> To use both approaches at the same time (for example, by injecting the response object to only set cookies/headers but still leave the rest to the framework), you must set the `passthrough` option to `true` in the `@Res({{ '{' }} passthrough: true {{ '}' }})` decorator.

#### 请求对象

处理程序通常需要访问客户端**请求**细节。
Nest 提供了对底层平台(默认为 Express)的[请求对象](https://expressjs.com/en/api.html#req)的访问。
我们可以通过在处理程序的签名中添加 `@Req()` 装饰器来指示 Nest 注入请求对象来访问请求对象。

```typescript
@@filename(cats.controller)
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(@Req() request: Request): string {
    return 'This action returns all cats';
  }
}
@@switch
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

> info **Hint** 为了利用`express`类型(如上面的`request: request`参数示例)，安装`@types/express`包。

The request object represents the HTTP request and has properties for the request query string, parameters, HTTP headers, and body (read more [here](https://expressjs.com/en/api.html#req)).
In most cases, it's not necessary to grab these properties manually.
We can use dedicated decorators instead, such as `@Body()` or `@Query()`, which are available out of the box.
Below is a list of the provided decorators and the plain platform-specific objects they represent.

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

<sup>\* </sup>
For compatibility with typings across underlying HTTP platforms (e.g., Express and Fastify), Nest provides `@Res()` and `@Response()` decorators.
`@Res()` is simply an alias for `@Response()`.
Both directly expose the underlying native platform `response` object interface.
When using them, you should also import the typings for the underlying library (e.g., `@types/express`) to take full advantage.
Note that when you inject either `@Res()` or `@Response()` in a method handler, you put Nest into **Library-specific mode** for that handler, and you become responsible for managing the response.
When doing so, you must issue some kind of response by making a call on the `response` object (e.g., `res.json(...)` or `res.send(...)`), or the HTTP server will hang.

> info **Hint** To learn how to create your own custom decorators, visit [this](/custom-decorators) chapter.

#### 资源

Earlier, we defined an endpoint to fetch the cats resource (**GET** route).
We'll typically also want to provide an endpoint that creates new records.
For this, let's create the **POST** handler:

```typescript
@@filename(cats.controller)
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
@@switch
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

It's that simple.
Nest provides decorators for all of the standard HTTP methods: `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`, `@Options()`, and `@Head()`.
In addition, `@All()` defines an endpoint that handles all of them.

#### 泛路由

Pattern based routes are supported as well.
For instance, the asterisk is used as a wildcard, and will match any combination of characters.

```typescript
@Get('ab*cd')
findAll() {
  return 'This route uses a wildcard';
}
```

The `'ab*cd'` route path will match `abcd`, `ab_cd`, `abecd`, and so on.
The characters `?`, `+`, `*`, and `()` may be used in a route path, and are subsets of their regular expression counterparts.
The hyphen ( `-`) and the dot (`.`) are interpreted literally by string-based paths.

#### 状态码

As mentioned, the response **status code** is always **200** by default, except for POST requests which are **201**.
We can easily change this behavior by adding the `@HttpCode(...)` decorator at a handler level.

```typescript
@Post()
@HttpCode(204)
create() {
  return 'This action adds a new cat';
}
```

> info **Hint** Import `HttpCode` from the `@nestjs/common` package.

Often, your status code isn't static but depends on various factors.
In that case, you can use a library-specific **response** (inject using `@Res()`) object (or, in case of an error, throw an exception).

#### 头部

To specify a custom response header, you can either use a `@Header()` decorator or a library-specific response object (and call `res.header()` directly).

```typescript
@Post()
@Header('Cache-Control', 'none')
create() {
  return 'This action adds a new cat';
}
```

> info **Hint** Import `Header` from the `@nestjs/common` package.

#### 重定向

To redirect a response to a specific URL, you can either use a `@Redirect()` decorator or a library-specific response object (and call `res.redirect()` directly).

`@Redirect()` takes two arguments, `url` and `statusCode`, both are optional.
The default value of `statusCode` is `302` (`Found`) if omitted.

```typescript
@Get()
@Redirect('https://nestjs.com', 301)
```

Sometimes you may want to determine the HTTP status code or the redirect URL dynamically.
Do this by returning an object from the route handler method with the shape:

```json
{
  "url": string,
  "statusCode": number
}
```

Returned values will override any arguments passed to the `@Redirect()` decorator.
For example:

```typescript
@Get('docs')
@Redirect('https://docs.nestjs.com', 302)
getDocs(@Query('version') version) {
  if (version && version === '5') {
    return { url: 'https://docs.nestjs.com/v5/' };
  }
}
```

#### 路由参数

Routes with static paths won't work when you need to accept **dynamic data** as part of the request (e.g., `GET /cats/1` to get cat with id `1`).
In order to define routes with parameters, we can add route parameter **tokens** in the path of the route to capture the dynamic value at that position in the request URL.
The route parameter token in the `@Get()` decorator example below demonstrates this usage.
Route parameters declared in this way can be accessed using the `@Param()` decorator, which should be added to the method signature.

```typescript
@@filename()
@Get(':id')
findOne(@Param() params): string {
  console.log(params.id);
  return `This action returns a #${params.id} cat`;
}
@@switch
@Get(':id')
@Bind(Param())
findOne(params) {
  console.log(params.id);
  return `This action returns a #${params.id} cat`;
}
```

`@Param()` is used to decorate a method parameter (`params` in the example above), and makes the **route** parameters available as properties of that decorated method parameter inside the body of the method.
As seen in the code above, we can access the `id` parameter by referencing `params.id`.
You can also pass in a particular parameter token to the decorator, and then reference the route parameter directly by name in the method body.

> info **Hint** Import `Param` from the `@nestjs/common` package.

```typescript
@@filename()
@Get(':id')
findOne(@Param('id') id: string): string {
  return `This action returns a #${id} cat`;
}
@@switch
@Get(':id')
@Bind(Param('id'))
findOne(id) {
  return `This action returns a #${id} cat`;
}
```

#### 子域路由

The `@Controller` decorator can take a `host` option to require that the HTTP host of the incoming requests matches some specific value.

```typescript
@Controller({ host: 'admin.example.com' })
export class AdminController {
  @Get()
  index(): string {
    return 'Admin page';
  }
}
```

> **Warning** Since **Fastify** lacks support for nested routers, when using sub-domain routing, the (default) Express adapter should be used instead.

Similar to a route `path`, the `hosts` option can use tokens to capture the dynamic value at that position in the host name.
The host parameter token in the `@Controller()` decorator example below demonstrates this usage.
Host parameters declared in this way can be accessed using the `@HostParam()` decorator, which should be added to the method signature.

```typescript
@Controller({ host: ':account.example.com' })
export class AccountController {
  @Get()
  getInfo(@HostParam('account') account: string) {
    return account;
  }
}
```

#### 范围

For people coming from different programming language backgrounds, it might be unexpected to learn that in Nest, almost everything is shared across incoming requests.
We have a connection pool to the database, singleton services with global state, etc.
Remember that Node.js doesn't follow the request/response Multi-Threaded Stateless Model in which every request is processed by a separate thread.
Hence, using singleton instances is fully **safe** for our applications.

However, there are edge-cases when request-based lifetime of the controller may be the desired behavior, for instance per-request caching in GraphQL applications, request tracking or multi-tenancy.
Learn how to control scopes [here](/fundamentals/injection-scopes).

#### Asynchronicity

We love modern JavaScript and we know that data extraction is mostly **asynchronous**.
That's why Nest supports and works well with `async` functions.

> info **Hint** Learn more about `async / await` feature [here](https://kamilmysliwiec.com/typescript-2-1-introduction-async-await)

Every async function has to return a `Promise`.
This means that you can return a deferred value that Nest will be able to resolve by itself.
Let's see an example of this:

```typescript
@@filename(cats.controller)
@Get()
async findAll(): Promise<any[]> {
  return [];
}
@@switch
@Get()
async findAll() {
  return [];
}
```

The above code is fully valid.
Furthermore, Nest route handlers are even more powerful by being able to return RxJS [observable streams](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html).
Nest will automatically subscribe to the source underneath and take the last emitted value (once the stream is completed).

```typescript
@@filename(cats.controller)
@Get()
findAll(): Observable<any[]> {
  return of([]);
}
@@switch
@Get()
findAll() {
  return of([]);
}
```

Both of the above approaches work and you can use whatever fits your requirements.

#### Request payloads

Our previous example of the POST route handler didn't accept any client params.
Let's fix this by adding the `@Body()` decorator here.

But first (if you use TypeScript), we need to determine the **DTO** (Data Transfer Object) schema.
A DTO is an object that defines how the data will be sent over the network.
We could determine the DTO schema by using **TypeScript** interfaces, or by simple classes.
Interestingly, we recommend using **classes** here.
Why? Classes are part of the JavaScript ES6 standard, and therefore they are preserved as real entities in the compiled JavaScript.
On the other hand, since TypeScript interfaces are removed during the transpilation, Nest can't refer to them at runtime.
This is important because features such as **Pipes** enable additional possibilities when they have access to the metatype of the variable at runtime.

Let's create the `CreateCatDto` class:

```typescript
@@filename(create-cat.dto)
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

It has only three basic properties.
Thereafter we can use the newly created DTO inside the `CatsController`:

```typescript
@@filename(cats.controller)
@Post()
async create(@Body() createCatDto: CreateCatDto) {
  return 'This action adds a new cat';
}
@@switch
@Post()
@Bind(Body())
async create(createCatDto) {
  return 'This action adds a new cat';
}
```

> info **Hint** Our `ValidationPipe` can filter out properties that should not be received by the method handler.
> In this case, we can whitelist the acceptable properties, and any property not included in the whitelist is automatically stripped from the resulting object.
> In the `CreateCatDto` example, our whitelist is the `name`, `age`, and `breed` properties.
> Learn more [here](https://docs.nestjs.com/techniques/validation#stripping-properties).

#### 处理错误

There's a separate chapter about handling errors (i.e., working with exceptions) [here](/exception-filters).

#### 完整的资源示例

Below is an example that makes use of several of the available decorators to create a basic controller.
This controller exposes a couple of methods to access and manipulate internal data.

```typescript
@@filename(cats.controller)
import { Controller, Get, Query, Post, Body, Put, Param, Delete } from '@nestjs/common';
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
@@switch
import { Controller, Get, Query, Post, Body, Put, Param, Delete, Bind } from '@nestjs/common';

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

> info **Hint** Nest CLI provides a generator (schematic) that automatically generates **all the boilerplate code** to help us avoid doing all of this, and make the developer experience much simpler.
> Read more about this feature [here](/recipes/crud-generator).

#### 启动和运行

With the above controller fully defined, Nest still doesn't know that `CatsController` exists and as a result won't create an instance of this class.

Controllers always belong to a module, which is why we include the `controllers` array within the `@Module()` decorator.
Since we haven't yet defined any other modules except the root `AppModule`, we'll use that to introduce the `CatsController`:

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { CatsController } from './cats/cats.controller';

@Module({
  controllers: [CatsController],
})
export class AppModule {}
```

We attached the metadata to the module class using the `@Module()` decorator, and Nest can now easily reflect which controllers have to be mounted.

<app-banner-shop></app-banner-shop>

#### 特有的方法

So far we've discussed the Nest standard way of manipulating responses.
The second way of manipulating the response is to use a library-specific [response object](https://expressjs.com/en/api.html#res).
In order to inject a particular response object, we need to use the `@Res()` decorator.
To show the differences, let's rewrite the `CatsController` to the following:

```typescript
@@filename()
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
@@switch
import { Controller, Get, Post, Bind, Res, Body, HttpStatus } from '@nestjs/common';

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

Though this approach works, and does in fact allow for more flexibility in some ways by providing full control of the response object (headers manipulation, library-specific features, and so on), it should be used with care.
In general, the approach is much less clear and does have some disadvantages.
The main disadvantage is that your code becomes platform-dependent (as underlying libraries may have different APIs on the response object), and harder to test (you'll have to mock the response object, etc.).

Also, in the example above, you lose compatibility with Nest features that depend on Nest standard response handling, such as Interceptors and `@HttpCode()` / `@Header()` decorators.
To fix this, you can set the `passthrough` option to `true`, as follows:

```typescript
@@filename()
@Get()
findAll(@Res({ passthrough: true }) res: Response) {
  res.status(HttpStatus.OK);
  return [];
}
@@switch
@Get()
@Bind(Res({ passthrough: true }))
findAll(res) {
  res.status(HttpStatus.OK);
  return [];
}
```

Now you can interact with the native response object (for example, set cookies or headers depending on certain conditions), but leave the rest to the framework.
