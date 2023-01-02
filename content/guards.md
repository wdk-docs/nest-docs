# 警卫

守卫是一个带有 `@Injectable()` 装饰器的类。守卫应该实现 `CanActivate` 接口。

<figure><img src="/assets/Guards_1.png" /></figure>

警卫只有一个职责。
它们根据运行时出现的某些条件(如权限、角色、acl 等)来决定给定的请求是否会被路由处理程序处理。
这通常被称为 **授权** 。
在传统的 Express 应用程序中，授权(以及它通常与之协作的同类认证)通常是由[middleware](/middleware)处理的。
中间件是身份验证的好选择，因为像令牌验证和向 `请求` 对象附加属性这样的事情与特定的路由上下文(及其元数据)没有强连接。

但是中间件从本质上来说是愚蠢的。
它不知道调用 `next()` 函数后将执行哪个处理程序。
另一方面， **守卫** 可以访问 `ExecutionContext` 实例，因此确切地知道接下来要执行什么。
它们的设计很像异常过滤器、管道和拦截器，允许您在请求/响应周期的正确位置插入处理逻辑，并且以声明的方式这样做。
这有助于保持代码的 DRY 和声明性。

!!! info "**Hint**"

    守卫在每个中间件之后执行，在任何拦截器或管道之前执行。

## 授权保护

如前所述， **authorization** 是 guard 的一个很好的用例，因为只有当调用者(通常是一个经过身份验证的特定用户)具有足够的权限时，特定路由才应该可用。
我们现在要构建的 `AuthGuard` 假设用户通过了身份验证(因此，一个令牌被附加到请求头)。
它将提取并验证令牌，并使用提取的信息来确定请求是否可以继续。

=== "auth.guard.ts"

    ```ts
    import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
    import { Observable } from 'rxjs';

    @Injectable()
    export class AuthGuard implements CanActivate {
      canActivate(
        context: ExecutionContext,
      ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        return validateRequest(request);
      }
    }
    ```

=== "auth.guard.js"

    ```js
    import { Injectable } from '@nestjs/common';

    @Injectable()
    export class AuthGuard {
      async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        return validateRequest(request);
      }
    }
    ```

!!! info "**Hint**"

    如果你正在寻找一个关于如何在你的应用中实现认证机制的真实例子，请访问[本章](/security/authentication)。
    同样，对于更复杂的授权示例，请检查[this page](/security/authorization)。

`validateRequest()` 函数内部的逻辑可以根据需要简单或复杂。
这个示例的主要目的是展示守卫如何适应请求/响应周期。

每个守卫都必须实现一个 `canActivate()` 函数。
这个函数应该返回一个布尔值，表示是否允许当前请求。
它可以同步或异步地返回响应(通过 `Promise` 或 `Observable` )。
Nest 使用返回值来控制下一个动作:

- 如果返回 `true` ，请求将被处理。
- 如果返回 `false` ，Nest 将拒绝请求。

## 执行上下文

