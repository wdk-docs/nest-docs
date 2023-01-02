# 数据库

Nest 与数据库无关，允许您轻松地与任何 SQL 或 NoSQL 数据库集成。
根据您的偏好，您有许多可供选择的选项。
在最一般的层面上，连接 Nest 到数据库只是一个简单的问题，为数据库加载一个合适的 Node.js 驱动程序，就像你使用[Express](https://expressjs.com/en/guide/database-integration.html)或 fasttify 一样。

你也可以直接使用任何通用的 Node.js 数据库集成 **库** 或 ORM, such as [MikroORM](https://mikro-orm.io/) also check the [recipe here](/recipes/mikroorm), [Sequelize](https://sequelize.org/) (navigate to the [Sequelize integration](/techniques/database#sequelize-integration) section), [Knex.js](https://knexjs.org/) ([tutorial](https://dev.to/nestjs/build-a-nestjs-module-for-knex-js-or-other-resource-based-libraries-in-5-minutes-12an)), [TypeORM](https://github.com/typeorm/typeorm), and [Prisma](https://www.github.com/prisma/prisma) ([recipe](/recipes/prisma)) , 以在更高的抽象级别上操作。

为了方便起见，Nest 提供了与 TypeORM 和 Sequelize 的紧密集成，它们分别是`@nestjs/typeorm`和`@nestjs/sequelize`包，我们将在本章中介绍，而 Mongoose 与`@nestjs/mongoose`包，这在[本章](/techniques/mongodb)中介绍。
这些集成提供了额外的特定于 `nestjs` 的特性，例如模型/存储库注入、可测试性和异步配置，使访问您选择的数据库更加容易。

## TypeORM 集成

为了集成 SQL 和 NoSQL 数据库，Nest 提供了`@nestjs/typeform`包。
Nest 使用[TypeORM](https://github.com/typeorm/typeorm)是因为它是 TypeScript 可用的最成熟的对象关系映射器(Object Relational Mapper, ORM)。
因为它是用 TypeScript 编写的，所以可以很好地与 Nest 框架集成。

要开始使用它，我们首先安装所需的依赖项。
在本章中，我们将演示使用流行的[MySQL](https://www.mysql.com/)关系数据库管理系统，但 TypeORM 提供了许多关系数据库的支持，如 PostgreSQL, Oracle, Microsoft SQL Server, SQLite，甚至 NoSQL 数据库，如 MongoDB。
对于 TypeORM 支持的任何数据库，我们在本章中所经历的过程都是相同的。
您只需要为所选数据库安装相关的客户端 API 库。

```bash
$ npm install --save @nestjs/typeorm typeorm mysql2
```

一旦安装过程完成，我们就可以把`TypeOrmModule`导入到根目录`AppModule`中。

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';

    @Module({
      imports: [
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'root',
          database: 'test',
          entities: [],
          synchronize: true,
        }),
      ],
    })
    export class AppModule {}
    ```

!!! warning

    设置`synchronize: true`不应该在生产中使用，否则您可能会丢失生产数据。

`forRoot()`方法支持所有由[TypeORM](https://typeorm.io/#/connection-options)包中的`createConnection()`函数公开的配置属性。
此外，下面还描述了几个额外的配置属性。

<table>
  <tr>
    <td><code>retryAttempts</code></td>
    <td>尝试连接数据库的次数 (default: <code>10</code>)</td>
  </tr>
  <tr>
    <td><code>retryDelay</code></td>
    <td>连接重试之间的延迟(ms) (default: <code>3000</code>)</td>
  </tr>
  <tr>
    <td><code>autoLoadEntities</code></td>
    <td>如果<code>true</code>，实体将被自动加载 (default: <code>false</code>)</td>
  </tr>
  <tr>
    <td><code>keepConnectionAlive</code></td>
    <td>如果<code>true</code>，连接将不会在应用程序关闭时关闭 (default: <code>false</code>)</td>
  </tr>
</table>

!!! info "**Hint**"

    有关连接选项的更多信息[这里](https://typeorm.io/#/connection-options)。

或者，不需要将配置对象传递给`forRoot()`，我们可以在项目根目录创建一个`ormconfig.json`文件。

```json
{
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "username": "root",
  "password": "root",
  "database": "test",
  "entities": ["dist/**/*.entity{.ts,.js}"],
  "synchronize": true
}
```

然后，我们可以不带任何选项调用`forRoot()`:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';

    @Module({
      imports: [TypeOrmModule.forRoot()],
    })
    export class AppModule {}
    ```

!!! warning

    静态的 glob 路径(e.g., `dist/** /*.entity{{ '{' }} .ts,.js{{ '}' }}`)不会正常工作[webpack](https://webpack.js.org/).

!!! info "**Hint**"

    注意`ormconfig.json` 文件是由`typeform`库加载的。

> 因此，上面描述的任何额外属性(通过内部的`forRoot()`方法支持-例如，`autoLoadEntities`和`retryDelay`)将不会被应用。
> 幸运的是，TypeORM 提供了[`getConnectionOptions`](https://typeorm.io/#/using-ormconfig/overriding-options-defined-in-ormconfig)函数，该函数从`ormconfig`文件或环境变量中读取连接选项。
> 这样，你仍然可以使用配置文件并设置特定于 nest 的选项，如下所示:
>
> ```typescript
> TypeOrmModule.forRootAsync({
>   useFactory: async () =>
>     Object.assign(await getConnectionOptions(), {
>       autoLoadEntities: true,
>     }),
> });
> ```

一旦完成，TypeORM `Connection`和`EntityManager`对象将可以在整个项目中注入(不需要导入任何模块)，例如:

=== "app.module.ts"

    ```ts
    import { Connection } from 'typeorm';

    @Module({
      imports: [TypeOrmModule.forRoot(), UsersModule],
    })
    export class AppModule {
      constructor(private connection: Connection) {}
    }
    ```

=== "JavaScript"

    ```js
    import { Connection } from 'typeorm';

    @Dependencies(Connection)
    @Module({
      imports: [TypeOrmModule.forRoot(), UsersModule],
    })
    export class AppModule {
      constructor(connection) {
        this.connection = connection;
      }
    }
    ```

## 库模式

[TypeORM](https://github.com/typeorm/typeorm)支持 **库设计模式** ，因此每个实体都有自己的库。
这些存储库可以从数据库连接中获得。

为了继续这个例子，我们至少需要一个实体。
让我们定义“用户”实体。

=== "user.entity.ts"

    ```ts
    import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

    @Entity()
    export class User {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      firstName: string;

      @Column()
      lastName: string;

      @Column({ default: true })
      isActive: boolean;
    }
    ```

!!! info "**Hint**"

    关于实体的更多信息，请参阅[TypeORM 文档](https://typeorm.io/#/entities)。

`User`实体文件位于`users`目录中。
这个目录包含所有与`UsersModule`相关的文件。
你可以决定在哪里保存你的模型文件，然而，我们建议在它们的 **域** 附近创建它们，在相应的模块目录中。

为了开始使用`User`实体，我们需要将它插入到模块的`forRoot()`方法选项中的`entities`数组中，让 TypeORM 知道它(除非你使用一个静态的 glob 路径):

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';
    import { User } from './users/user.entity';

    @Module({
      imports: [
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'root',
          database: 'test',
          entities: [User],
          synchronize: true,
        }),
      ],
    })
    export class AppModule {}
    ```

接下来，让我们看看`UsersModule`:

=== "users.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';
    import { UsersService } from './users.service';
    import { UsersController } from './users.controller';
    import { User } from './user.entity';

    @Module({
      imports: [TypeOrmModule.forFeature([User])],
      providers: [UsersService],
      controllers: [UsersController],
    })
    export class UsersModule {}
    ```

这个模块使用`forFeature()`方法来定义哪些存储库注册在当前范围内。
有了它，我们就可以使用`@InjectRepository()`装饰器将`UsersRepository`注入到`UsersService`中:

=== "users.service.ts"

    ```ts
    import { Injectable } from '@nestjs/common';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository } from 'typeorm';
    import { User } from './user.entity';

    @Injectable()
    export class UsersService {
      constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
      ) {}

      findAll(): Promise<User[]> {
        return this.usersRepository.find();
      }

      findOne(id: string): Promise<User> {
        return this.usersRepository.findOne(id);
      }

      async remove(id: string): Promise<void> {
        await this.usersRepository.delete(id);
      }
    }
    ```

=== "users.service.js"

    ```js
    import { Injectable, Dependencies } from '@nestjs/common';
    import { getRepositoryToken } from '@nestjs/typeorm';
    import { User } from './user.entity';

    @Injectable()
    @Dependencies(getRepositoryToken(User))
    export class UsersService {
      constructor(usersRepository) {
        this.usersRepository = usersRepository;
      }

      findAll() {
        return this.usersRepository.find();
      }

      findOne(id) {
        return this.usersRepository.findOne(id);
      }

      async remove(id) {
        await this.usersRepository.delete(id);
      }
    }
    ```

!!! warning

    别忘了把`UsersModule`导入根模块`AppModule`。

如果你想使用模块外部的存储库，该模块导入了`TypeOrmModule.forFeature()`，你需要重新导出它生成的提供器。
你可以通过导出整个模块来实现，像这样:

=== "users.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';
    import { User } from './user.entity';

    @Module({
      imports: [TypeOrmModule.forFeature([User])],
      exports: [TypeOrmModule],
    })
    export class UsersModule {}
    ```

现在，如果我们在`UserHttpModule`中导入`UsersModule`，我们可以在后一个模块的 providers 中使用`@InjectRepository(User)`。

=== "users-http.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { UsersModule } from './users.module';
    import { UsersService } from './users.service';
    import { UsersController } from './users.controller';

    @Module({
      imports: [UsersModule],
      providers: [UsersService],
      controllers: [UsersController],
    })
    export class UserHttpModule {}
    ```

## 关系

关系是在两个或多个表之间建立的关联。
关系基于每个表的公共字段，通常涉及主键和外键。

有三种关系:

<table>
  <tr>
    <td><code>One-to-one</code></td>
    <td>主表中的每一行在外部表中有且只有一个关联行。使用<code>@OneToOne()</code>装饰器来定义这种类型的关系。</td>
  </tr>
  <tr>
    <td><code>One-to-many / Many-to-one</code></td>
    <td>主表中的每一行在外部表中都有一个或多个相关行。使用<code>@OneToMany()</code>和<code>@ManyToOne()</code>装饰器来定义这种类型的关系。</td>
  </tr>
  <tr>
    <td><code>Many-to-many</code></td>
    <td>主表中的每一行在外部表中有许多相关行，而外部表中的每条记录在主表中有许多相关行。使用<code>@ManyToMany()</code>装饰器来定义这种类型的关系。</td>
  </tr>
</table>

要定义实体中的关系，请使用相应的 **装饰器** 。
例如，要定义每个`User`可以有多个照片，请使用`@OneToMany()`装饰器。

=== "user.entity.ts"

    ```ts
    import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
    import { Photo } from '../photos/photo.entity';

    @Entity()
    export class User {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      firstName: string;

      @Column()
      lastName: string;

      @Column({ default: true })
      isActive: boolean;

      @OneToMany((type) => Photo, (photo) => photo.user)
      photos: Photo[];
    }
    ```

!!! info "**Hint**"

    要了解 TypeORM 中的更多关系，请访问[TypeORM 文档](https://typeorm.io/#/relations)。

## 自动加载实体

手动添加实体到连接选项的`entities`数组中可能很繁琐。
此外，从根模块引用实体会打破应用程序域边界，并导致实现细节泄露到应用程序的其他部分。
为了解决这个问题，可以使用静态 glob 路径 (e.g., `dist/**/*.entity{{ '{' }} .ts,.js{{ '}' }}`).

但是请注意，webpack 不支持 glob 路径，所以如果你在 monorepo 中构建你的应用程序，你将无法使用它们。
为了解决这个问题，我们提供了另一种解决方案。
要自动加载实体，需要将配置对象(传入`forRoot()`方法)的`autoLoadEntities`属性设置为`true`，如下所示:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';

    @Module({
      imports: [
        TypeOrmModule.forRoot({
          ...
          autoLoadEntities: true,
        }),
      ],
    })
    export class AppModule {}
    ```

指定该选项后，每个通过`forFeature()`方法注册的实体都会自动添加到配置对象的`entities`数组中。

!!! warning

    请注意，没有通过`forFeature()`方法注册的实体，但仅从实体引用(通过关系)，将不包括在`autoLoadEntities`设置的方式。

## 分离的实体定义

您可以使用装饰器在模型中直接定义实体及其列。
但是有些人喜欢使用[`实体模式`](https://typeorm.io/#/separating-entity-definition)在单独的文件中定义实体和它们的列。

```typescript
import { EntitySchema } from 'typeorm';
import { User } from './user.entity';

export const UserSchema = new EntitySchema<User>({
  name: 'User',
  target: User,
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  relations: {
    photos: {
      type: 'one-to-many',
      target: 'Photo', // the name of the PhotoSchema
    },
  },
});
```

> warning error **Warning** 如果您提供了`target`选项，`name` 选项的值必须与目标类的名称相同。
> 如果您不提供`target`，您可以使用任何名称。

嵌套允许你在任何需要`Entity`的地方使用`EntitySchema`实例，例如:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSchema } from './user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSchema])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
```

## 事务

数据库事务代表在数据库管理系统中针对数据库执行的工作单元，并以独立于其他事务的一致和可靠的方式处理。
事务通常代表数据库中的任何变化([了解更多信息](https://en.wikipedia.org/wiki/Database_transaction))。

有许多不同的策略来处理[TypeORM 事务](https://typeorm.io/#/transactions)。
我们建议使用`QueryRunner`类，因为它提供了对事务的完全控制。

首先，我们需要以正常的方式将`Connection`对象注入到类中:

```typescript
@Injectable()
export class UsersService {
  constructor(private connection: Connection) {}
}
```

!!! info "**Hint**"

    Connection 类是从 type 包中导入的。

现在，我们可以使用这个对象来创建事务。

```typescript
async createMany(users: User[]) {
  const queryRunner = this.connection.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.manager.save(users[0]);
    await queryRunner.manager.save(users[1]);

    await queryRunner.commitTransaction();
  } catch (err) {
    // since we have errors lets rollback the changes we made
    await queryRunner.rollbackTransaction();
  } finally {
    // you need to release a queryRunner which was manually instantiated
    await queryRunner.release();
  }
}
```

!!! info "**Hint**"

    注意`connection`仅用于创建`QueryRunner`。

> 但是，要测试这个类，需要模拟整个`Connection`对象(它公开了几个方法)。
> 因此，我们建议使用一个助手工厂类(例如，`QueryRunnerFactory`)，并定义一个接口，该接口包含一组维护事务所需的有限方法。
> 这种技术使得模仿这些方法非常简单。

或者，你可以使用回调风格的方法，使用`Connection`对象的`transaction`方法([read more](https://typeorm.io/#/transactions/creating-and-using-transactions))。

```typescript
async createMany(users: User[]) {
  await this.connection.transaction(async manager => {
    await manager.save(users[0]);
    await manager.save(users[1]);
  });
}
```

不建议使用装饰器来控制事务(`@Transaction()`和`@TransactionManager()`)。

## 订阅者

使用 TypeORM[订阅者](https://typeorm.io/#/listeners-and-subscribers/what-is-a-subscriber)，您可以监听特定的实体事件。

```typescript
import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { User } from './user.entity';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  constructor(connection: Connection) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  beforeInsert(event: InsertEvent<User>) {
    console.log(`BEFORE USER INSERTED: `, event.entity);
  }
}
```

> error **Warning** 事件订阅者不能[以请求为范围](/fundamentals/injection-scopes).

现在，将`UserSubscriber`类添加到`providers`数组中:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSubscriber } from './user.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UserSubscriber],
  controllers: [UsersController],
})
export class UsersModule {}
```

!!! info "**Hint**"

    了解更多实体订阅者[此处](https://typeorm.io/#/listeners-and-subscribers/what-is-a-subscriber).

## 迁移

[Migrations](https://typeorm.io/#/migrations)提供了一种方法来增量地更新数据库模式，使其与应用程序的数据模型保持同步，同时保留数据库中的现有数据。
为了生成、运行和恢复迁移，TypeORM 提供了一个专用的[CLI](https://typeorm.io/#/migrations/creating-a-new-migration).

迁移类与 Nest 应用程序源代码是分开的。
它们的生命周期是由 TypeORM CLI 维护的。
因此，您不能通过迁移来利用依赖注入和其他 Nest 特定的特性。
要了解更多关于迁移的信息，请参考[TypeORM 文档](https://typeorm.io/#/migrations/creating-a-new-migration)中的指南。

## 多个数据库

有些项目需要多个数据库连接。
这也可以通过这个模块实现。
要处理多个连接，首先要创建连接。
在这种情况下，连接命名成为 **必须的** 。

假设您有一个`Album`实体存储在自己的数据库中。

```typescript
const defaultOptions = {
  type: 'postgres',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'db',
  synchronize: true,
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...defaultOptions,
      host: 'user_db_host',
      entities: [User],
    }),
    TypeOrmModule.forRoot({
      ...defaultOptions,
      name: 'albumsConnection',
      host: 'album_db_host',
      entities: [Album],
    }),
  ],
})
export class AppModule {}
```

!!! warning

    如果你没有为一个连接设置`name`，它的名称将被设置为`default`。

> 请注意，您不应该有多个没有名称或具有相同名称的连接，否则它们将被覆盖。

此时，你有`User`和`Album`实体注册到它们自己的连接。
在这个设置中，你必须告诉`TypeOrmModule.forFeature()`方法和`@InjectRepository()`装饰器应该使用哪个连接。
如果您没有传递任何连接名称，则使用`default`连接。

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Album], 'albumsConnection'),
  ],
})
export class AppModule {}
```

你也可以为一个给定的连接注入`Connection`或`EntityManager`:

```typescript
@Injectable()
export class AlbumsService {
  constructor(
    @InjectConnection('albumsConnection')
    private connection: Connection,
    @InjectEntityManager('albumsConnection')
    private entityManager: EntityManager,
  ) {}
}
```

也可以将任何`Connection`注入到提供器:

```typescript
@Module({
  providers: [
    {
      provide: AlbumsService,
      useFactory: (albumsConnection: Connection) => {
        return new AlbumsService(albumsConnection);
      },
      inject: [getConnectionToken('albumsConnection')],
    },
  ],
})
export class AlbumsModule {}
```

## 测试

当涉及到应用程序的单元测试时，我们通常希望避免建立数据库连接，保持测试套件的独立性，并尽可能快地执行它们。
但是我们的类可能依赖于从连接实例中提取的存储库。
我们该如何处理呢?解决方案是创建模拟存储库。
为了实现这个目标，我们设置了[custom providers](/fundamentals/custom-providers)。
每个注册的存储库都自动由`<EntityName>Repository`令牌表示，其中`EntityName`是您的实体类的名称。

`@nestjs/typeform`包公开了`getRepositoryToken()`函数，该函数根据给定的实体返回一个准备好的令牌。

```typescript
@Module({
  providers: [
    UsersService,
    {
      provide: getRepositoryToken(User),
      useValue: mockRepository,
    },
  ],
})
export class UsersModule {}
```

现在，将使用一个替代的`mockRepository`作为`UsersRepository`。
每当任何类使用`@InjectRepository()`装饰器请求`UsersRepository`时，Nest 就会使用注册的`mockRepository`对象。

## 自定义库

TypeORM 提供了一个叫做自定义库的特性。
自定义存储库允许您扩展基存储库类，并使用几个特殊的方法充实它。
要了解更多关于此功能的信息，请访问[本页](https://typeorm.io/#/custom-repository)。

为了创建您的自定义存储库，请使用`@EntityRepository()`装饰器并扩展`repository`类。

```typescript
@EntityRepository(Author)
export class AuthorRepository extends Repository<Author> {}
```

!!! info "**Hint**"

    `@EntityRepository()`和`Repository`都是从`typeform`包中导入的。

一旦创建了类，下一步就是将实例化责任委托给 Nest。
为此，我们必须将`AuthorRepository`类传递给`TypeOrm.forFeature()`方法。

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([AuthorRepository])],
  controller: [AuthorController],
  providers: [AuthorService],
})
export class AuthorModule {}
```

之后，只需使用下面的构造注入存储库:

```typescript
@Injectable()
export class AuthorService {
  constructor(private authorRepository: AuthorRepository) {}
}
```

## 异步的配置

您可能希望异步传递存储库模块选项，而不是静态传递。
在这种情况下，使用`forRootAsync()`方法，它提供了几种处理异步配置的方法。

一种方法是使用工厂函数:

```typescript
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'root',
    database: 'test',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
  }),
});
```

我们的工厂的行为和其他[异步提供器](https://docs.nestjs.com/fundamentals/async-providers)一样(例如，它可以是`async`，并且可以通过`inject`注入依赖项)。

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.get('HOST'),
    port: +configService.get<number>('PORT'),
    username: configService.get('USERNAME'),
    password: configService.get('PASSWORD'),
    database: configService.get('DATABASE'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
  }),
  inject: [ConfigService],
});
```

