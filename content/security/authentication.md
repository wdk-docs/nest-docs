# 身份验证

身份验证是大多数应用程序中 **必不可少** 的一部分。
有许多不同的方法和策略来处理身份验证。
任何项目所采用的方法取决于其特定的应用程序需求。
本章介绍了几种可以适应各种不同需求的身份验证方法。

[Passport](https://github.com/jaredhanson/passport)是最流行的 node.js 身份验证库，被社区所熟知，并成功地应用于许多生产应用程序。
使用`@nestjs/passport`模块将这个库与 **Nest** 应用程序集成起来是很简单的。
在高层，Passport 执行一系列步骤:

- 通过验证用户的“凭证”(例如用户名/密码、JSON Web 令牌([JWT](https://jwt.io/))或来自身份提供器的身份令牌)来验证用户。
- 管理经过身份验证的状态(通过发出可移植令牌，如 JWT，或创建[Express 会话](https://github.com/expressjs/session))
- 将有关已验证用户的信息附加到`Request`对象，以便在路由处理程序中进一步使用

Passport 有一个丰富的[策略](http://www.passportjs.org/)生态系统，实现各种身份验证机制。
虽然在概念上很简单，但是您可以选择的 Passport 策略集非常多，而且种类繁多。
Passport 将这些不同的步骤抽象为一个标准模式，而`@nestjs/passport`模块将该模式包装并标准化为熟悉的 Nest 结构。

在本章中，我们将使用这些强大而灵活的模块为 RESTful API 服务器实现完整的端到端身份验证解决方案。
您可以使用这里描述的概念来实现任何 Passport 策略，以定制您的身份验证方案。
您可以按照本章中的步骤来构建这个完整的示例。
你可以在[这里](https://github.com/nestjs/nest/tree/master/sample/19-auth-jwt)找到一个完整的示例应用程序库.

## 身份验证需求

让我们充实我们的要求。
对于这个用例，客户端将首先使用用户名和密码进行身份验证。
一旦通过身份验证，服务器将发出一个 JWT，该 JWT 可以在随后的请求中作为[授权头中的承载令牌](https://tools.ietf.org/html/rfc6750)发送，以证明身份验证。
我们还将创建一个受保护的路由，该路由仅对包含有效 JWT 的请求可访问。

我们将从第一个需求开始:对用户进行身份验证。
然后，我们将通过发布 JWT 对其进行扩展。
最后，我们将创建一个受保护的路由，用于检查请求中的有效 JWT。

首先，我们需要安装所需的软件包。
Passport 提供了一个名为[passport-local](https://github.com/jaredhanson/passport-local)的策略，该策略实现了用户名/密码身份验证机制，它适合我们对这部分用例的需求。

```bash
$ npm install --save @nestjs/passport passport passport-local
$ npm install --save-dev @types/passport-local
```

!!! warning

    对于你选择的 **任何** Passport 策略，你总是需要`@nestjs/passport`和`passport`包。

> 然后，您需要安装特定于策略的包(例如，`passport-jwt` 或 `passport-local`)，它实现了您正在构建的特定身份验证策略。
> 此外，你还可以为任何 Passport 策略安装类型定义，如上面 `@types/assport-local` 所示，它在编写 TypeScript 代码时提供了帮助。

## 实现认证策略

现在我们准备实现身份验证特性。
我们将首先概述用于 **任何** passport 策略的流程。
将 Passport 本身看作一个迷你框架是有帮助的。
该框架的优雅之处在于，它将身份验证过程抽象为几个基本步骤，您可以根据正在实现的策略自定义这些步骤。
它很像一个框架，因为您可以通过以回调函数的形式提供定制参数(作为普通的 JSON 对象)和定制代码来配置它，Passport 会在适当的时候调用回调函数。
`@nestjs/passport`模块将这个框架封装在一个 Nest 风格的包中，使得它很容易集成到一个 Nest 应用程序中。
我们将在下面使用`@nestjs/passport`，但首先让我们考虑一下 **vanilla Passport** 是如何工作的。

在 vanilla Passport 中，你可以通过提供两件事来配置策略:

1. 一组特定于该策略的选项。例如，在 JWT 策略中，您可以提供一个密钥来为令牌签名。
2. 一个“验证回调”，在这里您可以告诉 Passport 如何与您的用户存储(您在其中管理用户帐户)交互。
   在这里，您将验证一个用户是否存在(和/或创建一个新用户)，以及他们的凭证是否有效。
   如果验证成功，Passport 库期望这个回调返回一个完整的用户，如果验证失败，则返回一个 null(失败定义为没有找到用户，或者在 passport-local 的情况下，密码不匹配)。

使用`@nestjs/passport`，你可以通过扩展`PassportStrategy`类来配置 passport 策略。
你可以通过调用子类中的`super()`方法来传递策略选项(上面的第 1 项)，也可以选择传递一个选项对象。
您可以通过在子类中实现`validate()`方法来提供验证回调(上面的第 2 项)。

我们首先生成一个`AuthModule`，并在其中生成一个`AuthService`:

```bash
$ nest g module auth
$ nest g service auth
```

当我们实现`AuthService`时，我们会发现在`UsersService`中封装用户操作是很有用的，所以现在让我们生成该模块和服务:

```bash
$ nest g module users
$ nest g service users
```

替换这些生成文件的默认内容，如下所示。
对于我们的示例应用程序，`UsersService`只是在内存中维护一个硬编码的用户列表，以及一个按用户名检索用户的 find 方法。
在真正的应用中，这是你构建用户模型和持久层的地方，使用你的库(如 TypeORM, Sequelize, Mongoose 等)。

=== "users/users.service"

```ts
import { Injectable } from '@nestjs/common';

// This should be a real class/interface representing a user entity
export type User = any;

@Injectable()
export class UsersService {
  private readonly users = [
    {
      userId: 1,
      username: 'john',
      password: 'changeme',
    },
    {
      userId: 2,
      username: 'maria',
      password: 'guess',
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }
}
```

=== "JavaScript"

```js
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor() {
    this.users = [
      {
        userId: 1,
        username: 'john',
        password: 'changeme',
      },
      {
        userId: 2,
        username: 'maria',
        password: 'guess',
      },
    ];
  }

  async findOne(username) {
    return this.users.find((user) => user.username === username);
  }
}
```

在`UsersModule`中，唯一需要修改的是将`UsersService`添加到`@Module`装饰器的`exports`数组中，这样它就可以在模块外看到了(我们很快就会在`AuthService`中使用它)。

=== "users/users.module"

```ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

=== "JavaScript"

```js
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

我们的`AuthService`负责检索用户并验证密码。
为此，我们创建了一个`validateUser()`方法。
在下面的代码中，我们使用一个方便的 ES6 扩展操作符在返回用户对象之前从该对象中剥离密码属性。
我们稍后将从 passport-local 策略调用`validateUser()`方法。

=== "auth/auth.service"

```ts
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
```

=== "JavaScript"

```js
import { Injectable, Dependencies } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
@Dependencies(UsersService)
export class AuthService {
  constructor(usersService) {
    this.usersService = usersService;
  }

  async validateUser(username, pass) {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
```

!!! warning

    当然，在实际的应用程序中，您不会将密码存储为纯文本。

> 相反，您应该使用像[bcrypt](https://github.com/kelektiv/node.bcrypt.js#readme)这样的库，并使用加盐的单向哈希算法。
> 使用这种方法，您只需存储经过散列处理的密码，然后将存储的密码与传入的 **密码** 的散列版本进行比较，从而不会以纯文本存储或公开用户密码。
> 为了保持示例应用程序的简单性，我们违反了这一绝对规定，使用纯文本。
> **不要在真正的应用中这么做!**

现在，我们更新`AuthModule`来导入`UsersModule`。

=== "auth/auth.module"

```ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

=== "JavaScript"

```js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

## 执行 local 认证

现在我们可以实现我们的 passport-local **认证策略** 。
在`auth`文件夹中创建一个名为`local.strategy.ts`的文件，并添加以下代码:

=== "auth/local.strategy"

```ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

=== "JavaScript"

```js
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  Dependencies,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
@Dependencies(AuthService)
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(authService) {
    super();
    this.authService = authService;
  }

  async validate(username, password) {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

对于所有的 Passport 策略，我们都遵循了前面描述的方法。
在我们的 passport-local 用例中，没有配置选项，所以构造函数只是调用`super()`，没有选项对象。

!!! info "**Hint**"

    我们可以在调用`super()`时传递一个 options 对象来定制 passport 策略的行为。

> 在本例中，默认情况下，passport-local 策略在请求体中要求名为`username`和`password`的属性。
> 例如，传递一个 options 对象来指定不同的属性名: `super({{ '{' }} usernameField: 'email' {{ '}' }})`.
> 更多信息请参阅[Passport 文档](http://www.passportjs.org/docs/configure/)。

我们还实现了`validate()`方法。
对于每个策略，Passport 将使用一组特定于策略的参数调用 verify 函数(在`@nestjs/passport`中使用`validate()`方法实现)。
对于 local 策略，Passport 需要一个带有以下签名的`validate()`方法: `validate(username: string, password:string): any`.

大多数验证工作都是在我们的`AuthService`中完成的(在`UsersService`的帮助下)，所以这个方法非常简单。
**任何** Passport 策略的`validate()`方法都将遵循类似的模式，只是在如何表示凭据的细节上有所不同。
如果找到了用户，且凭据有效，则返回用户，以便 Passport 可以完成任务(例如，在`Request`对象上创建`user`属性)，并且请求处理管道可以继续。
如果没有找到，我们抛出一个异常，并让[异常层](exception-filters)处理它。

通常，每种策略的`validate()`方法的唯一显著区别是如何确定用户是否存在并有效。
例如，在 JWT 策略中，根据需求，我们可以评估在已解码令牌中携带的`userId`是否与我们的用户数据库中的记录相匹配，或者与已撤销令牌的列表相匹配。
因此，这种子类化和实现特定策略验证的模式是一致的、优雅的和可扩展的。

我们需要配置我们的`AuthModule`来使用我们刚刚定义的 Passport 特性。
更新`auth.module.ts`，如下所示:

=== "auth/auth.module"

```ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [UsersModule, PassportModule],
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
```

=== "JavaScript"

```js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [UsersModule, PassportModule],
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
```

## 内置的认证守卫

[Guards](guards)一章描述了 Guards 的主要功能:决定一个请求是否会被路由处理器处理。
这是事实，我们很快就会使用标准功能。
然而，在使用`@nestjs/passport`模块的上下文中，我们还将引入一个轻微的新方法，这在一开始可能会令人困惑，所以现在让我们讨论一下。
从认证的角度来看，你的应用程序可以存在两种状态:

1. 用户/客户端 **未** 登录(未通过身份验证)
2. 用户/客户端 **已** 登录(已通过身份验证)

在第一种情况下(用户未登录)，我们需要执行两个不同的函数:

- 限制未经认证的用户可以访问的路由(即拒绝访问受限制的路由)。
  通过在受保护的路由上放置一个 Guard，我们将使用它们熟悉的功能来处理这个功能。
  正如您所预期的，我们将检查这个守卫中是否存在有效的 JWT，因此，一旦我们成功地发布了 JWT，我们将在稍后处理这个守卫。

- 当先前未通过身份验证的用户试图登录时，初始化 **身份验证步骤** 本身。
  这是我们向有效用户 **发送** JWT 的步骤。
  考虑一下这个问题，我们知道我们需要`POST`用户名/密码凭据来启动身份验证，因此我们将设置一个`POST /auth/login`路由来处理它。
  这就提出了一个问题:在这条路由上，我们究竟如何调用 passport-local 策略?

答案很简单:使用另一种稍微不同的 Guard。
`@nestjs/passport`模块为我们提供了一个内置的 Guard 来完成这一任务。
这个 Guard 调用 Passport 策略并启动上面描述的步骤(检索凭证、运行验证函数、创建“用户”属性等)。

上面列举的第二种情况(登录的用户)只是依赖于我们已经讨论过的标准类型的 Guard，以允许登录的用户访问受保护的路由。

## 登录路由

有了策略，我们现在可以实现一个基本的`/auth/login`路由，并应用内置的 Guard 来启动 passport-local 流。

打开`app.controller.ts`文件，并将其内容替换为以下内容:

=== "app.controller"

```ts
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @UseGuards(AuthGuard('local'))
  @Post('auth/login')
  async login(@Request() req) {
    return req.user;
  }
}
```

=== "JavaScript"

```js
import { Controller, Bind, Request, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @UseGuards(AuthGuard('local'))
  @Post('auth/login')
  @Bind(Request())
  async login(req) {
    return req.user;
  }
}
```

在使用`@UseGuards(AuthGuard('local'))`时，我们使用了`@nestjs/passport` **自动提供** 的`AuthGuard`，这是我们在扩展`passport-local`策略时自动提供的。
让我们来分析一下。
我们的 passport-local 策略的默认名称是`local`。
我们在`@UseGuards()`装饰器中引用该名称，将其与`passport-local`包提供的代码关联起来。
这是用来消除歧义，在我们的应用程序中有多个 Passport 策略(每一个可能提供一个特定的策略`AuthGuard`)。
虽然到目前为止我们只有一个这样的策略，但我们很快就会添加第二个，所以这是消除歧义所必需的。

为了测试我们的路由，我们的`/auth/login`路由现在只返回用户。
这也让我们演示了 Passport 的另一个特性:Passport 根据`validate()`方法返回的值自动创建一个`user`对象，并将其作为`req.user`分配给`Request`对象。
稍后，我们将用创建并返回一个 JWT 的代码来替换它。

由于这些是 API 路由，我们将使用常用的[cURL](https://curl.haxx.se/)库对它们进行测试。
你可以用`UsersService`中硬编码的任何`user`对象进行测试。

```bash
$ # POST to /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
$ # result -> {"userId":1,"username":"john"}
```

当这工作时，将策略名称直接传递给`AuthGuard()`会在代码库中引入魔术字符串。
相反，我们建议创建自己的类，如下所示:

=== "auth/local-auth.guard"

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

现在，我们可以更新`/auth/login`路由处理程序，使用`LocalAuthGuard`代替:

```typescript
@UseGuards(LocalAuthGuard)
@Post('auth/login')
async login(@Request() req) {
  return req.user;
}
```

## JWT 功能

我们已经准备好转移到身份验证系统的 JWT 部分。让我们回顾和完善我们的要求:

- 允许用户使用用户名/密码进行身份验证，返回一个 JWT，以便在随后调用受保护的 API 端点时使用。
  我们正在顺利地达到这一要求。
  为了完成它，我们需要编写发出 JWT 的代码。
- 创建基于有效 JWT 作为承载令牌的存在而受到保护的 API 路由

我们需要安装更多的软件包来支持我们的 JWT 需求:

```bash
$ npm install --save @nestjs/jwt passport-jwt
$ npm install --save-dev @types/passport-jwt
```

`@nestjs/jwt`包(参见更多[这里](https://github.com/nestjs/jwt))是一个实用程序包，可以帮助进行 jwt 操作。
`passport-jwt`包是实现了 JWT 策略的 Passport 包，而`@types/passport-jwt`包提供了 TypeScript 类型定义。

让我们仔细看看`POST /auth/login`请求是如何处理的。
我们使用 passport-local 策略提供的内置`AuthGuard`来装饰路由。
这意味着:

1. 路由处理程序 **只会在用户已经验证** 的情况下被调用
2. `req`参数将包含一个`user`属性(在 passport-local 身份验证流程中由 Passport 填充)

考虑到这一点，我们现在终于可以生成真正的 JWT，并以这种方式返回它。
为了保持服务的整洁模块化，我们将在`authService`中处理 JWT 的生成。
打开`auth`文件夹中的`auth.service.ts`文件，添加`login()`方法，并导入`JwtService`，如下所示:

=== "auth/auth.service"

```ts
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

=== "JavaScript"

```js
import { Injectable, Dependencies } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Dependencies(UsersService, JwtService)
@Injectable()
export class AuthService {
  constructor(usersService, jwtService) {
    this.usersService = usersService;
    this.jwtService = jwtService;
  }

  async validateUser(username, pass) {
    const user = await this.usersService.findOne(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

我们使用`@nestjs/jwt`库，它提供了一个`sign()`函数来从`user`对象属性的子集生成我们的 jwt，然后我们返回一个简单的对象，带有一个`access_token`属性。
注意:我们选择属性名`sub`来保存我们的`userId`值，以与 JWT 标准保持一致。
不要忘记将 JwtService 提供器注入到`AuthService`中。

现在我们需要更新`AuthModule`来导入新的依赖项，并配置`JwtModule`。

首先,创建的常数。在`auth`文件夹中添加以下代码:

=== "auth/constants"

```ts
export const jwtConstants = {
  secret: 'secretKey',
};
```

=== "JavaScript"

```js
export const jwtConstants = {
  secret: 'secretKey',
};
```

我们将使用它在 JWT 签名和验证步骤之间共享密钥。

!!! warning

    **不要公开此密钥** 。

> 我们在这里这样做是为了明确代码在做什么，但是在生产系统中，您必须使用适当的措施来保护这个密钥，例如密钥库、环境变量或配置服务。

现在，打开`auth.module.ts`文件夹中的`auth`，并将其更新为如下所示:

=== "auth/auth.module"

```ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

=== "JavaScript"

```js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

我们使用`register()`来配置`JwtModule`，传入一个配置对象。
有关 Nest `JwtModule`的更多信息，请参见[这里](https://github.com/nestjs/jwt/blob/master/README.md)，有关可用配置选项的更多信息，请参见[这里](https://github.com/auth0/node-jsonwebtoken#usage)。

现在我们可以更新`/auth/login`路由以返回一个 JWT。

=== "app.controller"

```ts
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
```

=== "JavaScript"

```js
import { Controller, Bind, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  @Bind(Request())
  async login(req) {
    return this.authService.login(req.user);
  }
}
```

让我们继续使用 cURL 测试我们的路由。
你可以用`UsersService`中硬编码的任何`user`对象进行测试。

```bash
$ # POST to /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
$ # result -> {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
$ # Note: above JWT truncated
```

## 实施认证 JWT

现在我们可以处理我们的最终需求:通过要求在请求中提供有效的 JWT 来保护端点。
passport 也能帮到我们。
它提供了[passport-jwt](https://github.com/mikenicholson/passport-jwt)策略来使用 JSON Web token 保护 RESTful 端点。
首先创建一个名为`jwt.strategy`的文件。在`auth`文件夹中添加以下代码:

=== "auth/jwt.strategy"

```ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
```

=== "JavaScript"

```js
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload) {
    return { userId: payload.sub, username: payload.username };
  }
}
```

在我们的`JwtStrategy`中，我们遵循了前面描述的所有 Passport 策略的相同配方。
这个策略需要一些初始化，所以我们通过在`super()`调用中传入一个选项对象来实现。
你可以阅读更多可用选项[这里](https://github.com/mikenicholson/passport-jwt#configure-strategy).
在我们的例子中，这些选项是:

- `jwtFromRequest`: 提供了从`Request`中提取 JWT 的方法。
  我们将使用标准方法，在 API 请求的 Authorization 头中提供承载令牌。
  其他选项描述[此处](https://github.com/mikenicholson/passport-jwt#extracting-the-jwt-from-the-request).
- `ignoreExpiration`: 为了明确起见，我们选择默认的`false`设置，它将确保 JWT 没有过期的责任委托给 Passport 模块。
  这意味着，如果我们的路由使用过期的 JWT 提供，则请求将被拒绝，并发送`401 Unauthorized`响应。
  passport 方便地自动为我们处理这个问题。
- `secretOrKey`: 我们使用权宜之计来为令牌签名提供对称密钥。
  其他选项，如 pem 编码的公钥，可能更适合于生产应用程序(请参阅[这里](https://github.com/mikenicholson/passport-jwt#configure-strategy)了解更多信息)。
  在任何情况下，正如前面所警告的， **不要公开揭露这个密钥** 。

`validate()`方法值得讨论。
对于`jwt-strategy`，Passport 首先验证 JWT 的签名并解码 JSON。
然后它调用我们的`validate()`方法，将解码后的 JSON 作为它的单个参数传递。
基于 JWT 签名的工作方式， **我们可以保证接收到一个有效的令牌** ，这个令牌之前已经签名并发给了一个有效的用户。

因此，我们对`validate()`回调函数的响应很简单:我们只返回一个包含`userId`和`username`属性的对象。
再回想一下，Passport 将基于`validate()`方法的返回值构建一个`user`对象，并将其作为属性附加到`Request`对象上。

同样值得指出的是，这种方法给我们留下了将其他业务逻辑注入流程的空间(可以说是`钩子`)。
例如，我们可以在`validate()`方法中进行数据库查找，以提取用户的更多信息，从而在`Request`中提供更丰富的`user`对象。
这也是我们可以决定进行进一步令牌验证的地方，例如在已撤销令牌列表中查找 `userId`，使我们能够执行令牌撤销。
我们在示例代码中实现的模型是一个快速的、`无状态的 JWT`模型，其中每个 API 调用都立即根据有效的 JWT 的存在进行授权，并且请求者的少量信息(它的`userId`和`用户名`)在我们的请求管道中可用。

在`AuthModule`中添加新的`JwtStrategy`作为提供器:

=== "auth/auth.module"

```ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

=== "JavaScript"

```js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

通过导入我们签署 JWT 时使用的相同密钥，我们确保 Passport 执行的 **验证**阶段和 AuthService 执行的**签名** 阶段使用一个公共密钥。

最后，我们定义了`JwtAuthGuard`类，它扩展了内置的`AuthGuard`:

=== "auth/jwt-auth.guard"

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

## 实施保护路由和 JWT 策略守卫

现在我们可以实现受保护的路由及其相关的 Guard。

打开`app.controller.ts`文件并更新它，如下图所示:

=== "app.controller"

```ts
import { Controller, Get, Request, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
```

=== "JavaScript"

```js
import {
  Controller,
  Dependencies,
  Bind,
  Get,
  Request,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';

@Dependencies(AuthService)
@Controller()
export class AppController {
  constructor(authService) {
    this.authService = authService;
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  @Bind(Request())
  async login(req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @Bind(Request())
  getProfile(req) {
    return req.user;
  }
}
```

再一次，我们应用了`@nestjs/passport`模块在配置 passport-jwt 模块时自动为我们提供的`AuthGuard`。
这个守卫被它的默认名称`jwt`引用。
当我们的`GET /profile`路由被命中时，Guard 将自动调用我们的 passport-jwt 自定义配置逻辑，验证 JWT，并将`user`属性分配给`Request`对象。

确保应用程序正在运行，并使用`cURL`测试路由。

```bash
$ # GET /profile
$ curl http://localhost:3000/profile
$ # result -> {"statusCode":401,"error":"Unauthorized"}

$ # POST /auth/login
$ curl -X POST http://localhost:3000/auth/login -d '{"username": "john", "password": "changeme"}' -H "Content-Type: application/json"
$ # result -> {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm...
}

$ # GET /profile using access_token returned from previous step as bearer code
$ curl http://localhost:3000/profile -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2Vybm..."
$ # result -> {"userId":1,"username":"john"}
```

注意，在`AuthModule`中，我们将 JWT 配置为“60 秒”过期。
这个过期时间可能太短了，处理令牌过期和刷新的详细信息超出了本文的范围。
然而，我们选择它是为了展示 jwt 的一个重要特性以及`passport-jwt`策略。
如果你在验证后等待 60 秒再尝试`GET /profile`请求，你会收到一个`401 Unauthorized`的响应。
这是因为 Passport 会自动检查 JWT 的过期时间，从而为您节省了在应用程序中这样做的麻烦。

我们现在已经完成了 JWT 身份验证实现。
JavaScript 客户端(如 Angular/React/Vue)和其他 JavaScript 应用，现在可以安全地与我们的 API Server 进行认证和通信了。

## 示例

你可以在本章找到完整的代码版本[这里](https://github.com/nestjs/nest/tree/master/sample/19-auth-jwt).

## 扩展守卫

在大多数情况下，使用提供的`AuthGuard`类就足够了。
然而，当您想简单地扩展默认错误处理或身份验证逻辑时，可能会有一些用例。
为此，您可以扩展内置类并在子类中重写方法。

```typescript
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```

除了扩展默认的错误处理和身份验证逻辑之外，我们还可以允许身份验证通过一系列策略。
第一个成功的策略，重定向，或错误将停止链。
身份验证失败将依次通过每个策略，如果所有策略都失败，则最终失败。

```typescript
export class JwtAuthGuard extends AuthGuard(['strategy_jwt_1', 'strategy_jwt_2', '...']) { ...
}
```

## 使全局认证

如果你的大多数端点在默认情况下都应该被保护，你可以将认证守卫注册为[全局守卫](/guards#binding-guard)，而不是在每个控制器上使用`@UseGuards()`装饰器，你可以简单地标记哪些路由应该是公共的。

首先，使用以下构造(在任何模块中)将`JwtAuthGuard`注册为全局保护:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
],
```

有了这个，Nest 会自动绑定`JwtAuthGuard`到所有的端点。

现在我们必须提供一种机制来将路由声明为公共的。
为此，我们可以使用`SetMetadata`装饰器工厂函数创建一个自定义装饰器。

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

在上面的文件中，我们导出了两个常量。
一个是我们的元数据键 IS_PUBLIC_KEY，另一个是我们的新装饰器本身，我们将称之为`Public`(你也可以将它命名为`SkipAuth`或`AllowAnon`，只要适合你的项目)。

现在我们有了一个自定义的`@Public()`装饰器，我们可以使用它来装饰任何方法，如下所示:

```typescript
@Public()
@Get()
findAll() {
  return [];
}
```

最后，当`isPublic`元数据被发现时，我们需要`JwtAuthGuard`返回`true`。
为此，我们将使用`Reflector`类(阅读更多[在这里](/guards#putting-it-all-together)).

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

## 请求范围内的策略

passport API 基于将策略注册到库的全局实例。
因此，策略的设计并不是为了拥有与请求相关的选项，或者为每个请求动态实例化(阅读更多关于[请求作用域](/fundamentals/injection-scopes)提供器的信息)。
当你将策略配置为请求作用域时，Nest 将不会实例化它，因为它没有绑定到任何特定的路由。
没有物理方法来确定每个请求应该执行哪些“请求范围”的策略。

但是，有一些方法可以在策略中动态地解析请求范围的提供器。
为此，我们利用了[module reference](/fundamentals/module-ref)特性。
首先，打开`local.strategy.ts`文件，以正常方式注入`ModuleRef`:

```typescript
constructor(private moduleRef: ModuleRef) {
  super({
    passReqToCallback: true,
  });
}
```

!!! info "**Hint**"

    `ModuleRef`类是从`@nestjs/core`包中导入的。

确保将`passReqToCallback`配置属性设置为`true`，如上所示。

在下一步中，请求实例将被用来获取当前的上下文标识符，而不是生成一个新的标识符(阅读更多关于请求上下文的信息[here](/fundamentals/module-ref#getting-current-sub-tree))。

现在，在`LocalStrategy`类的`validate()`方法中，使用`ContextIdFactory`类的`getByRequest()`方法创建基于请求对象的上下文 id，并将其传递给`resolve()`调用:

```typescript
async validate(
  request: Request,
  username: string,
  password: string,
) {
  const contextId = ContextIdFactory.getByRequest(request);
  // "AuthService" is a request-scoped provider
  const authService = await this.moduleRef.resolve(AuthService, contextId);
  ...
}
```

在上面的例子中，`resolve()`方法将异步返回`AuthService`提供器的请求范围的实例(我们假设`AuthService`被标记为请求范围的提供器)。

## 定制的 Passport

任何标准的 Passport 定制选项都可以通过同样的方式传递，使用`register()`方法。
可用的选择取决于正在实施的战略。
例如:

```typescript
PassportModule.register({ session: true });
```

您还可以在策略的构造函数中传递一个选项对象来配置它们。
对于 local 策略，你可以通过，例如:

```typescript
constructor(private authService: AuthService) {
  super({
    usernameField: 'email',
    passwordField: 'password',
  });
}
```

查看官方[Passport 网站](http://www.passportjs.org/docs/oauth/)的属性名称。

## 命名策略

当实现一个策略时，你可以通过传递第二个参数给·`PassportStrategy`·函数来为它提供一个名称。
如果你不这样做，每个策略将有一个默认名称(例如，`jwt`为`jwt-strategy`):

```typescript
export class JwtStrategy extends PassportStrategy(Strategy, 'myjwt')
```

然后，你可以通过装饰器来引用它，比如`@UseGuards(AuthGuard('myjwt'))`。

## GraphQL

为了在[GraphQL](https://docs.nestjs.com/graphql/quick-start)中使用 AuthGuard，扩展内置的 AuthGuard 类并覆盖 getRequest()方法。

```typescript
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

要在你的 graphql 解析器中获取当前认证的用户，你可以定义一个`@CurrentUser()`装饰器:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
```

要在你的解析器中使用上述装饰器，请确保将其作为你的查询或变异的参数:

```typescript
@Query(returns => User)
@UseGuards(GqlAuthGuard)
whoAmI(@CurrentUser() user: User) {
  return this.usersService.findById(user.id);
}
```
