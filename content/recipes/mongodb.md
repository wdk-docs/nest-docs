# MongoDB (Mongoose)

> **警告** 在本文中，您将学习如何使用自定义组件创建基于**Mongoose** 包的`DatabaseModule`。因此，这个解决方案包含了大量的开销，你可以通过使用现成可用的专用`@nestjs/mongoose`包来省略这些开销。 要了解更多，请参见[此处](/techniques/mongodb).

[Mongoose](https://mongoosejs.com)是目前最流行的[MongoDB](https://www.mongodb.org/)对象建模工具。

## 开始

要开始这个库的冒险，我们必须安装所有必需的依赖:

```typescript
$ npm install --save mongoose
```

我们需要做的第一步是使用`connect()`函数建立与数据库的连接。
`connect()`函数返回一个`Promise`，因此我们必须创建一个[async provider](/fundamentals/async-components).

=== "database.providers"

```ts
import * as mongoose from 'mongoose';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect('mongodb://localhost/nest'),
  },
];
```

=== "JavaScript"

```js
import * as mongoose from 'mongoose';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: () => mongoose.connect('mongodb://localhost/nest'),
  },
];
```

!!! info **提示** 按照最佳实践，我们在单独的文件中声明了定制的提供程序，该文件有一个`*.providers.ts`的后缀。

然后，我们需要导出这些提供器，使应用程序的其余部分能够访问它们。

=== "database.module"

```ts
import { Module } from '@nestjs/common';
import { databaseProviders } from './database.providers';

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
```

现在我们可以使用`@Inject()`装饰器来注入`Connection`对象。
每个依赖于`Connection`异步提供程序的类将等待，直到`Promise`被解析。

## 模型注入

使用 Mongoose，一切都是从[Schema](https://mongoosejs.com/docs/guide.html)派生出来的。让我们定义`CatSchema`:

=== "schemas/cat.schema"

```ts
import * as mongoose from 'mongoose';

export const CatSchema = new mongoose.Schema({
  name: String,
  age: Number,
  breed: String,
});
```

`CatsSchema`属于`cats`目录。这个目录表示`CatsModule`。

现在是时候创建一个 **Model** provider 了:

=== "cats.providers"

```ts
import { Connection } from 'mongoose';
import { CatSchema } from './schemas/cat.schema';

export const catsProviders = [
  {
    provide: 'CAT_MODEL',
    useFactory: (connection: Connection) => connection.model('Cat', CatSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];
```

=== "JavaScript"

```js
import { CatSchema } from './schemas/cat.schema';

export const catsProviders = [
  {
    provide: 'CAT_MODEL',
    useFactory: (connection) => connection.model('Cat', CatSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];
```

> warning **警告** 在实际应用中，你应该避免使用**魔法字符串** 。`CAT_MODEL`和`DATABASE_CONNECTION`都应该保存在分开的`constants.ts`文件。

现在我们可以使用`@Inject()`装饰器将`CAT_MODEL`注入到`CatsService`中:

=== "cats.service"

```ts
import { Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';
import { CreateCatDto } from './dto/create-cat.dto';

@Injectable()
export class CatsService {
  constructor(
    @Inject('CAT_MODEL')
    private catModel: Model<Cat>,
  ) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const createdCat = new this.catModel(createCatDto);
    return createdCat.save();
  }

  async findAll(): Promise<Cat[]> {
    return this.catModel.find().exec();
  }
}
```

=== "JavaScript"

```js
import { Injectable, Dependencies } from '@nestjs/common';

@Injectable()
@Dependencies('CAT_MODEL')
export class CatsService {
  constructor(catModel) {
    this.catModel = catModel;
  }

  async create(createCatDto) {
    const createdCat = new this.catModel(createCatDto);
    return createdCat.save();
  }

  async findAll() {
    return this.catModel.find().exec();
  }
}
```

在上面的例子中，我们使用了`Cat`接口。这个接口扩展了 mongoose 包中的`Document`:

```typescript
import { Document } from 'mongoose';

export interface Cat extends Document {
  readonly name: string;
  readonly age: number;
  readonly breed: string;
}
```

The database connection is **asynchronous** , but Nest makes this process completely invisible for the end-user. The `CatModel` class is waiting for the db connection, and the `CatsService` is delayed until model is ready to use. The entire application can start when each class is instantiated.
数据库连接是 **异步** 的，但是 Nest 使这个过程对最终用户完全不可见。
`CatModel`类正在等待数据库连接，而`CatsService`被延迟到模型准备好使用。
当每个类被实例化时，整个应用程序就可以启动了。

这是最后一个`CatsModule`:

=== "cats.module"

```ts
import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { catsProviders } from './cats.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CatsController],
  providers: [CatsService, ...catsProviders],
})
export class CatsModule {}
```

!!! info **提示** 不要忘记将`CatsModule`导入到根模块`AppModule`中。