或者，你可以使用`useClass`语法:

```typescript
TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
});
```

上面的构造将在 `TypeOrmModule` 中实例化 `TypeOrmConfigService`，并通过调用 `createTypeOrmOptions()` 来使用它来提供一个选项对象。
注意，这意味着 `TypeOrmConfigService` 必须实现 `TypeOrmOptionsFactory` 接口，如下所示:

```typescript
@Injectable()
class TypeOrmConfigService implements TypeOrmOptionsFactory {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    };
  }
}
```

为了防止在`TypeOrmModule`中创建 `TypeOrmConfigService` ，并使用从不同模块导入的提供器，你可以使用 `useExisting` 语法。

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

这个构造的工作原理与`useClass`相同，但有一个关键的区别——`TypeOrmModule`将查找导入的模块来重用现有的`ConfigService`，而不是实例化一个新的。

!!! info "**Hint**"

    确保`name`属性与`useFactory`、`useClass`或`useValue`属性定义在同一级别。

> 这将允许 Nest 在适当的注入令牌下正确地注册连接。

## 自定义连接工厂

在使用`useFactory`， `useClass`，或`useExisting`的 async 配置中，你可以选择指定一个`connectionFactory`函数，它将允许你提供自己的 TypeORM 连接，而不是允许`TypeOrmModule`来创建连接。

