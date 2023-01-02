# 授权

**授权** 是指决定用户能够做什么的过程。
例如，允许管理用户创建、编辑和删除帖子。
非管理员用户只被授权阅读帖子。

授权是正交的，并且独立于身份验证。
但是，授权需要一种身份验证机制。

处理授权有许多不同的方法和策略。
任何项目所采用的方法取决于其特定的应用程序需求。
本章介绍了几种授权方法，它们可以适应各种不同的需求。

## 基于 RBAC 实现

基于角色的访问控制( **RBAC** )是围绕角色和特权定义的策略无关的访问控制机制。
在本节中，我们将演示如何使用 Nest [guards](/guards)实现一个非常基本的 RBAC 机制。

首先，让我们在系统中创建一个表示角色的`Role`枚举:

=== "role.enum.ts"

    ```ts
    export enum Role {
      User = 'user',
      Admin = 'admin',
    }
    ```

!!! info "**Hint**"

    在更复杂的系统中，可以将角色存储在数据库中，或者从外部身份验证提供器获取角色。

有了这个，我们可以创建一个`@Roles()`装饰器。
该装饰器允许指定访问特定资源所需的角色。

=== "roles.decorator.ts"

    ```ts
    import { SetMetadata } from '@nestjs/common';
    import { Role } from '../enums/role.enum';

    export const ROLES_KEY = 'roles';
    export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
    ```

=== "roles.decorator.js"

    ```js
    import { SetMetadata } from '@nestjs/common';

    export const ROLES_KEY = 'roles';
    export const Roles = (...roles) => SetMetadata(ROLES_KEY, roles);
    ```

现在我们有了一个自定义的`@Roles()`装饰器，我们可以用它装饰任何路由处理程序。

=== "cats.controller.ts"

    ```ts
    @Post()
    @Roles(Role.Admin)
    create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @Roles(Role.Admin)
    @Bind(Body())
    create(createCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

最后，我们创建一个`RolesGuard`类，它将把分配给当前用户的角色与正在处理的当前路由所需要的实际角色进行比较。
为了访问路由的角色(自定义元数据)，我们将使用`Reflector `helper 类，它是由框架提供的，从`@nestjs/core`包中公开的。

=== "roles.guard.ts"

    ```ts
    import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
    import { Reflector } from '@nestjs/core';

    @Injectable()
    export class RolesGuard implements CanActivate {
      constructor(private reflector: Reflector) {}

      canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (!requiredRoles) {
          return true;
        }
        const { user } = context.switchToHttp().getRequest();
        return requiredRoles.some((role) => user.roles?.includes(role));
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
        const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (!requiredRoles) {
          return true;
        }
        const { user } = context.switchToHttp().getRequest();
        return requiredRoles.some((role) => user.roles.includes(role));
      }
    }
    ```

!!! info "**Hint**"

    请参阅执行上下文章节的[反射和元数据](/fundamentals/execution-context#reflection-and-metadata)小节，了解更多关于以上下文敏感的方式使用`Reflector`的细节。

!!! warning

    这个例子被命名为"**basic** "，因为我们只在路由处理程序级别检查角色的存在。

> 在现实世界的应用程序中，您可能有一些涉及多个操作的端点/处理程序，其中每个操作都需要一组特定的权限。
> 在这种情况下，您必须提供一种机制来检查业务逻辑中的角色，这使维护变得有些困难，因为没有集中的地方将权限与特定的操作关联起来。

在这个例子中，我们假设`request.user`包含用户实例和允许的角色(在`roles`属性下)。
在你的应用程序中，你可能会在你的自定义的 **身份验证保护** 中建立这种关联-请参阅[authentication](/security/authentication)章节了解更多细节。

为了确保这个例子能够正常工作，你的 User 类必须如下所示:

```typescript
class User {
  // ...other properties
  roles: Role[];
}
```

最后，确保注册`RolesGuard`，例如，在控制器级别或全局:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
],
```

当一个权限不足的用户请求一个端点时，Nest 自动返回以下响应:

```typescript
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

!!! info "**Hint**"

    如果你想返回一个不同的错误响应，你应该抛出你自己的特定异常，而不是返回一个布尔值。

## 声明式授权

创建标识时，可以将其分配给受信任方发出的一个或多个声明。
claim 是一个名称-值对，它表示主语可以做什么，而不是主语是什么。

要在 Nest 中实现基于声明的授权，您可以按照我们在上面[RBAC](/security/authorization#basic-rbac-implementation)小节中展示的相同步骤进行操作，但有一个显著的区别:您应该比较 **权限** ，而不是检查特定的角色。
每个用户都有一组被分配的权限。
同样，每个资源/端点将定义需要哪些权限(例如，通过专用的`@RequirePermissions()`装饰器)来访问它们。

=== "cats.controller.ts"

    ```ts
    @Post()
    @RequirePermissions(Permission.CREATE_CAT)
    create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

