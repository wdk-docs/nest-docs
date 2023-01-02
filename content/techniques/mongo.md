# Mongo

Nest 支持两种集成[MongoDB](https://www.mongodb.com/)数据库的方法。
您可以使用[这里](/techniques/database)描述的内置[TypeORM](https://github.com/typeorm/typeorm)模块，它为 MongoDB 提供了一个连接器，或者使用[Mongoose](https://mongoosejs.com)，最流行的 MongoDB 对象建模工具。
在本章中，我们将使用专用的`@nestjs/mongoose`包来描述后面。

首先安装所需的依赖项:

```bash
$ npm install --save @nestjs/mongoose mongoose
```

一旦安装完成，我们就可以把`MongooseModule`导入到根目录`AppModule`中。

=== "app.module"

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost/nest')],
})
export class AppModule {}
```

`forRoot()`方法接受与 Mongoose 包中的`Mongoose.connect()`相同的配置对象，如[这里](https://mongoosejs.com/docs/connections.html)所述.

## 模型注入

使用 Mongoose，所有东西都来自[Schema](http://mongoosejs.com/docs/guide.html).
每个模式映射到一个 MongoDB 集合，并定义该集合中文档的形状。
`Schema`用于定义[Model](https://mongoosejs.com/docs/models.html).
模型负责从底层 MongoDB 数据库创建和读取文档。

模式可以用 NestJS 装饰器创建，也可以用 Mongoose 自己手动创建。
使用装饰器来创建模式大大减少了样板，并提高了整体代码的可读性。

我们定义的 `CatSchema`:

=== "schemas/cat.schema"

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatDocument = Cat & Document;

@Schema()
export class Cat {
  @Prop()
  name: string;

  @Prop()
  age: number;

  @Prop()
  breed: string;
}

export const CatSchema = SchemaFactory.createForClass(Cat);
```

!!! info **提示** 注意，你也可以使用`defintionsfactory`类(从`nestjs/mongoose`)生成一个原始模式定义。 这允许您手动修改基于您提供的元数据生成的模式定义。这对于某些边缘情况非常有用，在这种情况下，可能很难用 decorator 来表示所有内容。

`@Schema()`装饰器将一个类标记为一个模式定义。
它将我们的`Cat`类映射到具有相同名称的 MongoDB 集合，但在末尾添加了一个额外的`s`——所以最终的 mongo 集合名称将是`cats`。
这个装饰器接受一个可选参数，它是一个模式选项对象。
把它想象成你通常会传递给`mongoose.Schema`类构造函数的第二个参数的对象(如, `new mongoose.Schema(_, options)`))。
要了解更多可用的模式选项，请参阅[本](https://mongoosejs.com/docs/guide.html#options)章。

`@Prop()` 装饰器在文档中定义了一个属性。
例如，在上面的模式定义中，我们定义了三个属性: `name`,`age` 和 `breed`。

由于 TypeScript 的元数据(和反射)功能，这些属性的[schema types](https://mongoosejs.com/docs/schematypes.html)会被自动推断出来。
然而，在更复杂的场景中，类型不能隐式反映(例如，数组或嵌套对象结构)，类型必须显式表示，如下所示:

```typescript
@Prop([String])
tags: string[];
```

或者，`@Prop()`装饰器接受一个 options 对象参数([阅读更多](https://mongoosejs.com/docs/schematypes.html#schematype-options)关于可用选项)。
这样，您就可以指示是否需要属性、指定默认值或将其标记为不可变。例如:

```typescript
@Prop({ required: true })
name: string;
```

如果你想要指定与另一个模型的关系，稍后填充，你也可以使用`@Prop()`装饰器。
例如，如果`Cat`具有`Owner`，该属性存储在另一个名为`owners`的集合中，则该属性应该具有 type 和 ref。例如:

```typescript
import * as mongoose from 'mongoose';
import { Owner } from '../owners/schemas/owner.schema';

// inside the class definition
@Prop({ type: mongoose.Schema.Types.ObjectId, ref:'Owner`})
owner: Owner;
```

如果有多个所有者，你的属性配置应该如下所示:

```typescript
@Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref:'Owner`}] })
owner: Owner[];
```

最后，原始的模式定义也可以传递给装饰器。
例如，当属性表示未定义为类的嵌套对象时，这很有用。
为此，使用`@nestjs/mongoose`包中的`raw()`函数，如下所示:

```typescript
@Prop(raw({
  firstName: { type: String },
  lastName: { type: String }
}))
details: Record<string, any>;
```

或者，如果你不喜欢使用装饰器，你可以手动定义一个模式。例如:

```typescript
export const CatSchema = new mongoose.Schema({
  name: String,
  age: Number,
  breed: String,
});
```

`cat.schema` 文件位于`cats`目录下的一个文件夹中，在这里我们也定义了`CatsModule`。
虽然你可以将模式文件存储在任何你喜欢的地方，但我们建议将它们存储在它们相关的 **域** 对象附近，在适当的模块目录中。

让我们看看`CatsModule`:

=== "cats.module"

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { Cat, CatSchema } from './schemas/cat.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }])],
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
```

`MongooseModule`提供了`forFeature()`方法来配置模块，包括定义哪些模型应该在当前范围内注册。
如果你还想在另一个模块中使用这些模型，可以将 MongooseModule 添加到`CatsModule`的`exports`部分，并在另一个模块中导入`CatsModule`。

一旦你注册了这个模式，你就可以使用`@InjectModel()`装饰器将一个`Cat`模型注入到`CatsService`中:

=== "cats.service"

```ts
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cat, CatDocument } from './schemas/cat.schema';
import { CreateCatDto } from './dto/create-cat.dto';

@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private catModel: Model<CatDocument>) {}

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
import { Model } from 'mongoose';
import { Injectable, Dependencies } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Cat } from './schemas/cat.schema';

@Injectable()
@Dependencies(getModelToken(Cat.name))
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

## 连接

有时你可能需要访问本地[Mongoose Connection](https://mongoosejs.com/docs/api.html#Connection)对象。
例如，您可能希望对连接对象进行本机 API 调用。
你可以通过使用`@InjectConnection()`装饰器来注入 Mongoose 连接，如下所示:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class CatsService {
  constructor(@InjectConnection() private connection: Connection) {}
}
```

## 多库

有些项目需要多个数据库连接。
这也可以通过这个模块实现。
要处理多个连接，首先要创建连接。
在这种情况下，连接命名成为 **必须的** 。

=== "app.module"

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/test', {
      connectionName: 'cats',
    }),
    MongooseModule.forRoot('mongodb://localhost/users', {
      connectionName: 'users',
    }),
  ],
})
export class AppModule {}
```

> warning **请注意** 请注意，您不应该有多个没有名称或具有相同名称的连接，否则它们将被覆盖。

在这个设置中，你必须告诉`mongoosemmodule.forfeature()`函数应该使用哪个连接。

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }], 'cats'),
  ],
})
export class AppModule {}
```