`connectionFactory`接收到在异步配置期间使用`useFactory`， `useClass`或`useExisting`配置的 TypeORM `ConnectionOptions`，并返回一个`Promise`来解析 TypeORM `Connection`。

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  // Use useFactory, useClass, or useExisting
  // to configure the ConnectionOptions.
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.get('HOST'),
    port: +configService.get<number>('PORT'),
    username: configService.get('USERNAME'),
    password: configService.get('PASSWORD'),
    database: configService.get('DATABASE'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
  }),
  // connectionFactory receives the configured ConnectionOptions
  // and returns a Promise<Connection>.
  connectionFactory: async (options) => {
    const connection = await createConnection(options);
    return connection;
  },
});
```

!!! info "**Hint**"

    `createConnection`函数是从`typeform`包中导入的。

## 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/05-sql-typeorm).

# Sequelize 集成

使用 TypeORM 的另一个选择是使用[Sequelize](https://sequelize.org/) ORM 和`@nestjs/sequelize`包。
此外，我们还利用了[sequelize-typescript](https://github.com/RobinBuschmann/sequelize-typescript)包，它提供了一组额外的装饰器来声明性地定义实体。

要开始使用它，我们首先安装所需的依赖项。
在本章中，我们将演示如何使用流行的[MySQL](https://www.mysql.com/)关系数据库管理系统，但是 Sequelize 提供了对许多关系数据库的支持，如 PostgreSQL、MySQL、Microsoft SQL Server、SQLite 和 MariaDB。
对于 Sequelize 支持的任何数据库，我们在本章中所经历的过程都是相同的。
您只需要为所选数据库安装相关的客户端 API 库。

```bash
$ npm install --save @nestjs/sequelize sequelize sequelize-typescript mysql2
$ npm install --save-dev @types/sequelize
```

一旦安装完成，我们就可以把`SequelizeModule`导入到根目录`AppModule`中。

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { SequelizeModule } from '@nestjs/sequelize';

    @Module({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'root',
          database: 'test',
          models: [],
        }),
      ],
    })
    export class AppModule {}
    ```

