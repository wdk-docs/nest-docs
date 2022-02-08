### Mongo

Nest 支持两种集成[MongoDB](https://www.mongodb.com/)数据库的方法。
您可以使用[这里](/techniques/database)描述的内置[TypeORM](https://github.com/typeorm/typeorm)模块，它为 MongoDB 提供了一个连接器，或者使用[Mongoose](https://mongoosejs.com)，最流行的 MongoDB 对象建模工具。
在本章中，我们将使用专用的`@nestjs/mongoose`包来描述后面。

首先安装所需的依赖项:

```bash
$ npm install --save @nestjs/mongoose mongoose
```

一旦安装完成，我们就可以把`MongooseModule`导入到根目录`AppModule`中。

```typescript
@@filename(app.module)
import { Module } from`@nestjs/common';
import { MongooseModule } from`@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost/nest')],
})
export class AppModule {}
```

`forRoot()`方法接受与 Mongoose 包中的`Mongoose.connect()`相同的配置对象，如[这里](https://mongoosejs.com/docs/connections.html)所述.

#### 模型注入

使用 Mongoose，所有东西都来自[Schema](http://mongoosejs.com/docs/guide.html).
每个模式映射到一个 MongoDB 集合，并定义该集合中文档的形状。
`Schema`用于定义[Model]](https://mongoosejs.com/docs/models.html).
模型负责从底层 MongoDB 数据库创建和读取文档。

模式可以用 NestJS 装饰器创建，也可以用 Mongoose 自己手动创建。
使用装饰器来创建模式大大减少了样板，并提高了整体代码的可读性。

我们定义的 `CatSchema`:

```typescript
@@filename(schemas/cat.schema)
import { Prop, Schema, SchemaFactory } from`@nestjs/mongoose';
import { Document } from`mongoose';

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

> info **Hint** 注意，你也可以使用`defintionsfactory`类(从`nestjs/mongoose`)生成一个原始模式定义。 这允许您手动修改基于您提供的元数据生成的模式定义。这对于某些边缘情况非常有用，在这种情况下，可能很难用 decorator 来表示所有内容。

`@Schema()`装饰器将一个类标记为一个模式定义。
它将我们的`Cat`类映射到具有相同名称的 MongoDB 集合，但在末尾添加了一个额外的`s`——所以最终的 mongo 集合名称将是`cats`。
这个装饰器接受一个可选参数，它是一个模式选项对象。
把它想象成你通常会传递给`mongoose.Schema`类构造函数的第二个参数的对象(如, `new mongoose.Schema(_, options)`))。
要了解更多可用的模式选项，请参阅[本](https://mongoosejs.com/docs/guide.html#options)章。

`@Prop()`装饰器在文档中定义了一个属性。
例如，在上面的模式定义中，我们定义了三个属性:`name`、`age`和`breed`。

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
import * as mongoose from`mongoose';
import { Owner } from`../owners/schemas/owner.schema';

// inside the class definition
@Prop({ type: mongoose.Schema.Types.ObjectId, ref:`Owner`})
owner: Owner;
```

如果有多个所有者，你的属性配置应该如下所示:

```typescript
@Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref:`Owner`}] })
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
虽然你可以将模式文件存储在任何你喜欢的地方，但我们建议将它们存储在它们相关的**域**对象附近，在适当的模块目录中。

让我们看看" CatsModule ":

```typescript
@@filename(cats.module)
import { Module } from`@nestjs/common';
import { MongooseModule } from`@nestjs/mongoose';
import { CatsController } from`./cats.controller';
import { CatsService } from`./cats.service';
import { Cat, CatSchema } from`./schemas/cat.schema';

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

```typescript
@@filename(cats.service)
import { Model } from`mongoose';
import { Injectable } from`@nestjs/common';
import { InjectModel } from`@nestjs/mongoose';
import { Cat, CatDocument } from`./schemas/cat.schema';
import { CreateCatDto } from`./dto/create-cat.dto';

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
@@switch
import { Model } from`mongoose';
import { Injectable, Dependencies } from`@nestjs/common';
import { getModelToken } from`@nestjs/mongoose';
import { Cat } from`./schemas/cat.schema';

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

#### 连接

有时你可能需要访问本地[Mongoose Connection](https://mongoosejs.com/docs/api.html#Connection)对象。
例如，您可能希望对连接对象进行本机 API 调用。
你可以通过使用`@InjectConnection()`装饰器来注入 Mongoose 连接，如下所示:

```typescript
import { Injectable } from`@nestjs/common';
import { InjectConnection } from`@nestjs/mongoose';
import { Connection } from`mongoose';

@Injectable()
export class CatsService {
  constructor(@InjectConnection() private connection: Connection) {}
}
```

#### 多库

有些项目需要多个数据库连接。
这也可以通过这个模块实现。
要处理多个连接，首先要创建连接。
在这种情况下，连接命名成为**必须的**。

```typescript
@@filename(app.module)
import { Module } from`@nestjs/common';
import { MongooseModule } from`@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/test', {
      connectionName:`cats',
    }),
    MongooseModule.forRoot('mongodb://localhost/users', {
      connectionName:`users',
    }),
  ],
})
export class AppModule {}
```

> warning **Notice** 请注意，您不应该有多个没有名称或具有相同名称的连接，否则它们将被覆盖。

在这个设置中，你必须告诉`mongoosemmodule.forfeature()`函数应该使用哪个连接。

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }],`cats'),
  ],
})
export class AppModule {}
```

你也可以为一个给定的连接注入`Connection`:

```typescript
import { Injectable } from`@nestjs/common';
import { InjectConnection } from`@nestjs/mongoose';
import { Connection } from`mongoose';

@Injectable()
export class CatsService {
  constructor(@InjectConnection('cats') private connection: Connection) {}
}
```

要将给定的`Connection`注入到自定义提供者(例如，工厂提供者)，使用`getConnectionToken()`函数将连接的名称作为参数传递。

```typescript
{
  provide: CatsService,
  useFactory: (catsConnection: Connection) => {
    return new CatsService(catsConnection);
  },
  inject: [getConnectionToken('cats')],
}
```

#### 钩子 (中间件)

Middleware (also called pre and post hooks) are functions which are passed control during execution of asynchronous functions. Middleware is specified on the schema level and is useful for writing plugins ([source](https://mongoosejs.com/docs/middleware.html)). Calling `pre()` or `post()` after compiling a model does not work in Mongoose. To register a hook **before** model registration, use the `forFeatureAsync()` method of the `MongooseModule` along with a factory provider (i.e., `useFactory`). With this technique, you can access a schema object, then use the `pre()` or `post()` method to register a hook on that schema. See example below:

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

Like other [factory providers](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory), our factory function can be `async` and can inject dependencies through `inject`.

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

#### 插件

To register a [plugin](https://mongoosejs.com/docs/plugins.html) for a given schema, use the `forFeatureAsync()` method.

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

To register a plugin for all schemas at once, call the `.plugin()` method of the `Connection` object. You should access the connection before models are created; to do this, use the `connectionFactory`:

```typescript
@@filename(app.module)
import { Module } from`@nestjs/common';
import { MongooseModule } from`@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/test', {
      connectionFactory: (connection) => {
        connection.plugin(require('mongoose-autopopulate'));
        return connection;
      }
    }),
  ],
})
export class AppModule {}
```

#### 鉴别器

[Discriminators](https://mongoosejs.com/docs/discriminators.html) are a schema inheritance mechanism. They enable you to have multiple models with overlapping schemas on top of the same underlying MongoDB collection.

Suppose you wanted to track different types of events in a single collection. Every event will have a timestamp.

```typescript
@@filename(event.schema)
@Schema({ discriminatorKey:`kind`})
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