你也可以为一个给定的连接注入`Connection`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class CatsService {
  constructor(@InjectConnection('cats') private connection: Connection) {}
}
```

要将给定的`Connection`注入到自定义提供器(例如，工厂提供器)，使用`getConnectionToken()`函数将连接的名称作为参数传递。

```typescript
{
  provide: CatsService,
  useFactory: (catsConnection: Connection) => {
    return new CatsService(catsConnection);
  },
  inject: [getConnectionToken('cats')],
}
```

## 钩子 (中间件)

中间件(也称为前置钩子和 post 钩子)是在异步函数执行期间传递控制的函数。
中间件是在模式级指定的，对于编写插件非常有用([source](https://mongoosejs.com/docs/middleware.html))。
在编译模型后调用 `pre()` 或 `post()` 在 Mongoose 中不起作用。
要在模型注册 **之前** 注册一个钩子，使用`MongooseModule`的`forFeatureAsync()`方法和一个工厂提供器(例如`useFactory`)。
使用这种技术，你可以访问一个模式对象，然后使用`pre()`或`post()`方法在该模式上注册一个钩子。
请参见下面的例子:

```typescript
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Cat.name,
        useFactory: () => {
          const schema = CatsSchema;
          schema.pre('save', function () {
            console.log('Hello from pre save');
          });
          return schema;
        },
      },
    ]),
  ],
})
export class AppModule {}
```

像其他[工厂提供器](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)一样，我们的工厂函数可以是 `async` 的，并且可以通过 `inject` 注入依赖项。

```typescript
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Cat.name,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const schema = CatsSchema;
          schema.pre('save', function() {
            console.log(
              `${configService.get('APP_NAME')}: Hello from pre save`,
            ),
          });
          return schema;
        },
        inject: [ConfigService],
      },
    ]),
  ],
})
export class AppModule {}
```

## 插件

要注册一个[plugin](https://mongoosejs.com/docs/plugins.html)，使用`forFeatureAsync()`方法。

```typescript
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Cat.name,
        useFactory: () => {
          const schema = CatsSchema;
          schema.plugin(require('mongoose-autopopulate'));
          return schema;
        },
      },
    ]),
  ],
})
export class AppModule {}
```

要一次性为所有模式注册一个插件，调用`Connection`对象的`.plugin()`方法。
您应该在创建模型之前访问连接;为此，使用`connectionFactory`:

=== "app.module"

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/test', {
      connectionFactory: (connection) => {
        connection.plugin(require('mongoose-autopopulate'));
        return connection;
      },
    }),
  ],
})
export class AppModule {}
```

