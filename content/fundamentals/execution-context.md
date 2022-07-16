### 执行上下文

Nest 提供了几个实用程序类，帮助编写跨多个应用上下文的应用程序(例如，Nest 基于 HTTP 服务器、微服务和 WebSockets 应用上下文)。
这些实用程序提供了有关当前执行上下文的信息，可用于构建通用的[guards](/guards)、[filters](/exception-filters)和[interceptors](/interceptors)，它们可以跨广泛的控制器、方法和执行上下文工作。

我们将在本章中介绍两个这样的类:`ArgumentsHost`和`ExecutionContext`。

#### ArgumentsHost 类

`ArgumentsHost`类提供了检索传递给处理程序的参数的方法。
它允许选择适当的上下文(例如，HTTP、RPC(微服务)或 WebSockets)来检索参数。
框架提供了一个`ArgumentsHost`的实例，通常作为`host`参数引用，在你想要访问它的地方。
例如，[异常过滤器](https://docs.nestjs.com/exception-filters#arguments-host)的`catch()`方法是用`ArgumentsHost`实例调用的。

`ArgumentsHost`只是作为处理程序参数的抽象。
例如，对于 HTTP 服务器应用程序(当使用 `@nestjs/platform-express` 时)，`host` 对象封装了 `Express` 的`[request, response, next]`数组，其中`request`是请求对象，`response`是响应对象，而`next`是一个控制应用程序的请求-响应周期的函数。
另一方面，对于[GraphQL](/graphql/quick-start) 应用程序，`host`对象包含`[root, args, context, info]`数组。

#### 当前应用程序上下文

当构建泛型的[guards](/guards)、[filters](/exception-filters)和[interceptors](/interceptors)要在多个应用程序上下文中运行时，我们需要一种方法来确定我们的方法当前运行的应用程序类型。
使用`ArgumentsHost`的`getType()`方法完成:

```typescript
if (host.getType() === 'http') {
  // do something that is only important in the context of regular HTTP requests (REST)
} else if (host.getType() === 'rpc') {
  // do something that is only important in the context of Microservice requests
} else if (host.getType<GqlContextType>() === 'graphql') {
  // do something that is only important in the context of GraphQL requests
}
```

> info **Hint** `GqlContextType`是从`@nestjs/graphql`包中导入的。

有了可用的应用程序类型，我们可以编写更通用的组件，如下所示。

#### 主机处理程序参数

要检索传递给处理器的参数数组，一种方法是使用主机对象的`getArgs()`方法。

```typescript
const [req, res, next] = host.getArgs();
```

你可以使用' getArgByIndex() '方法通过索引提取一个特定的参数:

```typescript
const request = host.getArgByIndex(0);
const response = host.getArgByIndex(1);
```

在这些示例中，我们通过索引检索请求和响应对象，这通常不推荐，因为它将应用程序耦合到特定的执行上下文。
相反，您可以通过使用`host`对象的一个实用方法切换到应用程序的适当的应用程序上下文，从而使您的代码更加健壮和可重用。
上下文切换实用程序方法如下所示。

```typescript
/**
 * Switch context to RPC.
 */
switchToRpc(): RpcArgumentsHost;
/**
 * Switch context to HTTP.
 */
switchToHttp(): HttpArgumentsHost;
/**
 * Switch context to WebSockets.
 */
switchToWs(): WsArgumentsHost;
```

让我们使用`switchToHttp()`方法重写前面的示例。
`host.switchToHttp()` helper 调用返回一个适合于 HTTP 应用上下文的`HttpArgumentsHost`对象。
`HttpArgumentsHost`对象有两个有用的方法，我们可以用来提取所需的对象。
在本例中，我们还使用 `Express` 类型断言来返回原生的 `Express` 类型对象:

```typescript
const ctx = host.switchToHttp();
const request = ctx.getRequest<Request>();
const response = ctx.getResponse<Response>();
```

类似地，`WsArgumentsHost`和`RpcArgumentsHost`有方法在微服务和 `WebSockets` 上下文中返回适当的对象。
下面是`WsArgumentsHost`的方法:

```typescript
export interface WsArgumentsHost {
  /**
   * Returns the data object.
   */
  getData<T>(): T;
  /**
   * Returns the client object.
   */
  getClient<T>(): T;
}
```

以下是 `RpcArgumentsHost` 的方法:

```typescript
export interface RpcArgumentsHost {
  /**
   * Returns the data object.
   */
  getData<T>(): T;

  /**
   * Returns the context object.
   */
  getContext<T>(): T;
}
```

#### ExecutionContext 类

`ExecutionContext`扩展`ArgumentsHost`，提供关于当前执行过程的额外细节。
与`ArgumentsHost`一样，Nest 在你可能需要它的地方提供了一个`ExecutionContext`实例，比如在[守卫](https://docs.nestjs.com/guards)的 `canActivate()` 方法和[拦截器](https://docs.nestjs.com/interceptors)的 `intercept()` 方法中。

提供如下方法:

```typescript
export interface ExecutionContext extends ArgumentsHost {
  /**
   * 返回当前处理器所属的控制器类的类型。
   */
  getClass<T>(): Type<T>;
  /**
   * 返回对接下来将在请求管道中调用的处理程序(方法)的引用。
   */
  getHandler(): Function;
}
```

- `getHandler()`方法返回对即将被调用的处理程序的引用。
- `getClass()`方法返回此特定处理程序所属的`Controller`类的类型。

例如，在 `HTTP` 上下文中，如果当前处理的请求是一个`POST`请求，绑定到`CatsController`上的`create()`方法，`getHandler()`返回一个对`create()`方法的引用，`getClass()`返回`CatsController` **类型**(不是实例)。

```typescript
const methodKey = ctx.getHandler().name; // "create"
const className = ctx.getClass().name; // "CatsController"
```

访问当前类和处理程序方法的引用的能力提供了极大的灵活性。
最重要的是，它让我们有机会通过`@SetMetadata()`装饰器从守卫或拦截器中访问元数据集。
我们将在下面讨论这个用例。

#### 反射和元数据

`Nest` 提供了通过`@SetMetadata()`装饰器将**定制元数据**连接到路由处理程序的能力。
然后，我们可以从类中访问这些元数据来做出某些决定。

```typescript
@@filename(cats.controller)
@Post()
@SetMetadata('roles', ['admin'])
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
@SetMetadata('roles', ['admin'])
@Bind(Body())
async create(createCatDto) {
  this.catsService.create(createCatDto);
}
```

> info **Hint** `@SetMetadata()` 装饰器是从 `@nestjs/common` 包中导入的。

在上面的构造中，我们将`roles`元数据(`roles`是一个元数据键，`['admin']`是关联值)附加到`create()`方法中。
虽然这可以工作，但在你的路由中直接使用`@SetMetadata()`并不是一个好习惯。
相反，创建你自己的装饰器，如下所示:

```typescript
@@filename(roles.decorator)
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
@@switch
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles) => SetMetadata('roles', roles);
```

这种方法更清晰，可读性更强，并且是强类型的。
现在我们有了一个自定义的`@Roles()`装饰器，我们可以用它来装饰`create()`方法。

```typescript
@@filename(cats.controller)
@Post()
@Roles('admin')
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
@@switch
@Post()
@Roles('admin')
@Bind(Body())
async create(createCatDto) {
  this.catsService.create(createCatDto);
}
```

为了访问路由的角色(自定义元数据)，我们将使用`Reflector` helper 类，它是由框架提供的，并从`@nestjs/core`包中公开。
`Reflector`可以通过正常的方式注入到类中:

```typescript
@@filename(roles.guard)
@Injectable()
export class RolesGuard {
  constructor(private reflector: Reflector) {}
}
@@switch
@Injectable()
@Dependencies(Reflector)
export class CatsService {
  constructor(reflector) {
    this.reflector = reflector;
  }
}
```

> info **Hint** `Reflector`类是从`@nestjs/core`包中导入的。

现在，要读取处理器元数据，请使用`get()`方法。

```typescript
const roles = this.reflector.get<string[]>('roles', context.getHandler());
```

' Reflector#get '方法允许我们通过传入两个参数来轻松访问元数据:一个元数据**key**和一个**context**(装饰器目标)来检索元数据。
在这个例子中，指定的**key**是`roles`(请参阅上面的`roles.decorator.ts`文件和那里的`SetMetadata()`调用)。
上下文是通过调用`context.gethandler()`来提供的，它会为当前处理的路由处理程序提取元数据。
记住，`getHandler()`给了我们一个路由处理函数的\*\*引用。

或者，我们可以通过在控制器级别应用元数据来组织我们的控制器，应用到控制器类中的所有路由。

```typescript
@@filename(cats.controller)
@Roles('admin')
@Controller('cats')
export class CatsController {}
@@switch
@Roles('admin')
@Controller('cats')
export class CatsController {}
```

在这种情况下，要提取控制器元数据，我们传递`context.getclass()`作为第二个参数(以提供控制器类作为元数据提取的上下文)，而不是`context.gethandler ()`:

```typescript
@@filename(roles.guard)
const roles = this.reflector.get<string[]>('roles', context.getClass());
@@switch
const roles = this.reflector.get('roles', context.getClass());
```

由于能够在多个级别提供元数据，您可能需要从多个上下文提取和合并元数据。
`Reflector`类提供了两个实用工具方法来帮助实现这一点。
这些方法同时提取控制器和方法元数据，并以不同的方式组合它们。

考虑以下场景，您在两个级别上都提供了“角色”元数据。

```typescript
@@filename(cats.controller)
@Roles('user')
@Controller('cats')
export class CatsController {
  @Post()
  @Roles('admin')
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }
}
@@switch
@Roles('user')
@Controller('cats')
export class CatsController {}
  @Post()
  @Roles('admin')
  @Bind(Body())
  async create(createCatDto) {
    this.catsService.create(createCatDto);
  }
}
```

如果您的意图是指定`user`作为默认角色，并有选择地为某些方法覆盖它，您可能会使用`getAllAndOverride()`方法。

```typescript
const roles = this.reflector.getAllAndOverride<string[]>('roles', [
  context.getHandler(),
  context.getClass(),
]);
```

带有此代码的守卫，运行在`create()`方法的上下文中，带有上述元数据，将导致`role`包含`['admin']`。

要获取两者的元数据并合并它(该方法将数组和对象合并)，使用`getAllAndMerge()`方法:

```typescript
const roles = this.reflector.getAllAndMerge<string[]>('roles', [
  context.getHandler(),
  context.getClass(),
]);
```

这将导致`role`包含`['user'， 'admin']`。

对于这两个 `merge` 方法，你传递元数据作为第一个参数，传递元数据目标上下文数组(例如，调用`getHandler()`和/或`getClass()`方法))作为第二个参数。