`canActivate()` 函数只接受一个参数，即 `ExecutionContext` 实例。
`ExecutionContext` 继承自 `ArgumentsHost` 。
我们在前面的异常过滤器一章中见过 `ArgumentsHost` 。
在上面的示例中，我们只是使用了与前面使用的在 `ArgumentsHost` 上定义的相同的 helper 方法来获取对 `Request` 对象的引用。
你可以参考[异常过滤器](https://docs.nestjs.com/exception-filters#arguments-host)章节的 **Arguments host** 来了解更多关于这个主题的信息。

通过扩展 `ArgumentsHost` ， `ExecutionContext` 还添加了几个新的 helper 方法，它们提供了关于当前执行过程的额外细节。
这些细节可以帮助构建更通用的保护，这些保护可以跨一组广泛的控制器、方法和执行上下文工作。
了解有关 `ExecutionContext` 的更多信息[在这里](/fundamentals/execution-context)。

## 基于角色的验证

让我们构建一个功能更强大的保护程序，它只允许具有特定角色的用户访问。
我们将从一个基本的保护模板开始，并在接下来的部分中构建它。
目前，它允许所有请求继续:

=== "roles.guard.ts"

    ```ts
    import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
    import { Observable } from 'rxjs';

    @Injectable()
    export class RolesGuard implements CanActivate {
      canActivate(
        context: ExecutionContext,
      ): boolean | Promise<boolean> | Observable<boolean> {
        return true;
      }
    }
    ```

=== "roles.guard.js"

    ```js
    import { Injectable } from '@nestjs/common';

    @Injectable()
    export class RolesGuard {
      canActivate(context) {
        return true;
      }
    }
    ```

## 绑定警卫

与管道和异常过滤器一样，守卫可以是控制器作用域、方法作用域或全局作用域的。
下面，我们使用 `@UseGuards()` 装饰器来设置一个控制器作用域的守卫。
该修饰符可以接受单个参数，也可以接受逗号分隔的参数列表。
这使您可以通过一个声明轻松地应用适当的保护集。

=== "TypeScript"

    ```ts
    @Controller('cats')
    @UseGuards(RolesGuard)
    export class CatsController {}
    ```

!!! info "**Hint**"

    `@UseGuards()` 装饰器是从 `@nestjs/common` 包中导入的。

上面，我们传递了 `RolesGuard` 类型(而不是一个实例)，将实例化的责任留给框架，并启用依赖注入。
与管道和异常过滤器一样，我们也可以传递一个就地实例:

=== "TypeScript"

    ```ts
    @Controller('cats')
    @UseGuards(new RolesGuard())
    export class CatsController {}
    ```

上面的结构将警卫附加到由这个控制器声明的每个处理程序上。
如果我们希望这个守卫只应用于一个方法，我们可以在 **方法级别** 应用 `@UseGuards()` 装饰器。

为了建立全局守卫，使用 Nest 应用实例的 `useGlobalGuards()` 方法:

=== "TypeScript"

    ```ts
    const app = await NestFactory.create(AppModule);
    app.useGlobalGuards(new RolesGuard());
    ```

!!! warning

    在混合应用的情况下， `useGlobalGuards()` 方法默认不会为网关和微服务设置守卫(参见[hybrid application](/faq/hybrid-application)了解如何改变这种行为)。

> 对于 `标准` (非混合)微服务应用， `useGlobalGuards()` 确实在全球安装了守卫。

全局保护在整个应用程序中使用，用于每个控制器和每个路由处理程序。
在依赖项注入方面，从任何模块外部注册的全局守卫(如上面示例中的 `useGlobalGuards()` )不能注入依赖项，因为这是在任何模块的上下文之外完成的。
为了解决这个问题，你可以使用以下结构直接从任何模块设置一个守卫:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { APP_GUARD } from '@nestjs/core';

    @Module({
      providers: [
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
    })
    export class AppModule {}
    ```

!!! info "**Hint**"

    当使用这种方法为守卫执行依赖注入时，请注意，无论使用这种构造的模块是什么，该守卫实际上都是全局的。
    这应该在哪里做?
    选择守卫(上例中的 `RolesGuard` )定义的模块。
    此外， `useClass` 并不是处理自定义提供程序注册的唯一方法。
    了解更多[这里](/fundamentals/custom-providers)。

## 为每个处理程序设置角色

我们的 `RolesGuard` 正在工作，但它还不是很智能。
我们还没有充分利用最重要的保护特性——[执行上下文](/fundamentals/执行上下文)。
它还不知道角色，也不知道每个处理程序允许哪些角色。
例如， `CatsController` 可能对不同的路由有不同的权限方案。
有些可能只对管理用户可用，而其他可能对所有人开放。
我们如何以一种灵活且可重用的方式将角色与路由匹配?

这就是自定义元数据发挥作用的地方(了解更多[此处](https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata))。
巢提供了通过 `@SetMetadata()` 装饰器将自定义的元数据附加到路由处理程序的能力。
这些元数据提供了我们所缺少的 `角色` 数据，智能守卫需要这些数据来做出决策。
让我们看看如何使用 `@SetMetadata()` :

=== "cats.controller.ts"

    ```ts
    @Post()
    @SetMetadata('roles', ['admin'])
    async create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @SetMetadata('roles', ['admin'])
    @Bind(Body())
    async create(createCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

!!! info "**Hint**"

    `@SetMetadata()` 装饰器是从 `@nestjs/common` 包中导入的。

在上面的构造中，我们将 `roles` 元数据( `roles` 是一个键，而 `['admin']` 是一个特定的值)附加到 `create()` 方法。
虽然这是可行的，但直接在路由中使用 `@SetMetadata()` 并不是一个好习惯。
相反，创建你自己的装饰器，如下所示:

=== "roles.decorator.ts"

    ```ts
    import { SetMetadata } from '@nestjs/common';

    export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
    ```

=== "roles.decorator.js"

    ```js
    import { SetMetadata } from '@nestjs/common';

    export const Roles = (...roles) => SetMetadata('roles', roles);
    ```

这种方法更简洁，可读性更强，而且是强类型的。
现在我们有了一个自定义的 `@Roles()` 装饰器，我们可以用它来装饰 `create()` 方法。

=== "cats.controller.ts"

    ```ts
    @Post()
    @Roles('admin')
    async create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @Roles('admin')
    @Bind(Body())
    async create(createCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

## 把它们放在一起

现在让我们返回并将它与我们的 `RolesGuard` 连接起来。
目前，它只是在所有情况下返回 `true` ，允许每个请求继续。
我们希望将分配给当前用户的 **角色** 与正在处理的当前路由所需的实际角色进行比较，从而使返回值具有条件。
为了访问路由的角色(自定义元数据)，我们将使用 `Reflector` 助手类，它是由框架提供的，从 `@nestjs/core` 包中公开的。

=== "roles.guard.ts"

    ```ts
    import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
    import { Reflector } from '@nestjs/core';

    @Injectable()
    export class RolesGuard implements CanActivate {
      constructor(private reflector: Reflector) {}

      canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!roles) {
          return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return matchRoles(roles, user.roles);
      }
    }
    ```

=== "roles.guard.js"

    ```js
    import { Injectable, Dependencies } from '@nestjs/common';
    import { Reflector } from '@nestjs/core';

    @Injectable()
    @Dependencies(Reflector)
    export class RolesGuard {
      constructor(reflector) {
        this.reflector = reflector;
      }

      canActivate(context) {
        const roles = this.reflector.get('roles', context.getHandler());
        if (!roles) {
          return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return matchRoles(roles, user.roles);
      }
    }
    ```

!!! info "**Hint**"

    在 node.js 中，将授权用户附加到 `request` 对象是一种常见的做法。
    因此，在上面的示例代码中，我们假设 `request` 。User` 包含用户实例和允许的角色。
    在你的应用中，你可能会在你的自定义认证守卫(或中间件)中创建这个关联。
    请查看[this chapter](/security/authentication)以了解有关本主题的更多信息。

!!! warning

    `matchRoles()` 函数内部的逻辑可以根据需要简单或复杂。
    这个示例的主要目的是展示守卫如何适应请求/响应周期。

请参阅 **执行上下文** 章节的<a href="https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata">反射和元数据</a>小节，以上下文敏感的方式使用 `Reflector` 的更多细节。

当权限不足的用户请求一个端点时，Nest 会自动返回以下响应:

```typescript
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

请注意，在幕后，当守卫返回 `false` 时，框架会抛出 `ForbiddenException` 。
如果你想返回一个不同的错误响应，你应该抛出你自己的异常。
例如:

```typescript
throw new UnauthorizedException();
```

由守卫抛出的任何异常都将由[exceptions 层](/exception-filters)(全局异常过滤器和应用于当前上下文的任何异常过滤器)处理。

!!! info "**Hint**"

    如果你正在寻找如何实现授权的真实示例，请查看[本章](/security/authorization)。