> info **Hint** The way mongoose tells the difference between the different discriminator models is by the "discriminator key", which is `__t` by default. Mongoose adds a String path called `__t` to your schemas that it uses to track which discriminator this document is an instance of.
> You may also use the `discriminatorKey` option to define the path for discrimination.

`SignedUpEvent` and `ClickedLinkEvent` instances will be stored in the same collection as generic events.

Now, let's define the `ClickedLinkEvent` class, as follows:

```typescript
@@filename(click-link-event.schema)
@Schema()
export class ClickedLinkEvent {
  kind: string;
  time: Date;

  @Prop({ type: String, required: true })
  url: string;
}

export const ClickedLinkEventSchema = SchemaFactory.createForClass(ClickedLinkEvent);
```

And `SignUpEvent` class:

```typescript
@@filename(sign-up-event.schema)
@Schema()
export class SignUpEvent {
  kind: string;
  time: Date;

  @Prop({ type: String, required: true })
  user: string;
}

export const SignUpEventSchema = SchemaFactory.createForClass(SignUpEvent);
```

With this in place, use the `discriminators` option to register a discriminator for a given schema. It works on both `MongooseModule.forFeature` and `MongooseModule.forFeatureAsync`:

```typescript
@@filename(event.module)
import { Module } from`@nestjs/common';
import { MongooseModule } from`@nestjs/mongoose';

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
  ]
})
export class EventsModule {}
```

#### 测试

When unit testing an application, we usually want to avoid any database connection, making our test suites simpler to set up and faster to execute. But our classes might depend on models that are pulled from the connection instance. How do we resolve these classes? The solution is to create mock models.

To make this easier, the `@nestjs/mongoose` package exposes a `getModelToken()` function that returns a prepared [injection token](https://docs.nestjs.com/fundamentals/custom-providers#di-fundamentals) based on a token name. Using this token, you can easily provide a mock implementation using any of the standard [custom provider](/fundamentals/custom-providers) techniques, including `useClass`, `useValue`, and `useFactory`. For example:

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

In this example, a hardcoded `catModel` (object instance) will be provided whenever any consumer injects a `Model<Cat>` using an `@InjectModel()` decorator.

<app-banner-courses></app-banner-courses>

#### 异步配置

When you need to pass module options asynchronously instead of statically, use the `forRootAsync()` method. As with most dynamic modules, Nest provides several techniques to deal with async configuration.

One technique is to use a factory function:

```typescript
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri:`mongodb://localhost/nest',
  }),
});
```

Like other [factory providers](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory), our factory function can be `async` and can inject dependencies through `inject`.

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get<string>('MONGODB_URI'),
  }),
  inject: [ConfigService],
});
```

Alternatively, you can configure the `MongooseModule` using a class instead of a factory, as shown below:

```typescript
MongooseModule.forRootAsync({
  useClass: MongooseConfigService,
});
```

The construction above instantiates `MongooseConfigService` inside `MongooseModule`, using it to create the required options object. Note that in this example, the `MongooseConfigService` has to implement the `MongooseOptionsFactory` interface, as shown below. The `MongooseModule` will call the `createMongooseOptions()` method on the instantiated object of the supplied class.

```typescript
@Injectable()
class MongooseConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri:`mongodb://localhost/nest',
    };
  }
}
```

If you want to reuse an existing options provider instead of creating a private copy inside the `MongooseModule`, use the `useExisting` syntax.

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

#### 例子

(https://github.com/nestjs/nest/tree/master/sample/06-mongoose).