forRoot()方法支持 Sequelize 构造函数公开的所有配置属性([read more](https://sequelize.org/v5/manual/getting-started.html#setting-up-a-connection))。
此外，下面还描述了几个额外的配置属性。

<table>
  <tr>
    <td><code>retryAttempts</code></td>
    <td>尝试连接数据库的次数 (default: <code>10</code>)</td>
  </tr>
  <tr>
    <td><code>retryDelay</code></td>
    <td>连接重试之间的延迟(ms) (default: <code>3000</code>)</td>
  </tr>
  <tr>
    <td><code>autoLoadModels</code></td>
    <td>如果<code>true</code>，模型将自动加载 (default: <code>false</code>)</td>
  </tr>
  <tr>
    <td><code>keepConnectionAlive</code></td>
    <td>如果<code>true</code>，连接将不会在应用程序关闭时关闭 (default: <code>false</code>)</td>
  </tr>
  <tr>
    <td><code>synchronize</code></td>
    <td>如果<code>true</code>，自动加载的模型将被同步 (default: <code>true</code>)</td>
  </tr>
</table>

一旦完成，`Sequelize`对象将可以在整个项目中注入(不需要导入任何模块)，例如:

=== "app.service.ts"

    ```ts
    import { Injectable } from '@nestjs/common';
    import { Sequelize } from 'sequelize-typescript';

    @Injectable()
    export class AppService {
      constructor(private sequelize: Sequelize) {}
    }
    ```

=== "app.service.js"

    ```js
    import { Injectable } from '@nestjs/common';
    import { Sequelize } from 'sequelize-typescript';

    @Dependencies(Sequelize)
    @Injectable()
    export class AppService {
      constructor(sequelize) {
        this.sequelize = sequelize;
      }
    }
    ```

## 模型

`Sequelize` 实现活动记录模式。
使用这个模式，您可以直接使用模型类与数据库交互。
为了继续这个例子，我们至少需要一个模型。
让我们定义`User`模型。

=== "user.model.ts"

    ```ts
    import { Column, Model, Table } from 'sequelize-typescript';

    @Table
    export class User extends Model {
      @Column
      firstName: string;

      @Column
      lastName: string;

      @Column({ defaultValue: true })
      isActive: boolean;
    }
    ```

!!! info "**Hint**"

    了解更多可用的 decorator[这里](https://github.com/RobinBuschmann/sequelize-typescript#column).

`User`模型文件位于`users`目录中。
这个目录包含所有与`UsersModule`相关的文件。
你可以决定在哪里保存你的模型文件，然而，我们建议在它们的 **域** 附近创建它们，在相应的模块目录中。

为了开始使用“User”模型，我们需要把它插入到模块的“forRoot()”方法选项中的“models”数组中，让 Sequelize 知道它:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { SequelizeModule } from '@nestjs/sequelize';
    import { User } from './users/user.model';

    @Module({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'root',
          database: 'test',
          models: [User],
        }),
      ],
    })
    export class AppModule {}
    ```

接下来，让我们看看“UsersModule”:

=== "users.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { SequelizeModule } from '@nestjs/sequelize';
    import { User } from './user.model';
    import { UsersController } from './users.controller';
    import { UsersService } from './users.service';

    @Module({
      imports: [SequelizeModule.forFeature([User])],
      providers: [UsersService],
      controllers: [UsersController],
    })
    export class UsersModule {}
    ```

