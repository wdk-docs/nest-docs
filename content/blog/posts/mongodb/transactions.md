---
title: "与MongoDB和Mongoose管理事务"
linkTitle: "管理事务"
weight: 46
---

在使用数据库时，保持数据的完整性至关重要。
例如，想象一下把钱从一个银行账户转到另一个。
为此，我们需要执行两个独立的操作。
首先，我们从第一个银行账户中提取金额。
然后，我们将相同的金额添加到第二个帐户。

如果由于某种原因第二次操作失败，而第一次操作成功，则会导致数据库的状态无效。
我们需要上述所有操作的成功或失败。
我们可以通过事务来实现这一点。

## ACID properties

A transaction to be valid needs to have the following properties.
Together, they form the ACID acronym:

## Atomicity

Operations in the transaction are a single unit.
Therefore, it either fully succeeds or fails together.

## Consistency

The transaction moves the database from one valid state to the next.

## Isolation

The isolation property ensures that multiple transactions can occur concurrently, resulting in a valid database state.
To better understand that, let’s continue the example with the banking transaction from above.
Another transaction should see the funds in one account or the other, but not in both.

## Durability

Once the changes from a transaction are committed, they should survive permanently.

## Transactions in MongoDB and Mongoose

Fortunately, MongoDB is equipped with support for multi-document transactions since version 4.0.
We can tell the database that we do a transaction, and it keeps track of every update we make.
If something fails, then the database rolls back all our updates.
The above requires the database to do extra work making notes of our updates and locking the involved resources.
Other clients trying to perform operations on the data might be stuck waiting for the transaction to complete.
Therefore, this is something to watch out for.

## Running a replica set

Transactions with MongoDB only work with a replica set, a group of MongoDB processes that maintain the same data set.
In this series, we’ve been using docker-compose to run MongoDB for us.
We can either run a replica set locally with docker or use MongoDB atlas.
For this article, I’m doing the latter.

If you want to run a replica set, check out this page on Stackoverflow.

## Deleting a user

Let’s implement a feature of deleting a user.
When we remove users from the database, we also want to delete all posts they wrote.

users.service.ts

```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument, User } from "./user.schema";
import PostsService from "../posts/posts.service";

@Injectable()
class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly postsService: PostsService
  ) {}

  async delete(userId: string) {
    const user = await this.userModel.findByIdAndDelete(userId).populate("posts");
    if (!user) {
      throw new NotFoundException();
    }
    const posts = user.posts;

    return this.postsService.deleteMany(posts.map((post) => post._id.toString()));
  }

  // ...
}

export default UsersService;
```

To do the above, we also need to define the deleteMany in our PostsService.

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async deleteMany(ids: string[]) {
    return this.postModel.deleteMany({ _id: ids });
  }

  // ...
}

export default PostsService;
```

The shortcoming of the above code is that the delete method might succeed partially.
When this happens, we delete the user, but the posts are left in the database without the author.
We can deal with the above issue by defining a transaction.

To start a transaction, we need to access the connection we’ve established with MongoDB.
To do that, we can use the @InjectConnection decorator:

users.service.ts

```ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument, User } from "./user.schema";
import PostsService from "../posts/posts.service";
import { InjectConnection } from "@nestjs/mongoose";
import * as mongoose from "mongoose";

@Injectable()
class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly postsService: PostsService,
    @InjectConnection() private readonly connection: mongoose.Connection
  ) {}

  // ...
}

export default UsersService;
```

## 控制事务

There are two ways of working with transactions with Mongoose.
To have full control over it, we can call the startTransaction method:

```ts
const session = await this.connection.startSession();
session.startTransaction();
```

When we indicate that everything worked fine, we need to call session.commitTransaction().
This writes our changes to the database.

If we encounter an error, we need to call session.abortTransaction() to indicate that we want to discard the operations we’ve performed so far.
Once we’re done with the transaction, we need to call the session.endSession() method.

To indicate that we want to perform an operation within a given session, we need to use the session() method.

users.service.ts

```ts
class UsersService {
  async delete(userId: string) {
    const session = await this.connection.startSession();

    session.startTransaction();
    try {
      const user = await this.userModel.findByIdAndDelete(userId).populate("posts").session(session);

      if (!user) {
        throw new NotFoundException();
      }
      const posts = user.posts;

      await this.postsService.deleteMany(posts.map((post) => post._id.toString()));
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

Still, there is an important issue with the above code.
Although we’ve deleted the user within a transaction, we didn’t do that when removing posts.
To delete posts within a session, we need to modify the postsService.deleteMany function:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import * as mongoose from "mongoose";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async deleteMany(ids: string[], session: mongoose.ClientSession | null = null) {
    return this.postModel.deleteMany({ _id: ids }).session(session);
  }

  // ...
}

export default PostsService;
```

By adding the optional session argument to the deleteMany method, we can delete posts within a transaction.
Let’s use it:

users.service.ts

```ts
class UsersService {
  async delete(userId: string) {
    const session = await this.connection.startSession();

    session.startTransaction();
    try {
      const user = await this.userModel.findByIdAndDelete(userId).populate("posts").session(session);

      if (!user) {
        throw new NotFoundException();
      }
      const posts = user.posts;

      await this.postsService.deleteMany(
        posts.map((post) => post._id.toString()),
        session
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

If removing the posts fail for some reason, the user is not deleted from the database either.
Thanks to that, the whole operation either succeeds as a whole or fails completely.

A simpler way of using transactions
Instead of controlling every step of the transaction manually, we can use the session.withTransaction() helper.

users.service.ts

```ts
async delete(userId: string) {
const session = await this.connection.startSession();

await session.withTransaction(async () => {
const user = await this.userModel
.findByIdAndDelete(userId)
.populate('posts')
.session(session);

    if (!user) {
      throw new NotFoundException();
    }
    const posts = user.posts;

    await this.postsService.deleteMany(
      posts.map((post) => post._id.toString()),
      session,
    );

});

session.endSession();
}
```

Please notice that we no longer need to call startTransaction(), commitTransaction(), and abortTransaction().
We still are required to end the session with the endSession method, though.

## Summary

In this article, we’ve gone through transactions in MongoDB by describing their principles and use-cases.
We’ve also implemented them into our application with Mongoose.
It is definitely worth it to understand transactions because they can increase the reliability of our application quite a lot.
