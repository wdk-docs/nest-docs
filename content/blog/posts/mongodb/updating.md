---
title: "用PUT和PATCH更新MongoDB和Mongoose"
linkTitle: "更新"
weight: 49
---

When we develop a REST API, there is a set of HTTP methods that we can choose from, such as GET, POST, and DELETE. A crucial thing to understand is that HTTP methods are largely conventional. It is our job to make them work in a way that’s consistent with the specification. For example, in theory, we could delete entities with the GET method. However, we should make our API predictable to make it easy to understand both to developers working on our backend and the users.

A lot of HTTP methods are very straightforward. However, the PUT and PATCH methods are worth digging into a bit more. In this article, we compare both of them and implement them with NestJS and Mongoose.

PUT
The PUT method is responsible for modifying an existing entity. The crucial part about it is that it is supposed to replace an entity. Therefore, if we don’t send a field of an entity when performing a PUT request, the missing field should be removed from the document.

GET /posts/613e2dcbe2b947c10b669292

```json
{
  "categories": [],
  "_id": "614fa87e4027d3141f28e9e7",
  "title": "API with NestJS #49. PUT vs PATCH with MongoDB and Mongoose",
  "content": "...",
  "series": {
    "_id": "614fa8364027d3141f28e9e2",
    "name": "API with NestJS"
  },
  "author": {
    "_id": "61350362017a80b8d443b012",
    "email": "marcin@wanago.io",
    "firstName": "Marcin",
    "lastName": "Wanago"
  }
}
```

Above, we can see the properties our post contains. Let’s make a PUT request now.

PUT /posts/614fa87e4027d3141f28e9e7

```json
{
  "_id": "614fa87e4027d3141f28e9e7",
  "categories": [],
  "title": "API with NestJS #49. PUT vs PATCH with MongoDB and Mongoose",
  "content": "...",
  "author": {
    "_id": "61350362017a80b8d443b012",
    "email": "marcin@wanago.io",
    "firstName": "Marcin",
    "lastName": "Wanago"
  }
}
```

The crucial thing above is that we didn’t send the series property in the body of our request. Because the PUT method is supposed to replace a whole entity, we’ve deleted the series property.

Implementing the PUT method with MongoDB and Mongoose
There are quite a few ways of implementing a proper PUT method with MongoDB and Mongoose. The findByIdAndUpdate and findOneAndUpdate methods are common, but they don’t replace the whole document by default. Instead, they perform a partial update on it. Because of that, not including a property in the body of the request does not remove it. We can fix that with the overwrite: true option.

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
    const post = await this.postModel
      .findByIdAndUpdate(id, postData)
      .setOptions({ overwrite: true, new: true })
      .populate("author")
      .populate("categories")
      .populate("series");
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }

  // ...
}

export default PostsService;
```

By setting new: true, we indicate that we want the findByIdAndUpdate method to return the modified version of the document.

posts.controller.ts

```ts
import { Body, Controller, Param, Put, UseInterceptors } from "@nestjs/common";
import PostsService from "./posts.service";
import ParamsWithId from "../utils/paramsWithId";
import MongooseClassSerializerInterceptor from "../utils/mongooseClassSerializer.interceptor";
import { Post as PostModel } from "./post.schema";
import UpdatePostDto from "./dto/updatePost.dto";

@Controller("posts")
@UseInterceptors(MongooseClassSerializerInterceptor(PostModel))
export default class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Put(":id")
  async updatePost(@Param() { id }: ParamsWithId, @Body() post: UpdatePostDto) {
    return this.postsService.update(id, post);
  }
}
```

Thanks to doing the above, when we update a document, we replace it as a whole and remove not included fields.

We could also use the findOneAndReplace method. Not so long back, it wasn’t included with the TypeScript definitions shipped with the @types/mongoose, unfortunately. Thankfully, the Mongoose team started working on official TypeScript definitions. They released it in version v5.11.0.

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import { NotFoundException } from "@nestjs/common";
import UpdatePostDto from "./dto/updatePost.dto";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async update(id: string, postData: UpdatePostDto) {
    const post = await this.postModel
      .findOneAndReplace({ _id: id }, postData, { new: true })
      .populate("author")
      .populate("categories")
      .populate("series");
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }

  // ...
}

export default PostsService;
```

createPost.dto.ts

```ts
import { IsString, IsNotEmpty, IsMongoId, IsOptional } from "class-validator";
import { User } from "../../users/user.schema";
import { Type } from "class-transformer";
import { Category } from "../../categories/category.schema";
import { Series } from "../../series/series.schema";

export class UpdatePostDto {
  @IsMongoId()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @Type(() => Category)
  categories: Category[];

  @Type(() => User)
  @IsNotEmpty()
  author: User;

  @Type(() => Series)
  @IsOptional()
  series?: Series;
}

export default UpdatePostDto;
```

