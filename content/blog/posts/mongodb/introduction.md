---
title: "MongoDB概论"
linkTitle: "介绍"
weight: 43
---

到目前为止，在本系列文章中，我们主要讨论如何使用 SQL 和 Postgres 数据库。
虽然 PostgreSQL 是一个很好的选择，但它值得一试。
在本文中，我们将了解 MongoDB 是如何工作的，以及它与 SQL 数据库的区别。
我们还使用 MongoDB 和 NestJS 创建了一个简单的应用程序。

您可以从下面的文章中在这个存储库中找到源代码。

## MongoDB vs. SQL Databases

MongoDB 的设计原则与传统的 SQL 数据库有很大的不同。
MongoDB 没有使用表和行来表示数据，而是将其存储为类似 json 的文档。
因此，熟悉 JavaScript 的开发人员比较容易掌握。

MongoDB 中的文档由键和值对组成。
它们的重要方面是，在给定集合中的文档中键可以不同。
这是 MongoDB 和 SQL 数据库之间的一个很大的区别。
它使 MongoDB 更加灵活，结构更松散。
因此，它既可以被视为优点，也可以被视为缺点。

## MongoDB 的优点和缺点

Since MongoDB and SQL databases differ so much, choosing the right tool for a given job is crucial.
Since NoSQL databases put fewer restrictions on the data, it might be a good choice for an application evolving quickly.
We still might need to update our data as our schema changes.

For example, we might want to add a new property containing the user’s avatar URL.
When it happens, we still should deal with documents not containing our new property.
We can do that by writing a script that puts a default value for old documents.
Alternatively, we can assume that this field can be missing and handle it differently on the application level.

On the contrary, adding a new property to an existing SQL database requires writing a migration that explicitly handles the new property.
This might seem like a bit of a chore in a lot of cases.
However, with MongoDB, it is not required.
This might make the work easier and faster, but we need to watch out and not lose the integrity of our data.

If you want to know more about SQL migrations, check out The basics of migrations using TypeORM and Postgres

SQL databases such as Postgres keep the data in tables consisting of columns and rows.
A big part of the design process is defining relationships between the above tables.
For example, a user can be an author of an article.
On the other hand, MongoDB is a non-relational database.
Therefore, while we can mimic SQL-style relationships with MongoDB, they will not be as efficient and foolproof.

## Using MongoDB with NestJS

So far, in this series, we’ve used Docker to set up the architecture for our project.
We can easily achieve that with MongoDB also.

docker-compose.yml

```yml
version: "3"
services:
mongo:
image: mongo:latest
environment:
MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
MONGO_INITDB_DATABASE: ${MONGO_DATABASE}
ports: - '27017:27017'
```

Above, you can see that we refer to a few variables.
Let’s put them into our .env file:

.env

```env
MONGO_USERNAME=admin
MONGO_PASSWORD=admin
MONGO_DATABASE=nestjs
MONGO_HOST=localhost:27017
```

In the previous parts of this series, we’ve used TypeORM to connect to our PostgreSQL database and manage our data.
For MongoDB, the most popular library is Mongoose.

```sh
npm install --save @nestjs/mongoose mongoose
```

Let’s use Mongoose to connect to our database.
To do that, we need to define a URI connection string:

app.module.ts

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import PostsModule from "./posts/posts.module";
import * as Joi from "@hapi/joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        MONGO_USERNAME: Joi.string().required(),
        MONGO_PASSWORD: Joi.string().required(),
        MONGO_DATABASE: Joi.string().required(),
        MONGO_PATH: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const username = configService.get("MONGO_USERNAME");
        const password = configService.get("MONGO_PASSWORD");
        const database = configService.get("MONGO_DATABASE");
        const host = configService.get("MONGO_HOST");

        return { uri: `mongodb://${username}:${password}@${host}`, dbName: database };
      },
      inject: [ConfigService],
    }),
    PostsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

## 保存和检索数据

With MongoDB, we operate on documents grouped into collections.
To start saving and retrieving data with MongoDB and Mongoose, we first need to define a schema.
This might seem surprising at first because MongoDB is considered schemaless.
Even though MongoDB is flexible, Mongoose uses schemas to operate on collections and define their shape.

## 定义一个模式

每个模式映射到一个 MongoDB 集合。
它还定义了其中文档的形状。

post.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type PostDocument = Post & Document;

@Schema()
export class Post {
  @Prop()
  title: string;