## 鉴别器

[Discriminators](https://mongoosejs.com/docs/discriminators.html)是一种模式继承机制。
它们使您能够在相同的底层 MongoDB 集合上拥有具有重叠模式的多个模型。

假设您想要跟踪单个集合中的不同类型的事件。每个事件都有一个时间戳。

=== "event.schema"

```ts
@Schema({ discriminatorKey:'kind`})
export class Event {
  @Prop({
    type: String,
    required: true,
    enum: [ClickedLinkEvent.name, SignUpEvent.name],
  })
  kind: string;

  @Prop({ type: Date, required: true })
  time: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
```

!!! info "**Hint**"

    mongoose 通过 `discriminator key` 来区分不同的鉴别器模型，默认为 `__t`。 Mongoose 将一个名为 `__t` 的字符串路径添加到您的模式中，用于跟踪该文档是哪个鉴别器的实例。 你也可以使用 `discriminatorKey` 选项来定义区分的路径。

`SignedUpEvent` 和 `clicklinkevent` 实例将作为通用事件存储在同一个集合中。

现在，让我们定义 `clicklinkevent` 类，如下所示:

=== "click-link-event.schema"

```ts
@Schema()
export class ClickedLinkEvent {
  kind: string;
  time: Date;

  @Prop({ type: String, required: true })
  url: string;
}

export const ClickedLinkEventSchema =
  SchemaFactory.createForClass(ClickedLinkEvent);
```

添加 `SignUpEvent` 类:

=== "sign-up-event.schema"

```ts
@Schema()
export class SignUpEvent {
  kind: string;
  time: Date;

  @Prop({ type: String, required: true })
  user: string;
}

export const SignUpEventSchema = SchemaFactory.createForClass(SignUpEvent);
```

在此基础上，使用 `discriminator` 选项为给定的模式注册一个标识符。
它工作在两个 `MongooseModule。forFeature’和‘MongooseModule.forFeatureAsync”:

=== "event.module"

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Event.name,
        schema: EventSchema,
        discriminators: [
          { name: ClickedLinkEvent.name, schema: ClickedLinkEventSchema },
          { name: SignUpEvent.name, schema: SignUpEventSchema },
        ],
      },
    ]),
  ],
})
export class EventsModule {}
```

## 测试

在对应用程序进行单元测试时，我们通常希望避免任何数据库连接，从而使我们的测试套件设置起来更简单，执行起来更快。
但是我们的类可能依赖于从连接实例中提取的模型。
我们如何解析这些类?解决方案是创建模拟模型。

为了简化这个过程， `@nestjs/mongoose` 包公开了一个 `getModelToken()` 函数，该函数根据一个令牌名返回一个准备好的[注入令牌](https://docs.nestjs.com/fundamentals/custom-providers#di-fundamentals)。
使用这个令牌，你可以很容易地使用任何标准的[自定义提供器](/fundamentals/自定义提供器)技术来提供一个模拟实现，包括 `useClass` ， `useValue` 和 `useFactory` 。例如:

```typescript
@Module({
  providers: [
    CatsService,
    {
      provide: getModelToken(Cat.name),
      useValue: catModel,
    },
  ],
})
export class CatsModule {}
```

在这个例子中，当任何消费者使用 `@InjectModel()` 装饰器注入 `Model<Cat>` 时，就会提供一个硬编码的 `catModel`(对象实例)。

## 异步配置

当你需要异步而不是静态传递模块选项时，使用 `forRootAsync()` 方法。与大多数动态模块一样，Nest 提供了几种技术来处理异步配置。

一种方法是使用工厂函数:

```typescript
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri: 'mongodb://localhost/nest',
  }),
});
```

像其他[工厂提供器](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)一样，我们的工厂函数可以是 `async` 的，并且可以通过 `inject` 注入依赖项。

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get<string>('MONGODB_URI'),
  }),
  inject: [ConfigService],
});
```

或者，你可以使用类而不是工厂来配置“MongooseModule”，如下所示:

```typescript
MongooseModule.forRootAsync({
  useClass: MongooseConfigService,
});
```

上面的构造实例化了 `MongooseConfigService` 在 `MongooseModule` 中，使用它来创建所需的选项对象。注意在这个例子中， `MongooseConfigService` 必须实现 `MongooseOptionsFactory` 接口，如下所示。 `MongooseModule` 将在提供的类的实例化对象上调用 `createMongooseOptions()` 方法。

```typescript
@Injectable()
class MongooseConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: 'mongodb://localhost/nest',
    };
  }
}
```

如果你想重用一个现有的选项提供器，而不是在 `MongooseModule` 中创建一个私有副本，使用 `useExisting` 语法。

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

## 例子

(https://github.com/nestjs/nest/tree/master/sample/06-mongoose).