这个模块使用`forFeature()`方法来定义哪些模型注册在当前范围内。
有了它，我们就可以使用`@InjectModel()`装饰器将`UserModel`注入到`UsersService`中:

=== "users.service.ts"

    ```ts
    import { Injectable } from '@nestjs/common';
    import { InjectModel } from '@nestjs/sequelize';
    import { User } from './user.model';

    @Injectable()
    export class UsersService {
      constructor(
        @InjectModel(User)
        private userModel: typeof User,
      ) {}

      async findAll(): Promise<User[]> {
        return this.userModel.findAll();
      }

      findOne(id: string): Promise<User> {
        return this.userModel.findOne({
          where: {
            id,
          },
        });
      }

      async remove(id: string): Promise<void> {
        const user = await this.findOne(id);
        await user.destroy();
      }
    }
    ```

=== "users.service.js"

    ```js
    import { Injectable, Dependencies } from '@nestjs/common';
    import { getModelToken } from '@nestjs/sequelize';
    import { User } from './user.model';

    @Injectable()
    @Dependencies(getModelToken(User))
    export class UsersService {
      constructor(usersRepository) {
        this.usersRepository = usersRepository;
      }

      async findAll() {
        return this.userModel.findAll();
      }

      findOne(id) {
        return this.userModel.findOne({
          where: {
            id,
          },
        });
      }

      async remove(id) {
        const user = await this.findOne(id);
        await user.destroy();
      }
    }
    ```