=== "cats.controller.js"

    ```js
    @Post()
    @RequirePermissions(Permission.CREATE_CAT)
    @Bind(Body())
    create(createCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

!!! info "**Hint**"

    在上面的例子中，`Permission`(类似于我们在 RBAC 部分中展示的`Role`)是一个 TypeScript enum，它包含了你系统中所有可用的权限。

## 整合 CASL

[CASL](https://casl.js.org/)是一个同构的授权库，它限制了给定的客户端可以访问哪些资源。
它被设计成可增量采用的，并且可以轻松地在基于简单声明、全功能主题和基于属性的授权之间进行伸缩。

首先，安装`@casl/ability`包:

```bash
$ npm i @casl/ability
```

!!! info "**Hint**"

    在本例中，我们选择了 CASL，但您可以使用任何其他库，如`accesscontrol`或`acl`，这取决于您的首选项和项目需求。

安装完成后，为了说明 CASL 的机制，我们将定义两个实体类:`User`和`Article`。

```typescript
class User {
  id: number;
  isAdmin: boolean;
}
```

`User`类由两个属性组成，`id`是唯一的用户标识符，`isAdmin`表示用户是否具有管理员权限。

```typescript
class Article {
  id: number;
  isPublished: boolean;
  authorId: number;
}
```

`Article`类有三个属性，分别是`id`、`isPublished`和`authorId`。
`id`是文章的唯一标识符，`isPublished`表示文章是否已经发布，而`authorId`是撰写文章的用户的 id。

现在让我们回顾并精炼这个例子中的需求:

- 管理员可以管理(创建/读取/更新/删除)所有实体
- 用户对所有内容都具有只读访问权限
- 用户可以更新他们的文章 (`article.authorId === userId`)
- 无法删除已发布的项目(`article.isPublished === true`)

考虑到这一点，我们可以从创建一个`Action`枚举开始，它表示用户可以对实体执行的所有可能的操作:

```typescript
export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}
```

!!! warning

    `manage`是 CASL 中的一个特殊关键字，它表示`任何`操作。

为了封装 CASL 库，现在让我们生成`CaslModule`和`CaslAbilityFactory`。

```bash
$ nest g module casl
$ nest g class casl/casl-ability.factory
```

有了这个，我们可以在`CaslAbilityFactory`上定义`createForUser()`方法。
这个方法将为给定的用户创建`Ability`对象:

```typescript
type Subjects = InferSubjects<typeof Article | typeof User> | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const { can, cannot, build } = new AbilityBuilder<
      Ability<[Action, Subjects]>
    >(Ability as AbilityClass<AppAbility>);

    if (user.isAdmin) {
      can(Action.Manage, 'all'); // read-write access to everything
    } else {
      can(Action.Read, 'all'); // read-only access to everything
    }

    can(Action.Update, Article, { authorId: user.id });
    cannot(Action.Delete, Article, { isPublished: true });

    return build({
      // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
```

!!! warning

    `all`是 CASL 中一个特殊的关键字，代表`任何主题`。

!!! info "**Hint**"

    `Ability`， `AbilityBuilder`， `AbilityClass`和`ExtractSubjectType`类从`@casl/ Ability`包中导出。

!!! info "**Hint**"

    `detectSubjectType`选项让 CASL 了解如何从对象中获取主题类型。
    有关更多信息，请阅读[CASL 文档](https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types)了解详细信息。

在上面的例子中，我们使用`AbilityBuilder`类创建了`Ability`实例。
正如你可能猜到的，can 和 cannot 接受相同的参数，但有不同的含义，can 允许对指定的主题做一个动作，而 cannot 禁止。
两者都可以接受最多 4 个参数。
要了解关于这些函数的更多信息，请访问官方[CASL 文档](https://casl.js.org/v5/en/guide/intro)。

最后，确保将`CaslAbilityFactory`添加到`CaslModule`模块定义中的`providers`和`exports`数组中:

```typescript
import { Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';

@Module({
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
```

有了这个，我们就可以使用标准构造函数注入将`CaslAbilityFactory`注入到任何类中，只要`CaslModule`是在宿主上下文中导入的:

```typescript
constructor(private caslAbilityFactory: CaslAbilityFactory) {}
```

然后像下面这样在类中使用它。

```typescript
const ability = this.caslAbilityFactory.createForUser(user);
if (ability.can(Action.Read, 'all')) {
  // "user" has read access to everything
}
```

!!! info "**Hint**"

    有关`能力`类的更多信息，请参阅官方[CASL 文档](https://casl.js.org/v5/en/guide/intro)。

例如，假设我们有一个不是管理员的用户。
在这种情况下，用户应该能够阅读文章，但应该禁止创建新的文章或删除现有的文章。

```typescript
const user = new User();
user.isAdmin = false;

const ability = this.caslAbilityFactory.createForUser(user);
ability.can(Action.Read, Article); // true
ability.can(Action.Delete, Article); // false
ability.can(Action.Create, Article); // false
```

!!! info "**Hint**"

    虽然`Ability`和`AbilityBuilder`类都提供了`can`和`cannot`方法，但它们的目的不同，接受的参数也略有不同。

此外，正如我们在我们的要求中指定的，用户应该能够更新其文章:

```typescript
const user = new User();
user.id = 1;

const article = new Article();
article.authorId = user.id;

const ability = this.caslAbilityFactory.createForUser(user);
ability.can(Action.Update, article); // true

article.authorId = 2;
ability.can(Action.Update, article); // false
```

正如您所看到的，`Ability`允许我们以一种非常可读的方式检查权限。
类似地，`AbilityBuilder`允许我们以类似的方式定义权限(并指定各种条件)。
要查找更多示例，请访问官方文档。

## 高级:实现一个 `PoliciesGuard`

在本节中，我们将演示如何构建一个更复杂的保护，它检查用户是否满足可以在方法级配置的特定的 **授权策略** (您可以扩展它以尊重在类级配置的策略)。
在本例中，我们将使用 CASL 包，只是为了演示目的，但不需要使用这个库。
此外，我们将使用我们在前一节中创建的`CaslAbilityFactory`提供程序。

首先，让我们充实需求。
目标是提供一种机制，允许为每个路由处理程序指定策略检查。
我们将同时支持对象和函数(用于更简单的检查和那些更喜欢函数式代码的人)。

让我们从定义策略处理程序的接口开始:

```typescript
import { AppAbility } from '../casl/casl-ability.factory';

interface IPolicyHandler {
  handle(ability: AppAbility): boolean;
}

type PolicyHandlerCallback = (ability: AppAbility) => boolean;

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;
```

如上所述，我们提供了定义策略处理程序的两种可能的方法，一个对象(实现`IPolicyHandler`接口的类的实例)和一个函数(满足`PolicyHandlerCallback`类型)。

有了这个，我们可以创建一个`@CheckPolicies()`装饰器。
这个装饰器允许指定访问特定资源必须满足哪些策略。

```typescript
export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
```

现在，让我们创建一个`policyesguard`，它将提取和执行绑定到路由处理程序的所有策略处理程序。

```typescript
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const { user } = context.switchToHttp().getRequest();
    const ability = this.caslAbilityFactory.createForUser(user);

    return policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
```

!!! info "**Hint**"

    在这个例子中，我们假设`request。User`包含用户实例。

> 在你的应用程序中，你可能会在你的自定义的\*\*身份验证保护中建立这种关联-请参阅[authentication](/security/authentication)章节了解更多细节。

让我们来分析一下这个例子。
`policyHandlers`是一个通过`@CheckPolicies()`装饰器分配给该方法的处理程序数组。
接下来，我们使用`CaslAbilityFactory#create`方法来构造`Ability`对象，允许我们验证用户是否有足够的权限来执行特定的操作。
我们将这个对象传递给策略处理程序，它要么是一个函数，要么是实现了`IPolicyHandler`的类的实例，暴露了返回布尔值的`handle()`方法。
最后，我们使用`Array#every`方法来确保每个处理器都返回`true`值。

最后，为了测试这个保护，将它绑定到任何路由处理程序，并注册一个内联策略处理程序(函数式方法)，如下所示:

```typescript
@Get()
@UseGuards(PoliciesGuard)
@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, Article))
findAll() {
  return this.articlesService.findAll();
}
```

或者，我们可以定义一个实现`IPolicyHandler`接口的类:

```typescript
export class ReadArticlePolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Read, Article);
  }
}
```

使用方法如下:

```typescript
@Get()
@UseGuards(PoliciesGuard)
@CheckPolicies(new ReadArticlePolicyHandler())
findAll() {
  return this.articlesService.findAll();
}
```

!!! warning

    因为我们必须使用`new`关键字就地实例化策略处理程序，所以`ReadArticlePolicyHandler`类不能使用依赖注入。

> 这可以通过`ModuleRef#get`方法来解决(详见[此处](/fundamentals/module-ref)).
> 基本上，你必须允许传递一个`Type<IPolicyHandler>`，而不是通过`@CheckPolicies()`装饰器注册函数和实例。
> 然后，在你的守卫内部，你可以使用类型引用`moduleRef.get(YOUR_HANDLER_TYPE)`来检索一个实例，或者甚至使用`ModuleRef#create`方法来动态实例化它。