  @Prop()
  content: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

使用`@Schema()`装饰器，我们可以将类标记为模式定义，并将其映射到 MongoDB 集合。
我们使用`@Prop()`装饰器来确定文档的属性。
多亏了 TypeScript 元数据，我们的属性的模式类型是自动推断出来的。

我们将在后续文章中展开定义模式的主题。

## 使用模型

Mongoose 将我们的模式包装成模型。
我们可以使用它们来创建和读取文档。
为了让我们的服务使用模型，我们需要将其添加到我们的模块中。

posts.module.ts

```ts
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import PostsController from "./posts.controller";
import PostsService from "./posts.service";
import { Post, PostSchema } from "./post.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }])],
  controllers: [PostsController],
  providers: [PostsService],
})
class PostsModule {}

export default PostsModule;
```

我们还需要将模型注入到我们的服务中:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}
}

export default PostsService;
```

一旦我们这样做了，我们就可以开始与我们的收藏进行交互了。

## 获取所有实体

我们能做的最基本的事情是获取所有文档的列表。
为此，我们需要`find()`方法:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async findAll() {
    return this.postModel.find();
  }
}
```

## 获取单个实体

Every document we create is assigned with a string id.
If we want to fetch a single document, we can use the findById method:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import { NotFoundException } from "@nestjs/common";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async findOne(id: string) {
    const post = await this.postModel.findById(id);
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }

  // ...
}
```

## 创建实体

In the fourth part of this series, we’ve tackled data validation.
Let’s create a Data Transfer Object for our entity.

post.dto.ts

```ts
import { IsString, IsNotEmpty } from "class-validator";

export class PostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export default PostDto;
```

We can now use it when creating a new instance of our model and saving it.

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import PostDto from "./dto/post.dto";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  create(postData: PostDto) {
    const createdPost = new this.postModel(postData);
    return createdPost.save();
  }

  // ...
}
```

## 更新实体

We might also need to update an entity we’ve already created.
To do that, we can use the findByIdAndUpdate method:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import { NotFoundException } from "@nestjs/common";
import PostDto from "./dto/post.dto";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async update(id: string, postData: PostDto) {
    const post = await this.postModel.findByIdAndUpdate(id, postData).setOptions({ overwrite: true, new: true });
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }

  // ...
}
```

Above, a few important things are happening.
Thanks to using the new: true parameter, the findByIdAndUpdate method returns an updated version of our entity.

By using overwrite: true, we indicate that we want to replace a whole document instead of performing a partial update.
This is what differentiates the PUT and PATCH HTTP methods.

If you want to know more, check out TypeScript Express tutorial #15.
Using PUT vs PATCH in MongoDB with Mongoose.

## 删除实体

To delete an existing entity, we need to use the findByIdAndDelete method:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import { NotFoundException } from "@nestjs/common";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async delete(postId: string) {
    const result = await this.postModel.findByIdAndDelete(postId);
    if (!result) {
      throw new NotFoundException();
    }
  }
  // ...
}
```

## 定义一个控制器

一旦我们的服务启动并运行，我们就可以在控制器中使用它:

posts.controller.ts

```ts
import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import PostsService from "./posts.service";
import ParamsWithId from "../utils/paramsWithId";
import PostDto from "./dto/post.dto";

@Controller("posts")
export default class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getAllPosts() {
    return this.postsService.findAll();
  }

  @Get(":id")
  async getPost(@Param() { id }: ParamsWithId) {
    return this.postsService.findOne(id);
  }

  @Post()
  async createPost(@Body() post: PostDto) {
    return this.postsService.create(post);
  }

  @Delete(":id")
  async deletePost(@Param() { id }: ParamsWithId) {
    return this.postsService.delete(id);
  }

  @Put(":id")
  async updatePost(@Param() { id }: ParamsWithId, @Body() post: PostDto) {
    return this.postsService.update(id, post);
  }
}
```

上面的关键部分是我们已经定义了 ParamsWithId 类。
使用它，我们可以验证提供的字符串是否是一个有效的 MongoDB id:

paramsWithId.ts

```ts
import { IsMongoId } from "class-validator";

class ParamsWithId {
  @IsMongoId()
  id: string;
}

export default ParamsWithId;
```

## Summary

In this article, we’ve learned the very basics of how to use MongoDB with NestJS.
To do that, we’ve created a local MongoDB database using Docker Compose and connected it with NestJS and Mongoose.
To better grasp MongoDB, we’ve also compared it to SQL databases such as Postgres.
There are still a lot of things to cover when it comes to MongoDB, so stay tuned!
