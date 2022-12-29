---
title: "Nestjs使用Multer上传文件"
linkTitle: "Nestjs Multer"
date: "2021-11-29"
author: "Gabriel Tanner"
description: >
---

> https://gabrieltanner.org/blog/nestjs-file-uploading-using-multer

本指南将向你展示如何将文件上传到你的 Nestjs 应用程序中，以及在这样做时你应该记住的事情。
您将开发一个具有三个端点的应用程序，将达到以下目的:

- 上传一个图像
- 上传多个图像
- 使用图像路径获取图像

您还将添加自定义实用工具来编辑文件名并验证图像的文件上传。
不浪费时间了，让我们开始吧。

## 设置

您需要做的第一件事是创建一个包含文件服务器的 Nestjs 项目。
为此，需要打开终端，执行如下命令:

```sh
nest new nest-file-uploading && cd nest-file-uploading
```

这将创建一个名为 nest-file-upload 的新目录，并使用标准的 Nestjs 配置对其进行初始化。

安装好目录后，你可以使用以下命令安装应用程序所需的依赖项:

```sh
npm install @nestjs/platform-express --save
npm install @types/express -D
```

在开始编码之前，您需要做的最后一件事是创建项目所需的文件和文件夹。
这非常简单，因为应用程序只需要多一个文件。

```sh
mkdir src/utils
touch src/utils/file-uploading.utils.ts
```

要启动应用程序，你现在可以在你的终端中执行

```sh
npm run start:dev。
```

## 上传文件

现在您已经完成了设置过程，您可以继续并开始实现实际的功能。
让我们从在你的 `AppModule` 中导入 `MulterModule` 开始，这样你就可以在其他文件中使用 `Multer` 。

```ts
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { MulterModule } from "@nestjs/platform-express";

@Module({
  imports: [
    MulterModule.register({
      dest: "./files",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

在这里，你从 `@nestjs/platform-express` 中导入 `MulterModule` ，并将其添加到 `imports` 语句中。
您还可以定义上传时保存文件的目的地。

> Note: 这个目标从项目的根路径开始，而不是 src 文件夹。

下一步是实现实际的上传功能，这相当简单。
您只需要将 `FileInterceptor()` 添加到一个普通的 `@Post` 请求处理程序中，然后使用`@UploadedFile()`装饰器从请求中提取文件。

```ts
export class AlbumController {
  @Post()
  @UseInterceptors(FileInterceptor("image"))
  async uploadedFile(@UploadedFile() file) {
    const response = {
      originalname: file.originalname,
      filename: file.filename,
    };
    return response;
  }
}
```

`FileInterceptor` 接受两个参数，一个 `fieldName` 和一个可选的 `options` 对象，稍后您将使用它来检查正确的文件类型，并在目录中给文件一个自定义名称。
一次上传多个文件几乎是一样的，你只需要使用 FilesInterceptor 来代替，并传递一个额外的参数，即文件的最大数量。

```ts
export class AlbumController {
  @Post("multiple")
  @UseInterceptors(
    FilesInterceptor("image", 20, {
      storage: diskStorage({
        destination: "./files",
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    })
  )
  async uploadMultipleFiles(@UploadedFiles() files) {
    const response = [];
    files.forEach((file) => {
      const fileReponse = {
        originalname: file.originalname,
        filename: file.filename,
      };
      response.push(fileReponse);
    });
    return response;
  }
}
```

这很简单，这里唯一的问题是，用户可以上传所有文件类型，而不考虑文件扩展名，这并不适合所有项目，文件名只是一些随机数。

让我们通过在您的`file-upload.utils.ts`文件中实现一些实用工具来修复这个问题。

首先，让我们实现只允许上传图像的文件类型过滤器。

```ts
export const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return callback(new Error("Only image files are allowed!"), false);
  }
  callback(null, true);
};
```

这里您创建了一个中间件函数，用于检查文件类型是否为图像。
如果是，它返回 true，图像将被上传，如果不是，你抛出一个错误，并为回调返回 false。

`editFileName` 函数具有相同的结构，但使用原始名称、文件扩展名和四个随机数创建一个自定义文件名。

```ts
export const editFileName = (req, file, callback) => {
  const name = file.originalname.split(".")[0];
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join("");
  callback(null, `${name}-${randomName}${fileExtName}`);
};
```

现在你已经创建了这两个中间件函数，是时候在 `app.controller.ts` 文件中使用它们了。
为此，你只需要在 `FileInterceptor` 中添加一个额外的配置对象，如下所示:

```ts
export class AlbumController {
  @Post()
  @UseInterceptors(
    FileInterceptor("image", {
      storage: diskStorage({
        destination: "./files",
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    })
  )
  async uploadedFile(@UploadedFile() file) {
    const response = {
      originalname: file.originalname,
      filename: file.filename,
    };
    return response;
  }

  @Post("multiple")
  @UseInterceptors(
    FilesInterceptor("image", 20, {
      storage: diskStorage({
        destination: "./files",
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    })
  )
  async uploadMultipleFiles(@UploadedFiles() files) {
    const response = [];
    files.forEach((file) => {
      const fileReponse = {
        originalname: file.originalname,
        filename: file.filename,
      };
      response.push(fileReponse);
    });
    return response;
  }
}
```

最后，你将添加一个`@Get`路由，它将`imagepath`作为参数，并使用 `sendFile` 方法返回图像。

```ts
export class AlbumController {
  @Get(":imgpath")
  seeUploadedFile(@Param("imgpath") image, @Res() res) {
    return res.sendFile(image, { root: "./files" });
  }
}
```

## 测试应用程序

既然您已经完成了应用程序，现在就可以通过向端点发送 HTTP 请求来测试它了。
这可以使用终端中的 `curl` 命令或使用一个 `HTTP` 客户端软件，如 `Postman` 或 `Insomnia` 来完成。
我个人使用的是《Insomnia》，但在《Postman》中也应该是一样的。

使用以下命令启动服务器:

```sh
npm run start
```

正如终端输出所示，服务器现在运行在 `http://localhost:3000` 上。
要测试 API，您现在只需要创建一个新的 `HTTP` 请求并将请求体更改为 `multipart` ，这样您就可以上传文件了。

![Upload images](https://content.gabrieltanner.org/content/images/2019/09/nest-file-upload-upload-image.jpg)
Upload images

在这里，您将目标设置为 `http://localhost:3000`，并向请求体添加一个图像。
这可以通过单击复选框旁边的箭头并选择 file 来完成。

在右侧，您可以看到服务器上带有原始文件名和新文件名的响应。

> Note: 稍后将使用新文件名从服务器获取图像。

![Upload multiple images](https://content.gabrieltanner.org/content/images/2019/09/nest-file-upload-upload-multiple-images.jpg)
Upload multiple images

在这里，您可以执行相同的操作，但要在/多个端点上上传多个文件。

![Get uploaded image](https://content.gabrieltanner.org/content/images/2019/09/nest-file-upload-get-image.jpg)
Get uploaded image

获取文件也是一个简单的过程。
您只需要将从 `post` 请求中获得的文件名作为参数发送一个 `get` 请求到 `API`。

项目的完整代码也可以在我的 [Github](https://github.com/TannerGabriel/Blog/tree/master/nest-file-uploading) 上找到。

## 结论

你一直坚持到最后!希望本文能帮助您理解 `Nestjs` 中的文件上传。

如果您觉得这很有用，请考虑推荐并与其他开发人员分享。
如果你有任何问题或反馈，请在 `twitter` 上告诉我或使用我的联系方式。
