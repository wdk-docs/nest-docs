---
title: "MongoDB和Mongoose的虚拟属性"
linkTitle: "虚拟属性"
weight: 45
---

在本系列中，我们使用 Mongoose 在模式中定义属性，并使用文档的模型。
我们还定义了集合之间的各种关系。
使用 Mongoose，我们还可以利用没有存储在 MongoDB 中的虚拟属性。
要理解它们，我们首先要掌握 `getter` 和 `setter` 的概念。

您可以在这个存储库中找到本文中的代码。

## Mongoose 的 Getters 和 setters

当使用 `getter` 和 `setter` 在文档中获取和设置属性时，可以执行自定义逻辑。

### Getters

通过使用 `getter` ，我们可以在检索文档数据时修改文档数据。
让我们创建一个示例，当用户有一个信用卡号码时，我们希望在响应 API 请求时对其进行混淆。

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ toJSON: { getters: true } })
export class User {
  @Prop({ unique: true })
  email: string;

  @Prop({
    get: (creditCardNumber: string) => {
      if (!creditCardNumber) return;
      const lastFourDigits = creditCardNumber.slice(creditCardNumber.length - 4);
      return `****-****-****-${lastFourDigits}`;
    },
  })
  creditCardNumber?: string;
  // ...
}

export const UserSchema = SchemaFactory.createForClass(User);
```

当我们从 API 返回文档时，NestJS 将我们的数据字符串化。
当这种情况发生时， `toJSON` 方法就会在我们的 Mongoose 模型上被调用。
因此，如果我们想要考虑我们的 `getter` ，我们需要在配置中显式地添加 `getter:true`。

文档也有 tobject 方法，我们可以用类似的方式自定义它。

我们也在 mongoosecasserializerinterceptor 中使用 toJSON。
要了解更多细节，请查看 NestJS #44 中的 API。
实现与 MongoDB 的关系

在上面的代码中，每次从 API 返回用户文档时，都会混淆信用卡号。

Mongoose 为我们的模式分配一个 id 字段的虚 `getter` 。
它现在出现在响应中，因为我们通过 `getters:true` 打开了 getters。
稍后会有更多关于虚拟的内容。

有时，我们希望访问原始的、未修改的属性。
为此，我们可以使用 `Document.prototype.get()` 函数。

```ts
const user = await this.usersService.getByEmail(email);
const creditCardNumber = await this.usersService.getByEmail(email);
```

### Setters

使用 `setter` ，我们可以在将数据保存到数据库之前修改数据。

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

  @Prop({
    set: (content: string) => {
      return content.trim();
    },
  })
  content: string;

  // ...
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

由于做了上述操作，我们现在从内容字符串的两端删除空白。

虽然`setter`是一种有效的技术，但是为了提高可读性，您可能更愿意将此逻辑放在服务中。
然而，即使是这样，`setter`也是值得了解的。

## 虚拟属性

`virtual` 是我们可以获取和设置的属性，但它不存储在数据库中。
让我们定义一个简单的用例示例。

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  fullName: string;

  // ...
}

export const UserSchema = SchemaFactory.createForClass(User);
```

不幸的是，上述方法是有缺陷的。
如果我们将 `fullName` 属性持久化到 MongoDB 中，我们将复制信息，因为我们已经有了 firstName 和 lastName。
更合适的方法是基于其他属性动态创建 `fullName` 。

### Getters

我们可以通过虚拟财产实现上述目的。
让我们创建它和 `getter` 。

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UserDocument = User & Document;

@Schema({ toJSON: { virtuals: true } })
export class User {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  fullName: string;

  // ...
}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual("fullName").get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

export { UserSchema };
```

请注意，我们没有在`fullName`属性上使用`@Prop()`装饰器。
相反，我们调用文件底部的`UserSchema.virtual`函数。

由于添加了`virtuals:true`，我们的虚拟属性在将文档转换为 `JSON` 时是可见的。
尽管我们可以在上面的响应中看到 `fullName` ，但它并没有保存到数据库中。

### Setters

使用 `virtual` ，我们还可以创建 `setter` 。
例如，我们可以使用它们一次设置多个属性。

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import { Transform } from "class-transformer";
export type UserDocument = User & Document;

@Schema({ toJSON: { getters: true, virtuals: true } })
export class User {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  fullName: string;

  // ...
}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual("fullName")
  .get(function (this: UserDocument) {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function (this: UserDocument, fullName: string) {
    const [firstName, lastName] = fullName.split(" ");
    this.set({ firstName, lastName });
  });

export { UserSchema };
```

上面，我们基于 `fullName` 设置了 `firstName` 和 `lastName` 属性。

## 填充虚拟属性

虚拟属性的一个便利特性是使用它们来填充来自另一个集合的文档。

我们学习了使用 NestJS 在 API 中填充特性的基础知识 [#44.使用 MongoDB 实现关系]()

在上一篇文章的示例中，我们为一篇文章创建了一个模式，使用它来存储对作者的引用。

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

因此，当我们获取 `User` 文档时，我们没有任何帖子的信息。
我们可以使用虚拟属性来解决这个问题。

user.schema.ts

```ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Type } from "class-transformer";
import { Post } from "../posts/post.schema";

export type UserDocument = User & Document;

@Schema({ toJSON: { getters: true, virtuals: true } })
export class User {
  @Prop({ unique: true })
  email: string;

  @Type(() => Post)
  posts: Post[];

  // ...
}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual("posts", { ref: "Post", localField: "_id", foreignField: "author" });

export { UserSchema };
```

最后一步是调用 `populate` 函数以及用户的文档。
同时，我们还可以填充嵌套的 `categories` 属性。

users.service.ts

```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument, User } from "./user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getById(id: string) {
    const user = await this.userModel.findById(id).populate({ path: "posts", populate: { path: "categories" } });
    if (!user) throw new NotFoundException();
    return user;
  }
}
```

## 总结

在本文中，我们学习了什么是虚拟属性以及它们如何有用。
我们已经使用它们来添加简单的属性和填充来自其他集合的文档。
为了更好地掌握 `virtual` 的概念，我们还研究了 `getter` 和 `setter` 。
当使用 `Mongoose` 来定义 `MongoDB` 模式时，上述所有内容肯定会派上用场。