!!! warning

    别忘了把`UsersModule`导入根模块`AppModule`。

如果你想在导入`SequelizeModulefor.Feature`的模块外部使用存储库，你需要重新导出它生成的提供器。
你可以通过导出整个模块来实现，像这样:

=== "users.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { SequelizeModule } from '@nestjs/sequelize';
    import { User } from './user.entity';

    @Module({
      imports: [SequelizeModule.forFeature([User])],
      exports: [SequelizeModule],
    })
    export class UsersModule {}
    ```

现在，如果我们在`UserHttpModule`中导入`UsersModule`，我们可以在后一个模块的`providers`中使用`@InjectModel(User)`。

=== "users-http.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { UsersModule } from './users.module';
    import { UsersService } from './users.service';
    import { UsersController } from './users.controller';

    @Module({
      imports: [UsersModule],
      providers: [UsersService],
      controllers: [UsersController],
    })
    export class UserHttpModule {}
    ```

## 关系

关系是在两个或多个表之间建立的关联。
关系基于每个表的公共字段，通常涉及主键和外键。

有三种关系:

<table>
  <tr>
    <td><code>One-to-one</code></td>
    <td>主表中的每一行在外部表中有且只有一个关联行</td>
  </tr>
  <tr>
    <td><code>One-to-many / Many-to-one</code></td>
    <td>主表中的每一行在外部表中都有一个或多个相关行</td>
  </tr>
  <tr>
    <td><code>Many-to-many</code></td>
    <td>主表中的每一行在外部表中有许多相关行，而外部表中的每条记录在主表中有许多相关行</td>
  </tr>
