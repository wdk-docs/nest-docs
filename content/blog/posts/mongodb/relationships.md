---
title: "实现与MongoDB的关系"
linkTitle: "实现关系"
weight: 44
---

An essential thing about MongoDB is that it is non-relational. Therefore, it might not be the best fit if relationships are a big part of our database design. That being said, we definitely can mimic SQL-style relations by using references of embedding documents directly.

You can get all of the code from this article in this repository.

## 定义初始模式

In this article, we base the code on many of the functionalities we’ve implemented in the previous parts of this series. If you want to know how we register and authenticate users, check out API with NestJS #3. Authenticating users with bcrypt, Passport, JWT, and cookies.

Let’s start by defining a schema for our users.

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Exclude, Transform } from "class-transformer";

export type UserDocument = User & Document;

@Schema()
export class User {
  @Transform(({ value }) => value.toString())
  _id: string;

  @Prop({ unique: true })
  email: string;

  @Prop()
  name: string;

  @Prop()
  @Exclude()
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

A few significant things are happening above. We use unique: true above to make sure that all users have unique emails. It sets up unique indexes under the hood and deserves a separate article.

The @Exclude and @Transform decorators come from the class-transformer library. We cover serialization in more detail in API with NestJS #5. Serializing the response with interceptors. There is a significant catch here with MongoDB and Mongoose, though.

The Mongoose library that we use for connecting to MongoDB and fetching entities does not return instances of our User class. Therefore, the ClassSerializerInterceptor won’t work out of the box. Let’s change it a bit using the mixin pattern.

mongooseClassSerializer.interceptor.ts

```ts
import { ClassSerializerInterceptor, PlainLiteralObject, Type } from "@nestjs/common";
import { ClassTransformOptions, plainToClass } from "class-transformer";
import { Document } from "mongoose";

function MongooseClassSerializerInterceptor(classToIntercept: Type): typeof ClassSerializerInterceptor {
  return class Interceptor extends ClassSerializerInterceptor {
    private changePlainObjectToClass(document: PlainLiteralObject) {
      if (!(document instanceof Document)) {
        return document;
      }

      return plainToClass(classToIntercept, document.toJSON());
    }

    private prepareResponse(response: PlainLiteralObject | PlainLiteralObject[]) {
      if (Array.isArray(response)) {
        return response.map(this.changePlainObjectToClass);
      }

      return this.changePlainObjectToClass(response);
    }

    serialize(response: PlainLiteralObject | PlainLiteralObject[], options: ClassTransformOptions) {
      return super.serialize(this.prepareResponse(response), options);
    }
  };
}

export default MongooseClassSerializerInterceptor;
```

I wrote the above code with the help of Jay McDoniel. The official NestJS discord is a great place to ask for tips.

Above, we change MongoDB documents into instances of the provided class. Let’s use it with our controller:

authentication.controller.ts

```ts
import { Body, Controller, Post, UseInterceptors } from "@nestjs/common";
import { AuthenticationService } from "./authentication.service";
import RegisterDto from "./dto/register.dto";
import { User } from "../users/user.schema";
import MongooseClassSerializerInterceptor from "../utils/mongooseClassSerializer.interceptor";

@Controller("authentication")
@UseInterceptors(MongooseClassSerializerInterceptor(User))
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post("register")
  async register(@Body() registrationData: RegisterDto) {
    return this.authenticationService.register(registrationData);
  }

  // ...
}
```

Thanks to doing the above, we exclude the password when returning the data of the user.

## 一对一

With the one-to-one relationship, the document in the first collection has just one matching document in the second collection and vice versa. Let’s create a schema for the address:

address.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Transform } from "class-transformer";

export type AddressDocument = Address & Document;

@Schema()
export class Address {
  @Transform(({ value }) => value.toString())
  _id: string;

  @Prop()
  city: string;