Preventing the id from being updated
Since we expect the users to send the whole document, they also send the \_id property. The above doesn’t cause any issues as long as the user doesn’t alter the id. That’s because doing that can cause an unexpected error:

MongoError: Plan executor error during findAndModify :: caused by :: After applying the update, the (immutable) field ‘\_id’ was found to have been altered

We can deal with the above error by excluding the \_id property from the body of our PUT request.

```ts
import { IsOptional } from "class-validator";
import { Exclude } from "class-transformer";

export class UpdatePostDto {
  @IsOptional()
  @Exclude()
  _id: string;

  // ...
}

export default UpdatePostDto;
```

Even if the user provides the \_id property in the request, we exclude it and don’t pass it to the findOneAndReplace or the findByIdAndUpdate methods. Rest assured, because MongoDB won’t remove the \_id property in such a case, even though we are implementing the PUT method here.

PATCH
While the PUT method is a common and valid choice, it might not fit every situation. For example, when implementing the PUT method, we assume that the API users know all of the details of a particular entity. Since omitting single property results in removing it, they need to be careful. A solution to this issue can be the PATCH method.

The PATCH method was introduced to the HTTP protocol in 2010 and aimed to apply a partial modification to an entity. The specification describes it as a set of instructions describing how a resource should be modified. The most straightforward way of implementing the PATCH method is to handle a body with a partial document.

PATCH /posts/614fa87e4027d3141f28e9e7

```json
{
  "title": "A new title",
  "series": null
}
```

The above request modifies the post by changing the title and removing the series property. Please note that to delete a field, we need to send the null value explicitly. Thanks to this, no fields are deleted by accident.

Implementing PATCH with MongoDB and Mongoose
To implement a PATCH handler using Mongoose, we can use the findByIdAndUpdate method without the overwrite: true option. First, let’s use the @Patch decorator in our controller:

posts.controller.ts

```ts
import { Body, Controller, Param, Patch, UseInterceptors } from "@nestjs/common";
import PostsService from "./posts.service";
import ParamsWithId from "../utils/paramsWithId";
import MongooseClassSerializerInterceptor from "../utils/mongooseClassSerializer.interceptor";
import { Post as PostModel } from "./post.schema";
import UpdatePostDto from "./dto/updatePost.dto";

@Controller("posts")
@UseInterceptors(MongooseClassSerializerInterceptor(PostModel))
export default class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Patch(":id")
  async updatePost(@Param() { id }: ParamsWithId, @Body() post: UpdatePostDto) {
    return this.postsService.update(id, post);
  }

  // ...
}
```

Now, let’s modify the service:

posts.service.ts

```ts
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Post, PostDocument } from "./post.schema";
import { NotFoundException } from "@nestjs/common";
import UpdatePostDto from "./dto/updatePost.dto";

@Injectable()
class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async update(id: string, postData: UpdatePostDto) {
    const post = await this.postModel
      .findByIdAndUpdate({ _id: id }, postData, { new: true })
      .populate("author")
      .populate("categories")
      .populate("series");
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }

  // ...
}

export default PostsService;
```

For the above to work correctly, we also need to modify our DTO by adding the @IsOptional decorators:

updatePost.dto.ts

```ts
import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { User } from "../../users/user.schema";
import { Exclude, Type } from "class-transformer";
import { Category } from "../../categories/category.schema";
import { Series } from "../../series/series.schema";

export class UpdatePostDto {
  @IsOptional()
  @Exclude()
  _id?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @Type(() => Category)
  @IsOptional()
  categories?: Category[];

  @Type(() => User)
  @IsOptional()
  @IsNotEmpty()
  author?: User;

  @Type(() => Series)
  @IsOptional()
  series?: Series;
}

export default UpdatePostDto;
```

Thanks to adding the @IsOptional decorators, the user no longer has to provide all of the document’s properties.

JSON Patch
An alternative approach to our implementation is to quite literally send a set of instructions on how to modify an object. A way to do that is to use the JSON Patch format.

PATCH /posts/614fa87e4027d3141f28e9e7

```json
[
  {
    op: "replace",
    path: "/content",
    value: "A brand new content",
  },
];
```

If you want to know more, check out the jsonpatch.com website. Additionally, the fast-json-patch library might come in handy when implementing the above format into your application.

## Summary

In this article, we’ve learned about various ways of implementing the update functionality. Thanks to getting to know both about PUT and PATCH, we can choose the best approach for a particular case. When selecting one of the above, we should follow the specification and implement our API predictably and transparently. If we do that, we will make the life of our teammates and API users easier.
