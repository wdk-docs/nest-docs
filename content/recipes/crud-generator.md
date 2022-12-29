# CRUD 生成器

在项目的整个生命周期中，当我们构建新特性时，我们经常需要向应用程序添加新资源。
这些资源通常需要多次重复的操作，每次定义新资源时都必须重复这些操作。

## 介绍

让我们设想一个真实的场景，其中我们需要为两个实体公开 CRUD 端点，比如 **User**和**Product** 实体。
按照最佳实践，对于每个实体，我们必须执行以下几个操作:

- 生成一个模块(`nest g mo`)来保持代码的组织，并建立清晰的边界(分组相关组件)
- 生成一个控制器(`nest g co`)来定义 CRUD 路由(或 GraphQL 应用程序的查询/突变)
- 生成服务(`nest g s`)来实现和隔离业务逻辑
- 生成一个实体类/接口来表示资源数据形状
- 生成数据传输对象(或 GraphQL 应用程序的输入)，以定义数据将如何通过网络发送

这是很多步骤!

为了帮助加快这个重复的过程，[Nest CLI](/cli/overview)提供了一个生成器(示意图)，可以自动生成所有的样板代码，帮助我们避免做所有这些事情，并让开发人员的体验更简单。

!!! info **Note** 原理图支持生成**HTTP**控制器、**Microservice**控制器、**GraphQL**解析器(代码优先和模式优先)和**WebSocket** 网关。

## 生成新资源

要创建一个新的资源，只需在项目的根目录下运行以下命令:

```shell
$ nest g resource
```

`nest g resource` command not only generates all the NestJS building blocks (module, service, controller classes) but also an entity class, DTO classes as well as the testing (`.spec`) files.

Below you can see the generated controller file (for REST API):

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

此外，它还自动为所有 CRUD 端点创建占位符(REST api 的路由、GraphQL 的查询和突变、微服务和 WebSocket 网关的消息订阅)——所有这些都不需要动一根手指。

> warning **Note** 生成的服务类**不**与任何特定的**ORM(或数据源)** 绑定。
> 这使得生成器足够通用，可以满足任何项目的需要。
> 默认情况下，所有方法都将包含占位符，允许您使用特定于项目的数据源填充占位符。

同样，如果你想为一个 GraphQL 应用程序生成解析器，只需选择`GraphQL(代码优先)`(或`GraphQL(模式优先)`)作为你的传输层。

在这种情况下，NestJS 会生成一个解析器类，而不是一个 REST API 控制器:

```shell
$ nest g resource users

> ? What transport layer do you use? GraphQL (code first)
> ? Would you like to generate CRUD entry points? Yes
> CREATE src/users/users.module.ts (224 bytes)
> CREATE src/users/users.resolver.spec.ts (525 bytes)
> CREATE src/users/users.resolver.ts (1109 bytes)
> CREATE src/users/users.service.spec.ts (453 bytes)
> CREATE src/users/users.service.ts (625 bytes)
> CREATE src/users/dto/create-user.input.ts (195 bytes)
> CREATE src/users/dto/update-user.input.ts (281 bytes)
> CREATE src/users/entities/user.entity.ts (187 bytes)
> UPDATE src/app.module.ts (312 bytes)
```

!!! info "**Hint**"

    为了避免生成测试文件，你可以传递 `--no-spec` 标志，如下所示: `nest g resource users --no-spec`

我们可以在下面看到，不仅创建了所有的样板突变和查询，而且所有的东西都联系在一起。
我们正在使用`UsersService`, `User` Entity,我们的 DTO。

```typescript
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => User)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  @Query(() => [User], { name: 'users`})
  findAll() {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user`})
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User)
  updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    return this.usersService.update(updateUserInput.id, updateUserInput);
  }

  @Mutation(() => User)
  removeUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.remove(id);
  }
}
```
