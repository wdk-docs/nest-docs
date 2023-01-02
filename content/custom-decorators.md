# 定制装饰器

Nest 是围绕一个称为装饰器的语言特性构建的。
在许多常用的编程语言中，装饰器是一个众所周知的概念，但在 JavaScript 世界中，它们仍然相对较新。
为了更好地理解装饰器是如何工作的，我们建议阅读[这篇文章](https://medium.com/google-developers/exploring-es7-decorators-76ecb65fb841)。
下面是一个简单的定义:

!!! quote

    ES2016 装饰器是一个返回函数的表达式，可以将目标、名称和属性描述符作为参数。
    你可以通过在装饰器前面加上一个`@`字符来应用它，并把这个放在 what 的最上面
    你在尝试装饰。
    可以为类、方法或属性定义装饰器。

## Param 装饰器

Nest 提供了一组有用的参数装饰器，可以与 HTTP 路由处理程序一起使用。
下面是所提供的装饰器和它们所代表的普通 Express(或 Fastify)对象的列表

<table>
  <tbody>
    <tr>
      <td><code>@Request(), @Req()</code></td>
      <td><code>req</code></td>
    </tr>
    <tr>
      <td><code>@Response(), @Res()</code></td>
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
      <td><code>@Param(param?: string)</code></td>
      <td><code>req.params</code> / <code>req.params[param]</code></td>
    </tr>
    <tr>
      <td><code>@Body(param?: string)</code></td>
      <td><code>req.body</code> / <code>req.body[param]</code></td>
    </tr>
    <tr>
      <td><code>@Query(param?: string)</code></td>
      <td><code>req.query</code> / <code>req.query[param]</code></td>
    </tr>
    <tr>
      <td><code>@Headers(param?: string)</code></td>
      <td><code>req.headers</code> / <code>req.headers[param]</code></td>
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

此外，您还可以创建自己的 **自定义装饰器**。为什么这个有用?

在 node.js 世界中，将属性附加到 **request** 对象是一种常见的做法。
然后在每个路由处理程序中手动提取它们，使用如下代码:

```typescript
const user = req.user;
```

为了让你的代码更具可读性和透明度，你可以创建一个`@User()`装饰器，并在你所有的控制器中重用它。

```typescript title="user.decorator.ts"
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

然后，您可以在任何适合您需求的地方使用它。

=== "TypeScript"

    ```typescript
    @Get()
    async findOne(@User() user: UserEntity) {
      console.log(user);
    }
    ```

=== "JavaScript"

    ```javascript
    @Get()
    @Bind(User())
    async findOne(user) {
      console.log(user);
    }
    ```

## 传递数据

当装饰器的行为依赖于某些条件时，可以使用`data`形参将参数传递给装饰器的工厂函数。
其中一个用例是自定义装饰器，它根据键从请求对象中提取属性。
让我们假设，例如，我们的[身份验证层](techniques/authentication#implementing-passport-strategies)验证请求并将用户实体附加到请求对象。
经过身份验证的请求的用户实体可能如下所示:

```json
{
  "id": 101,
  "firstName": "Alan",
  "lastName": "Turing",
  "email": "alan@email.com",
  "roles": ["admin"]
}
```

让我们定义一个装饰器，它接受属性名作为键，如果它存在，则返回相关值(如果它不存在，或者`user`对象尚未创建，则未定义)。

=== "user.decorator.ts"

    ```typescript
    import { createParamDecorator, ExecutionContext } from '@nestjs/common';

    export const User = createParamDecorator(
      (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        return data ? user?.[data] : user;
      },
    );
    ```

=== "user.decorator.js"

    ```javascript
    import { createParamDecorator } from '@nestjs/common';

    export const User = createParamDecorator((data, ctx) => {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user;

      return data ? user && user[data] : user;
    });
    ```

下面是你如何通过控制器中的`@User()`装饰器访问一个特定的属性:

=== "TypeScript"

    ```typescript
    @@filename()
    @Get()
    async findOne(@User('firstName') firstName: string) {
      console.log(`Hello ${firstName}`);
    }
    ```

=== "JavaScript"

    ```js
    @Get()
    @Bind(User('firstName'))
    async findOne(firstName) {
      console.log(`Hello ${firstName}`);
    }
    ```

您可以使用相同的装饰器与不同的键来访问不同的属性。
如果 `user` 对象较深或复杂，这可以使请求处理程序实现更容易和更可读。

!!! info "**Hint**"

    对于TypeScript用户，请注意`createParamDecorator<T>()`是一个泛型。
    这意味着您可以显式地强制类型安全，例如`createParamDecorator<string>((data, ctx) => ...)`。
    或者，在工厂函数中指定一个参数类型，例如`createParamDecorator((data: string, ctx) => ...)`。
    如果省略两者，`data`的类型将是`any`。

## 使用管道

Nest 以与内置参数(`@Body()`, `@Param()` and `@Query()`)相同的方式对待自定义参数装饰器。
这意味着管道也为自定义带注释的参数(在我们的例子中，`user`参数)执行。
此外，你可以将管道直接应用到自定义装饰器:

=== "TypeScript"

    ```typescript
    @Get()
    async findOne(
      @User(new ValidationPipe({ validateCustomDecorators: true }))
      user: UserEntity,
    ) {
      console.log(user);
    }
    ```

=== "JavaScript"

    ```js
    @Get()
    @Bind(User(new ValidationPipe({ validateCustomDecorators: true })))
    async findOne(user) {
      console.log(user);
    }
    ```

!!! info

    注意`validateCustomDecorators`选项必须设置为true。
    `ValidationPipe`默认情况下不验证用自定义装饰器注释的参数。

## 装饰器组成

Nest 提供了一个辅助方法来组合多个装饰器。
例如，假设您希望将与身份验证相关的所有装饰器组合为一个装饰器。
这可以通过以下构造来实现:

=== "auth.decorator.ts"

    ```typescript
    import { applyDecorators } from '@nestjs/common';

    export function Auth(...roles: Role[]) {
      return applyDecorators(
        SetMetadata('roles', roles),
        UseGuards(AuthGuard, RolesGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: 'Unauthorized' }),
      );
    }
    ```

=== "auth.decorator.js"

    ```js
    import { applyDecorators } from '@nestjs/common';

    export function Auth(...roles) {
      return applyDecorators(
        SetMetadata('roles', roles),
        UseGuards(AuthGuard, RolesGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: 'Unauthorized' }),
      );
    }
    ```

然后你可以使用这个自定义的`@Auth()`装饰器，如下所示:

```typescript
@Get('users')
@Auth('admin')
findAllUsers() {}
```

这样做的效果是用一个声明应用所有四个装饰器。

!!! warning

    来自`@nestjs/swagger` 包的`@ApiHideProperty()`装饰器是不可组合的，不能与`applyDecorators`函数正常工作。