  @Prop()
  street: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
```

There is a big chance that just one user is assigned to a particular address in our application. Therefore, it is a good example of a one-to-one relationship. Because of that, we can take advantage of embedding documents, which is an approach very good performance-wise.

For it to work properly, we need to explicitly pass AddressSchema to the @Prop decorator:

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Exclude, Transform, Type } from "class-transformer";
import { Address, AddressSchema } from "./address.schema";

export type UserDocument = User & Document;

@Schema()
export class User {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop({ unique: true })
  email: string;

  @Prop()
  name: string;

  @Prop()
  @Exclude()
  password: string;

  @Prop({ type: AddressSchema })
  @Type(() => Address)
  address: Address;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

We use @Type(() => Address) above to make sure that the class-transformer transforms the Address object too.

When we create the document for the user, MongoDB also creates the document for the address. It also gives it a distinct id.

In our one-to-one relationship example, the user has just one address. Also, one address belongs to only one user. Since that’s the case, it makes sense to embed the user straight into the user’s document. This way, MongoDB can return it fast. Let’s use MongoDB Compass to make sure that this is the case here.

## 一对多

We implement the one-to-many and many-to-one relationships when a document from the first collection can be linked to multiple documents from the second collection. Documents from the second collection can be linked to just one document from the first collection.

Great examples are posts and authors where the user can be an author of multiple posts. In our implementation, the post can only have one author, though.

post.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import * as mongoose from "mongoose";
import { User } from "../users/user.schema";
import { Transform, Type } from "class-transformer";

export type PostDocument = Post & Document;

@Schema()
export class Post {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop()
  title: string;

  @Prop()
  content: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  @Type(() => User)
  author: User;
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

Thanks to defining the above reference, we can now assign the user to the author property in the post.

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import PostDto from "./dto/post.dto";
import { User } from "../users/user.schema";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  create(postData: PostDto, author: User) {
    const createdPost = new this.postModel({
      ...postData,
      author,
    });
    return createdPost.save();
  }

  // ...
}

export default PostsService;
```

### 使用 Mongoose 填充数据

Saving the posts like that results in storing the id of the author in the database.

A great thing about it is that we can easily replace the id with the actual data using the populate function Mongoose provides.

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
    return this.postModel.find().populate("author");
  }

  // ...
}

export default PostsService;
```

Doing the above results in Mongoose returning the data of the author along with the post.

### 参考点的方向

In the code above, we store the id of the author in the document of the post.
We could do that the other way around and store the posts’ id in the author’s document.
When deciding that, we need to take a few factors into account.

First, we need to think of how many references we want to store.
Imagine a situation where we want to store logs for different machines in our server room. We need to remember that the maximum size of a MongoDB document is 16MB.
If we store an array of the ids of the Log document in the Machine document, in theory, we could run out of space at some point. We can store a single id of the machine in the Log document instead.

The other thing to think through is what queries we will run most often.
For example, in our implementation of posts and authors, it is effortless to retrieve the author’s data if we have the post.
This is thanks to the fact that we store the author’s id in the document of the post. On the other hand, it would be more time-consuming to retrieve a list of posts by a single user.
To do that, we would need to query all of the posts and check the author’s id.

We could implement two-way referencing and store the reference on both sides to deal with the above issue.
The above would speed up some of the queries but require us to put more effort into keeping our data consistent.

### 嵌入

We could also embed the document of the posts into the document of the user. The advantage of doing that would be not performing additional queries to the database to get the missing information. But, unfortunately, this would make getting a particular post more difficult.

## 多对多

Another important relationship to consider is many-to-many. A document from the first collection can refer to multiple documents from the second collection and the other way around.

A good example would be posts that can belong to multiple categories. Also, a single category can belong to multiple posts. First, let’s define the schema of our category.

category.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Transform } from "class-transformer";

export type CategoryDocument = Category & Document;

@Schema()
export class Category {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop()
  name: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
```

Now we can use it in the schema of the user.

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import * as mongoose from "mongoose";
import { User } from "../users/user.schema";
import { Transform, Type } from "class-transformer";
import { Category } from "../categories/category.schema";

export type PostDocument = Post & Document;

@Schema()
export class Post {
  @Transform(({ value }) => value.toString())
  _id: ObjectId;

  @Prop()
  title: string;

  @Prop()
  content: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  @Type(() => User)
  author: User;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: Category.name }],
  })
  @Type(() => Category)
  categories: Category;
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

A thing worth knowing is that we can also use the populate method right after saving our document.

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import PostDto from "./dto/post.dto";
import { User } from "../users/user.schema";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async create(postData: PostDto, author: User) {
    const createdPost = new this.postModel({
      ...postData,
      author,
    });
    await createdPost.populate("categories").execPopulate();
    return createdPost.save();
  }

  // ...
}

export default PostsService;
```

上面的一件重要的事情是，我们在 MongoDB 文档的一个实例上调用 populate 方法。
由于是这种情况，我们还需要调用 execPopulate 来运行它。
在我们的其余示例中，我们在 MongoDB 查询的一个实例上调用 populate，这是不需要的。

## 总结

在本文中，我们介绍了使用 NestJS 在 MongoDB 中定义文档之间的关系。
我们已经学习了各种类型的关系，并考虑了如何存储引用以提高性能。
我们还讨论了如何用 NestJS 和 MongoDB 实现序列化。
还有很多东西要学，所以请继续关注!
