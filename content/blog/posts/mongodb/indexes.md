---
title: "使用MongoDB和Mongoose定义索引"
linkTitle: "定义索引"
weight: 48
---

The bigger our database is, the more demanding our queries become in terms of computing power.
A common way of tackling this problem is by creating indexes.
In this article, we explore this concept and create indexes with MongoDB and Mongoose.

When performing a MongoDB query, the database must scan every document in a given collection to find matching documents.
MongoDB can limit the number of records to inspect if we have an appropriate index in our database.
Since it makes it easier to search for the documents in the database, indexes can speed up finding, updating, and deleting.

Under the hood, indexes are data structures that store a small part of the collection’s data in an easy-to-traverse way.
It includes the ordered values of a particular field of the documents.
It makes MongoDB indexes similar to indexes in databases such as PostgreSQL.

When we define indexes, MongoDB needs to store additional data to speed up our queries.
But, unfortunately, it slows down our write queries.
It also takes up more memory.
Therefore, we need to create indexes sparingly.

## 唯一索引

The unique index makes sure that we don’t store duplicate values.
We can create it by passing unique: true to the @Prop decorator.

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Transform } from "class-transformer";

export type UserDocument = User & Document;

@Schema({
  toJSON: {
    getters: true,
    virtuals: true,
  },
})
export class User {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop({ unique: true })
  email: string;

  // ...
}

const UserSchema = SchemaFactory.createForClass(User);
```

It is important to know that MongoDB creates a unique index on the \_id field when creating a collection.
Therefore, we sometimes refer to it as the primary index.
We take advantage of the above in the last part of this series, where we implement pagination and sort documents by the \_id field.

When we sort documents using a field without an index, MongoDB performs sorting at query time.
It takes time and resources to do that and makes our app response slower.
However, having the right index can help us avoid sorting results at query time because the results are already sorted in the index.
Therefore, we can return them immediately.

We need to keep in mind that making a property unique creates an index and slows down our write queries.

## 使用 Mongoose 实现索引

With MongoDB, we can also define secondary indexes that don’t make properties unique.

post.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Transform, Type } from "class-transformer";

export type PostDocument = Post & Document;

@Schema()
export class Post {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop({ index: true })
  title: string;

  // ...
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

By doing the above, we speed up queries, such as when we look for a post with a specific title, for example.
We also speed up queries where we sort posts by the title alphabetically.

## 文本索引

MongoDB 还实现了文本索引，支持对字符串内容的搜索查询。
要定义文本索引，需要使用`index()`方法。

post.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Transform } from "class-transformer";

export type PostDocument = Post & Document;

@Schema()
export class Post {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop()
  title: string;

  // ...
}

const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ title: "text" });

export { PostSchema };
```

设置文本索引时，可以利用 `$text` 操作符。
它对用文本索引索引的字段的内容执行文本搜索。

一个集合不能有一个以上的文本索引。

让我们通过添加一个新的查询参数来实现搜索帖子的功能。

post.controller.ts

```ts
import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import PostsService from "./posts.service";
import MongooseClassSerializerInterceptor from "../utils/mongooseClassSerializer.interceptor";
import { Post as PostModel } from "./post.schema";
import { PaginationParams } from "../utils/paginationParams";

@Controller("posts")
@UseInterceptors(MongooseClassSerializerInterceptor(PostModel))
export default class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getAllPosts(@Query() { skip, limit, startId }: PaginationParams, @Query("searchQuery") searchQuery: string) {
    return this.postsService.findAll(skip, limit, startId, searchQuery);
  }

  //...
}
```

我们还需要将 `$text` 查询添加到服务中。

post.service.ts

```ts
import { FilterQuery, Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async findAll(documentsToSkip = 0, limitOfDocuments?: number, startId?: string, searchQuery?: string) {
    const filters: FilterQuery<PostDocument> = startId ? { _id: { $gt: startId } } : {};
    if (searchQuery) filters.$text = { $search: searchQuery };
    const findQuery = this.postModel
      .find(filters)
      .sort({ _id: 1 })
      .skip(documentsToSkip)
      .populate("author")
      .populate("categories");
    if (limitOfDocuments) findQuery.limit(limitOfDocuments);
    const results = await findQuery;
    const count = await this.postModel.count();
    return { results, count };
  }

  // ...
}

export default PostsService;
```

感谢以上，MongoDB 可以搜索我们的文章标题。

`$text`查询有更多的参数，比如 `$caseSensitive` 布尔值。
更多信息，请查看官方文档。

## 复合索引

The $text query searches through all of the fields indexed with the text index.
With MongoDB, we can create compound indexes where the index structure holds references to multiple fields.

```ts
PostSchema.index({ title: "text", content: "text" });
```

Thanks to doing the above, the $text query will search both through the titles and contents of posts.

Besides the text indexes, we can also create regular compound indexes.

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Transform } from "class-transformer";

export type UserDocument = User & Document;

@Schema({ toJSON: { getters: true, virtuals: true } })
export class User {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  // ...
}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ firstName: 1, lastName: 1 });

export { UserSchema };
```

Doing the above creates a compound index on the firstName and lastName fields.
It can speed queries such as the ones where we look for a user with a specific first name and last name.

By using 1, we create an ascending index.
When we use -1, we create a descending index.
The direction doesn’t matter for single key indexes because MongoDB can traverse the index in either direction.
It can be significant for compound indexes, though.
The official documentation and this Stackoverflow page provide a good explanation.

`@Prop({ index: true })` 装饰器创建了一个升序索引。

## 总结

在本文中，我们讨论了 MongoDB 中的索引问题。
我们已经解释了不同类型的索引，例如惟一索引、单字段索引和复合索引。
我们还学习了文本索引并使用它们实现了搜索功能。
我们还了解到，创造优势可以加快某些查询的速度，同时降低其他查询的速度。
