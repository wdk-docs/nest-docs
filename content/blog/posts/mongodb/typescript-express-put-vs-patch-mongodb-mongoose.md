---
title: "MongoDB与Mongoose使用PUT vs PATCH"
linkTitle: "PUT对比PATCH"
weight: 15
---

> https://wanago.io/2020/04/27/typescript-express-put-vs-patch-mongodb-mongoose/

当我们开发 REST API 时，我们有一组可以选择的 HTTP 方法。
需要理解的一件重要事情是，HTTP 方法在很大程度上是动作的指示器。
因此，让它们正常工作是我们的工作。
从理论上讲，没有太多东西阻止我们使用 GET 方法删除实体。
通过注意保持约定，我们提高了 API 的可读性，并使其可预测。

大多数 HTTP 方法相当简单。
不过，在 Mongoose with Express 中，PUT 和 PATCH 方法可能会造成一些误解。
在这篇文章中，我们比较它们，并检查如何在 MongoDB 与 Mongoose 中实现它们。

本系列文章的结果就是这个[存储库](https://github.com/mwanago/express-typescript)。
给它打个星吧。

## PUT

PUT 方法在 HTTP 协议中已经存在很长时间了。
它的主要职责是修改现有实体。

关于 PUT 最重要的一点是，它替换了实体。
如果我们不包含实体包含的属性，则应该删除它

GET /posts/5cf96275ff8ecf065c510468

```json
{
  "_id": "5cf96275ff8ecf065c510468",
  "title": "Lorem ipsum",
  "content": "Dolor sit amet",
  "author": "5cf96217ff8ecf065c510467"
}
```

正如您在上面看到的，这篇文章包含了相当多的属性。
让我们发送一个 PUT 请求的示例:

PUT /posts/5cf96275ff8ecf065c510468

```json
{
  "_id": "5cf96275ff8ecf065c510468",
  "title": "A brand new title",
  "content": "Dolor sit amet",
  "author": "5cf96217ff8ecf065c510467"
}
```

如您所见，我们已经更改了 title 属性。
我们还包括了所有其他字段，比如内容和作者。
让我们发送另一个 PUT 请求:

PUT /posts/5cf96275ff8ecf065c510468

```json
{
  "content": "A brand new content"
}
```

这个请求应该删除所有其他属性，只留下内容。

### MongoDB 和 Mongoose 使用 PUT

上述情况与 MongoDB 和 Mongoose 并不完全相同。
它不允许我们删除或更改`_id`。

为了用 MongoDB 和 Mongoose 实现一个正确的 PUT，我们需要一种方法来替换文档而不是更新它。
最常用的修改实体的方法之一是 `findByIdAndUpdate` 和 `findOneAndUpdate` 。
不幸的是，它们的默认行为不是替换文档，而是对文档执行部分更新。
因此，如果我们不传递属性，它就不会从实体中移除它。

实现所需行为的一种方法是使用 `replaceOne` 方法。
顾名思义，它取代了整个文档—这正是我们所需要的。

replaceOne 方法的结果包含 `n` 属性，该属性描述匹配过滤器的文档数量。
如果没有找到，则可以假定具有给定 `id` 的实体不存在。

不幸的是，结果不包含修改后的文档，因此我们需要使用 `findById` 函数查找文档并将其发送回来。

```ts
class demo {
  private initializeRoutes() {
    this.router.put(`${this.path}/:id`, this.modifyPost);
  }
  private modifyPost = async (request: Request, response: Response, next: NextFunction) => {
    const id = request.params.id;
    const postData: Post = request.body;
    const modificationResult = await this.post.replaceOne({ _id: id }, postData);
    if (modificationResult.n) {
      const modifiedPost = await this.post.findById(id);
      response.send(modifiedPost);
    } else {
      next(new PostNotFoundException(id));
    }
  };
}
```

使用 `findOneAndReplace` 函数可以解决上述困难。
不幸的是，`@types/mongoose` 包缺少 `findOneAndReplace` 方法的 TypeScript 定义。

不过，我们还是做了一些努力来添加它。
如果最后定稿，我将更新这篇文章。

尽管文档目前没有提到这一点，但我们也可以将 `overwrite: true` 选项传递给 `findByIdAndUpdate` 和 `findOneAndUpdate。`
因此，它将替换整个文档，而不是执行部分更新。

```ts
class demo {
  private modifyPost = async (request: Request, response: Response, next: NextFunction) => {
    const id = request.params.id;
    const postData: Post = request.body;
    const post = await this.post.findByIdAndUpdate(id, postData).setOptions({ new: true, overwrite: true });
    if (post) {
      response.send(post);
    } else {
      next(new PostNotFoundException(id));
    }
  };
}
```

### 使用 PUT 创建新实体

该规范还提到，如果没有找到所需的实体，我们可以使用 PUT 创建一个新实体。
我们将这种行为称为 upsert。

Mongoose 通过允许我们将 upsert 选项传递给 replaceOne 查询来支持它。

```ts
class demo {
  private modifyPost = async (request: Request, response: Response, next: NextFunction) => {
    const id = request.params.id;
    const postData: Post = request.body;
    const modificationResult = await this.post.replaceOne({ _id: id }, postData).setOptions({
      upsert: true,
    });
    if (modificationResult.n) {
      const resultId = modificationResult.upserted?.[0]?._id || id;
      const modifiedPost = await this.post.findById(resultId);
      response.send(modifiedPost);
    } else {
      next(new PostNotFoundException(id));
    }
  };
}
```

如果 `modiationresult.upserted` 数组中有一个元素，我们将查找具有新 id 的实体。
否则，我们使用用户提供的标识符。

## PATCH

PUT 方法可能并不总是更新实体的最佳选择。
它假设用户知道特定实体的所有细节，但情况并非总是如此。
解决这个问题的方法可能是 PATCH 方法。

PATCH 在 2010 年的 RFC 5789 中被引入到 HTTP 协议中。
它的目的是对资源应用部分修改。
我们应该将 PATCH 视为一组关于如何修改资源的指令。

为 PATCH 方法实现处理程序的最直接方法是期望一个包含部分实体的主体。

PATCH /posts/5cf96275ff8ecf065c510468

```json
{
  "content": "A brand new content"
}
```

上面的代码应该用新的内容修改实体。
与 PUT 相反，我们不应该删除其余的属性。

### MongoDB 和 Mongoose 使用 PATCH

`findByIdAndUpdate` 方法非常适合实现 `PATCH` 方法。
我们将在本系列的第二部分中提到它。

```ts
class demo {
  private initializeRoutes() {
    this.router.patch(`${this.path}/:id`, this.modifyPost);
  }
  private modifyPost = async (request: Request, response: Response, next: NextFunction) => {
    const id = request.params.id;
    const postData: Post = request.body;
    const post = await this.post.findByIdAndUpdate(id, postData, { new: true });
    if (post) {
      response.send(post);
    } else {
      next(new PostNotFoundException(id));
    }
  };
}
```

由于传递了 `new:true` 选项，我们的查询会得到实体的更新版本。
因此，我们可以在响应中毫不费力地将其发送回。

如果在传递给 `findByIdAndUpdate` 函数的数据中，我们包括一个不同的`_id`, Mongoose 抛出一个错误。

如果我们在使用 `findByIdAndUpdate` 执行 `PATCH` 时想要删除属性，我们必须显式地发送 null。

### JSON Patch

实现 PATCH 方法的另一种方法是发送一组关于如何修改资源的指令。
您可以使用 JSON Patch 格式来定义一个 Patch 操作数组。

PATCH /posts/5cf96275ff8ecf065c510468

```json
[
  {
    "op": "replace",
    "path": "/content",
    "value": "A brand new content"
  }
]
```

我们可以在这里找到 JSON Patch 格式的文档。
还有 `fastjson -patch` 实用程序，可以帮助您创建和读取此类 Patch。

## 总结

在本文中，我们介绍了实现更新功能的可能方法。
在选择 PUT 和 PATCH 时，我们需要考虑在你的具体情况下，什么是最好的选择。
无论我们决定什么，一旦我们决定了一种方法，我们就需要对它们进行适当的编码。
在这样做时，我们需要考虑规范中如何定义 PATCH 和 PUT 方法，并相应地实现它们。
