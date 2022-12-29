---
title: "使用MongoDB和Mongoose实现分页"
linkTitle: "实现分页"
weight: 47
---

当我们的应用程序增长时，数据库也会增长。
在某些情况下，我们可能会从端点返回大量数据。
例如，对于我们的前端应用程序来说，这可能会被证明是太多了。
因此，我们可能需要通过返回记录的一部分来对记录进行分页。
本文探讨了使用 MongoDB 和 Mongoose 实现这一目标的不同方法，并考虑了它们的优缺点。

您可以在这个存储库中找到本文中的代码。

## 使用 skip 和 limit

最直接的分页形式是期望用户提供他们想要跳过的文档数量。
此外，他们还可以声明希望接收多少文件。

为了成功实现分页，我们需要一个可预测的文档顺序。
为了实现这一点，我们必须对它们进行排序:

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
    return this.postModel.find().sort({ _id: 1 }).populate("author").populate("categories");
  }

  // ...
}

export default PostsService;
```

通过执行`sort({ _id: 1 })`，我们按升序排序。

上面，我们在 MongoDB 中使用了 id 的一个重要特性。
MongoDB 中的 id 由 12 个字节组成，其中 4 个字节是时间戳。
在这样做的同时，我们需要意识到一些缺点:

时间戳的值以秒为单位，在同一秒内创建的文档没有保证有效的顺序，
id 由可能具有不同系统时钟的客户端生成。
根据`_id`进行排序有一个显著的优势，因为 MongoDB 在`_id`字段上创建了一个唯一的索引。
这增加了按`_id`对文档进行排序的性能。

### 实现分页

实现上述方法的第一步是允许用户通过查询参数提供偏移量和限制。
为此，让我们使用类验证器和类转换器。

paginationParams.ts

```ts
import { IsNumber, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class PaginationParams {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
```

如果您想了解更多关于类验证器和类转换器的信息，请参阅错误处理和数据验证以及使用拦截器序列化响应。

我们现在可以在控制器中使用上述参数:

posts.controller.ts

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
  async getAllPosts(@Query() { skip, limit }: PaginationParams) {
    return this.postsService.findAll(skip, limit);
  }

  // ...
}
```

现在我们可以在 findAll 方法中使用上述参数。

posts.service.ts

```ts
export default class PostsService {
  async findAll(documentsToSkip = 0, limitOfDocuments?: number) {
    const query = this.postModel
      .find()
      .sort({ _id: 1 })
      .skip(documentsToSkip)
      .populate("author")
      .populate("categories");

    if (limitOfDocuments) {
      query.limit(limitOfDocuments);
    }
    return query;
  }
}
```

通过这样做，用户现在可以指定他们想要获取多少篇文章以及要跳过多少篇文章。
例如，请求`/posts?skip=20&limit=10`在省略前 20 个文档的同时产生 10 个帖子。

### 计算文件

一种常见的方法是显示我们有多少页面的文章。
为此，我们需要计算数据库中有多少个文档。
为此，我们需要使用聚合框架或执行两个单独的查询。

posts.service.ts

```ts
export default class PostsService {
  async findAll(documentsToSkip = 0, limitOfDocuments?: number) {
    const findQuery = this.postModel
      .find()
      .sort({ _id: 1 })
      .skip(documentsToSkip)
      .populate("author")
      .populate("categories");

    if (limitOfDocuments) {
      findQuery.limit(limitOfDocuments);
    }
    const results = await findQuery;
    const count = await this.postModel.count();

    return { results, count };
  }
}
```

现在，在我们的响应中，我们得到了结果和文档的总数。

### 缺点

使用限制和偏移量的解决方案在 SQL 数据库和 MongoDB 中都被广泛使用。
不幸的是，它的性能还有改进的空间。
使用 `skip()` 方法仍然需要数据库从收集的开始进行扫描。
首先，数据库根据 id 对所有文档进行排序。
然后，MongoDB 丢弃指定数量的文档。
对于大的集合来说，这可能是相当多的工作。

除了性能问题，我们还需要考虑一致性。
理想情况下，文档应该只出现在结果中一次。
事实可能并非如此:

第一个用户获取带有文章的第 1 页，
在这之后，第二个用户创建了一个新的帖子——在排序之后，它结束在第 1 页，
第一个用户获取第二个页面。
用户在第二个页面上再次看到第一个页面的最后一个元素。
不幸的是，用户还错过了添加到第一个页面的元素，这更糟糕。

### 优势

带有限制和偏移量的方法是常见的，并且易于实现。
它的最大优点是可以直接跳过多个页面的文档。
此外，更改用于排序的列也很简单，包括按多个列排序。
因此，如果期望偏移量不太大，且不一致是可以接受的，那么它是一个可行的解决方案。

## 键集分页

如果我们非常关心性能，我们可能希望寻找上述方法的替代方法。
其中之一是键集分页。
在这里，我们使用了 MongoDB 中的 id 由时间戳组成的事实，可以进行比较:

我们从 API 中获取一页文档，
我们检查最后一个文档的 id，
然后，请求 id 大于上一个文档 id 的文档。
由于采用了上述方法，数据库不再需要处理不必要的文档。
首先，让我们为用户创建一种方式来提供起始 id。

paginationParams.ts

```ts
import { IsNumber, IsMongoId, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class PaginationParams {
  @IsOptional()
  @IsMongoId()
  startId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
```

现在，我们需要在服务中使用 `startId` 属性。

posts.service.ts

```ts
async findAll(documentsToSkip = 0,limitOfDocuments?: number,startId?: string) {
  const findQuery = this.postModel.find({_id: {$gt: startId}}).sort({ _id: 1 }).skip(documentsToSkip).populate('author').populate('categories');

  if (limitOfDocuments) findQuery.limit(limitOfDocuments);

  const results = await findQuery;
  const count = await this.postModel.count();

  return { results, count };
}
```

由于执行了`$gt: startId`，用户只接收到使用提供的 id 的帖子之后创建的帖子。

### 缺点

键集分页的一个很大的缺点是需要知道我们想要开始的确切文档。
我们可以通过将其与基于偏移量的分页相结合来克服这个问题。
这种方法的另一个问题是，用户很难一次跳过多个数据页面。

### 优点

与基于偏移量的方法相比，键集分页最显著的优点是性能提高。
此外，它还有助于解决用户在获取页面之间添加或删除元素时不一致的问题。

## 总结

在本文中，我们比较了 MongoDB 和 Mongoose 两种类型的分页。
我们已经考虑了键集分页和基于偏移量的方法的优缺点。
它们都不是完美的，但将它们结合起来可以涵盖很多不同的情况。
为特定的工作选择合适的工具是至关重要的。