</table>

要定义实体中的关系，请使用相应的 **装饰器** 。
例如，要定义每个`User`可以有多个照片，请使用`@HasMany()`装饰器。

=== "user.entity.ts"

    ```ts
    import { Column, Model, Table, HasMany } from 'sequelize-typescript';
    import { Photo } from '../photos/photo.model';

    @Table
    export class User extends Model {
      @Column
      firstName: string;

      @Column
      lastName: string;

      @Column({ defaultValue: true })
      isActive: boolean;

      @HasMany(() => Photo)
      photos: Photo[];
    }
    ```

!!! info "**Hint**"

    要在 Sequelize 中了解更多有关关联的信息，请阅读[this](https://github.com/RobinBuschmann/sequelize-typescript#model-association)这一章。

## 自动负载模型

手动添加模型到连接选项的`models`数组中可能会很繁琐。
此外，从根模块引用模型会打破应用程序域边界，并导致实现细节泄露到应用程序的其他部分。
为了解决这个问题，通过将配置对象的`autoLoadModels`和`synchronize`属性(传入到`forRoot()`方法中)设置为`true`来自动加载模型，如下所示:

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { SequelizeModule } from '@nestjs/sequelize';

    @Module({
      imports: [
        SequelizeModule.forRoot({
          ...
          autoLoadModels: true,
          synchronize: true,
        }),
      ],
    })
    export class AppModule {}
    ```

指定了这个选项后，每个通过`forFeature()`方法注册的模型都会自动添加到配置对象的`models`数组中。

!!! warning

    请注意，没有通过`forFeature()`方法注册的模型，但仅从模型引用(通过关联)，将不包括在内。

## 事务

数据库事务代表在数据库管理系统中针对数据库执行的工作单元，并以独立于其他事务的一致和可靠的方式处理。
事务通常代表数据库中的任何变化([了解更多信息](https://en.wikipedia.org/wiki/Database_transaction))。

有许多不同的策略来处理[Sequelize transaction](https://sequelize.org/v5/manual/transactions.html)。
下面是托管事务(自动回调)的示例实现。

首先，我们需要以正常的方式将`Sequelize`对象注入到类中:

```typescript
@Injectable()
export class UsersService {
  constructor(private sequelize: Sequelize) {}
}
```

!!! info "**Hint**"

    `Sequelize` 类是从 `sequelize-typescript` 包中导入的。

现在，我们可以使用这个对象来创建事务。

```typescript
async createMany() {
  try {
    await this.sequelize.transaction(async t => {
      const transactionHost = { transaction: t };

      await this.userModel.create(
          { firstName: 'Abraham', lastName: 'Lincoln' },
          transactionHost,
      );
      await this.userModel.create(
          { firstName: 'John', lastName: 'Boothe' },
          transactionHost,
      );
    });
  } catch (err) {
    // Transaction has been rolled back
    // err is whatever rejected the promise chain returned to the transaction callback
  }
}
```

!!! info "**Hint**"

    Note that the `Sequelize` instance is used only to start the transaction.

> However, to test this class would require mocking the entire `Sequelize` object (which exposes several methods).
> Thus, we recommend using a helper factory class (e.g., `TransactionRunner`) and defining an interface with a limited set of methods required to maintain transactions.
> This technique makes mocking these methods pretty straightforward.

## 迁移

[Migrations](https://sequelize.org/v5/manual/migrations.html)提供了一种方法来增量地更新数据库模式，使其与应用程序的数据模型保持同步，同时保留数据库中的现有数据。
为了生成、运行和恢复迁移，Sequelize 提供了一个专用的[CLI](https://sequelize.org/v5/manual/migrations.html#the-cli)。

迁移类与 Nest 应用程序源代码是分开的。
它们的生命周期是由 Sequelize CLI 维护的。
因此，您不能通过迁移来利用依赖注入和其他 Nest 特定的特性。
要了解关于迁移的更多信息，请参考[Sequelize 文档](https://sequelize.org/v5/manual/migrations.html#the-cli)中的指南。

## 多个数据库

有些项目需要多个数据库连接。
这也可以通过这个模块实现。
要处理多个连接，首先要创建连接。
在这种情况下，连接命名成为 **必须的** 。

假设您有一个`Album`实体存储在自己的数据库中。

```typescript
const defaultOptions = {
  dialect: 'postgres',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'db',
  synchronize: true,
};

@Module({
  imports: [
    SequelizeModule.forRoot({
      ...defaultOptions,
      host: 'user_db_host',
      models: [User],
    }),
    SequelizeModule.forRoot({
      ...defaultOptions,
      name: 'albumsConnection',
      host: 'album_db_host',
      models: [Album],
    }),
  ],
})
export class AppModule {}
```

!!! warning

    如果你没有为一个连接设置“name”，它的名称将被设置为“default”。

> 请注意，您不应该有多个没有名称或具有相同名称的连接，否则它们将被覆盖。

在这一点上，你有`User` and `Album`模型注册到他们自己的连接。
在这个设置中，你必须告诉`SequelizeModule.forFeature()` 方法和`@InjectModel()`装饰器应该使用哪个连接。
如果您没有传递任何连接名称，则使用`default`连接。

```typescript
@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    SequelizeModule.forFeature([Album], 'albumsConnection'),
  ],
})
export class AppModule {}
```

你也可以为一个给定的连接注入`Sequelize`实例:

```typescript
@Injectable()
export class AlbumsService {
  constructor(
    @InjectConnection('albumsConnection')
    private sequelize: Sequelize,
  ) {}
}
```

也可以将任何`Sequelize`实例注入到提供器:

```typescript
@Module({
  providers: [
    {
      provide: AlbumsService,
      useFactory: (albumsSequelize: Sequelize) => {
        return new AlbumsService(albumsSequelize);
      },
      inject: [getConnectionToken('albumsConnection')],
    },
  ],
})
export class AlbumsModule {}
```

## 测试

当涉及到应用程序的单元测试时，我们通常希望避免建立数据库连接，保持测试套件的独立性，并尽可能快地执行它们。
但是我们的类可能依赖于从连接实例中提取的模型。
我们该如何处理呢?解决方案是创建模拟模型。
为了实现这个目标，我们设置了[custom providers](/fundamentals/custom-providers)。
每个注册的模型都由一个`<ModelName>model`令牌自动表示，其中`ModelName`是您的模型类的名称。

`@nestjs/sequelize`包公开了`getModelToken()`函数，该函数根据给定的模型返回一个准备好的令牌。

```typescript
@Module({
  providers: [
    UsersService,
    {
      provide: getModelToken(User),
      useValue: mockModel,
    },
  ],
})
export class UsersModule {}
```

现在，`mockModel`将被用作`UserModel`。
当任何类使用`@InjectModel()`装饰器请求`UserModel`时，Nest 将使用注册的`mockModel`对象。

## 异步的配置

你可能想要异步传递你的“SequelizeModule”选项，而不是静态的。
在这种情况下，使用`forRootAsync()`方法，它提供了几种处理异步配置的方法。

一种方法是使用工厂函数:

```typescript
SequelizeModule.forRootAsync({
  useFactory: () => ({
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'root',
    database: 'test',
    models: [],
  }),
});
```

我们的工厂的行为和其他[异步提供器](https://docs.nestjs.com/fundamentals/async-providers)一样(例如，它可以是`async`，并且可以通过`inject`注入依赖项)。

```typescript
SequelizeModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    dialect: 'mysql',
    host: configService.get('HOST'),
    port: +configService.get('PORT'),
    username: configService.get('USERNAME'),
    password: configService.get('PASSWORD'),
    database: configService.get('DATABASE'),
    models: [],
  }),
  inject: [ConfigService],
});
```

或者，你可以使用`useClass`语法:

```typescript
SequelizeModule.forRootAsync({
  useClass: SequelizeConfigService,
});
```

上面的构造将在`SequelizeModule`实例化`SequelizeConfigService`，并通过调用`createSequelizeOptions()`来使用它来提供一个选项对象。
注意，这意味着`SequelizeConfigService`必须实现`SequelizeOptionsFactory`接口，如下所示:

```typescript
@Injectable()
class SequelizeConfigService implements SequelizeOptionsFactory {
  createSequelizeOptions(): SequelizeModuleOptions {
    return {
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test',
      models: [],
    };
  }
}
```

为了防止在`SequelizeModule`中创建`SequelizeConfigService`，并使用从不同模块导入的提供器，你可以使用`useExisting`语法。

```typescript
SequelizeModule.forRootAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

这个构造的工作原理与`useClass`相同，但有一个关键的区别——`SequelizeModule`将查找导入的模块来重用现有的`ConfigService`，而不是实例化一个新的。

## 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/07-sequelize).
