---
title: "Uploading files to the server"
linkTitle: "文件上传"
weight: 1
---

到目前为止，在本系列中，我们已经描述了在服务器上存储文件的两种方法。
在第 10 篇文章中，我们向 Amazon S3 上传了文件。
虽然它的可伸缩性很强，但出于各种原因，我们可能不希望使用 AWS 等云服务。
因此，在本系列的第 54 部分中，我们学习了如何直接在 PostgreSQL 数据库中存储文件。
虽然它有一些优势，但它可能被认为在性能方面不够理想。

在本文中，我们将研究如何使用 NestJS 在服务器上存储上传的文件。
同样，我们将一些信息持久化到数据库中，但这一次只是元数据。

## 在服务器上保存文件

幸运的是，NestJS 使得在服务器上存储文件变得非常容易。
我们需要向 FileInterceptor 传递额外的参数。

users.service.ts;

```ts
import { UsersService } from "./users.service";
import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import JwtAuthenticationGuard from "../authentication/jwt-authentication.guard";
import RequestWithUser from "../authentication/requestWithUser.interface";
import { Express } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("avatar")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploadedFiles/avatars",
      }),
    })
  )
  async addAvatar(@Req() request: RequestWithUser, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.addAvatar(request.user.id, {
      path: file.path,
      filename: file.originalname,
      mimetype: file.mimetype,
    });
  }
}
```

当我们执行上述操作时，NestJS 将上传的文件存储在`./uploadefiles/avatars`目录中。

不过，上述方法存在一些问题。
首先，我们可能需要多个端点来接受文件。
在这种情况下，我们需要为它们每个重复配置的某些部分。
此外，我们应该将目标的。`/uploaddfiles` 部分放在一个环境变量中，以根据应用程序运行的环境来更改它。

## 扩展 FileInterceptor

实现上述目标的一种方法是扩展 FileInterceptor。
在查看了 NestJS 的底层之后，我们可以看到它使用了 mixin 模式。
因为 FileInterceptor 不是类，所以不能使用 extend 关键字。

我们想要扩展 FileInterceptor 的功能，当:

- 使用依赖注入来注入 `ConfigService` ，
- 能够从控制器传递额外的属性。

为此，我们可以创建我们的 mixin:

localFiles.interceptor.ts

```ts
import { FileInterceptor } from "@nestjs/platform-express";
import { Injectable, mixin, NestInterceptor, Type } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";

interface LocalFilesInterceptorOptions {
  fieldName: string;
  path?: string;
}

function LocalFilesInterceptor(options: LocalFilesInterceptorOptions): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    fileInterceptor: NestInterceptor;
    constructor(configService: ConfigService) {
      const filesDestination = configService.get("UPLOADED_FILES_DESTINATION");

      const destination = `${filesDestination}${options.path}`;

      const multerOptions: MulterOptions = {
        storage: diskStorage({
          destination,
        }),
      };

      this.fileInterceptor = new (FileInterceptor(options.fieldName, multerOptions))();
    }

    intercept(...args: Parameters<NestInterceptor["intercept"]>) {
      return this.fileInterceptor.intercept(...args);
    }
  }
  return mixin(Interceptor);
}

export default LocalFilesInterceptor;
```

在上面，我们使用 `UPLOADED_FILES_DESTINATION` 变量，并将其与提供的路径连接起来。
为此，让我们定义必要的环境变量。

app.module.ts

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "@hapi/joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        UPLOADED_FILES_DESTINATION: Joi.string().required(),
        // ...
      }),
    }),
    // ...
  ],
  // ...
})
export class AppModule {
  // ...
}
```

.env

```env
UPLOADED_FILES_DESTINATION=./uploadedFiles
# ...
```

当上面所有的准备就绪，我们可以在控制器中使用 LocalFilesInterceptor:

users.controller.ts

```ts
import { UsersService } from "./users.service";
import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import JwtAuthenticationGuard from "../authentication/jwt-authentication.guard";
import RequestWithUser from "../authentication/requestWithUser.interface";
import { Express } from "express";
import LocalFilesInterceptor from "../localFiles/localFiles.interceptor";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("avatar")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: "file",
      path: "/avatars",
    })
  )
  async addAvatar(@Req() request: RequestWithUser, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.addAvatar(request.user.id, {
      path: file.path,
      filename: file.originalname,
      mimetype: file.mimetype,
    });
  }
}
```

## 将元数据保存在数据库中

除了将文件存储在服务器上，我们还需要将文件的元数据保存在数据库中。
由于 NestJS 为上传的文件生成一个随机的文件名，我们还想存储原始的文件名。
要完成上述所有工作，我们需要为元数据创建一个实体。

localFile.entity.ts

```ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class LocalFile {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  filename: string;

  @Column()
  path: string;

  @Column()
  mimetype: string;
}

export default LocalFile;
localFile.dto.ts;
interface LocalFileDto {
  filename: string;
  path: string;
  mimetype: string;
}
```

我们还需要在用户和文件之间创建一个关系。

user.entity.ts

```ts
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import LocalFile from "../localFiles/localFile.entity";

@Entity()
class User {
  @PrimaryGeneratedColumn()
  public id: number;

  @JoinColumn({ name: "avatarId" })
  @OneToOne(() => LocalFile, {
    nullable: true,
  })
  public avatar?: LocalFile;

  @Column({ nullable: true })
  public avatarId?: number;

  // ...
}

export default User;
```

我们在上面添加了 avatarId 列，这样用户的实体就可以保存角色的 id，而不用连接角色的所有数据。

同时，我们还需要创建 LocalFilesService 的基础:

localFiles.service.ts

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import LocalFile from "./localFile.entity";

@Injectable()
class LocalFilesService {
  constructor(
    @InjectRepository(LocalFile)
    private localFilesRepository: Repository<LocalFile>
  ) {}

  async saveLocalFileData(fileData: LocalFileDto) {
    const newFile = await this.localFilesRepository.create(fileData);
    await this.localFilesRepository.save(newFile);
    return newFile;
  }
}

export default LocalFilesService;
```

最后一步是在 UsersService 中使用 saveLocalFileData 方法:

users.service.ts

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Connection, In } from "typeorm";
import User from "./user.entity";
import LocalFilesService from "../localFiles/localFiles.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private localFilesService: LocalFilesService
  ) {}

  async addAvatar(userId: number, fileData: LocalFileDto) {
    const avatar = await this.localFilesService.saveLocalFileData(fileData);
    await this.usersRepository.update(userId, {
      avatarId: avatar.id,
    });
  }

  // ...
}
```

## 检索文件

现在，用户可以检索他们化身的 id。

要下载具有给定 id 的文件，我们可以创建一个传输内容的控制器。

实现上述功能的第一步是扩展 LocalFilesService:

```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import LocalFile from "./localFile.entity";

@Injectable()
class LocalFilesService {
  constructor(
    @InjectRepository(LocalFile)
    private localFilesRepository: Repository<LocalFile>
  ) {}

  async getFileById(fileId: number) {
    const file = await this.localFilesRepository.findOne(fileId);
    if (!file) {
      throw new NotFoundException();
    }
    return file;
  }

  // ...
}

export default LocalFilesService;
```

我们还需要创建一个使用上述方法的控制器:

localFiles.controller.ts

```ts
import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  StreamableFile,
  Res,
  ParseIntPipe,
} from "@nestjs/common";
import LocalFilesService from "./localFiles.service";
import { Response } from "express";
import { createReadStream } from "fs";
import { join } from "path";

@Controller("local-files")
@UseInterceptors(ClassSerializerInterceptor)
export default class LocalFilesController {
  constructor(private readonly localFilesService: LocalFilesService) {}

  @Get(":id")
  async getDatabaseFileById(@Param("id", ParseIntPipe) id: number, @Res({ passthrough: true }) response: Response) {
    const file = await this.localFilesService.getFileById(id);

    const stream = createReadStream(join(process.cwd(), file.path));

    response.set({
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Content-Type": file.mimetype,
    });
    return new StreamableFile(stream);
  }
}
```

我们在本系列的前一部分中了解了 StreamableFile 类和 Content-Disposition 头文件。

执行上述操作允许用户检索具有给定 id 的文件。

## 过滤传入的文件

我们不应该总是相信用户上传的文件。
幸运的是，我们可以很容易地使用 filfilter 过滤它们，并限制 multer 支持的属性。

localFiles.interceptor.ts

```ts
import { FileInterceptor } from "@nestjs/platform-express";
import { Injectable, mixin, NestInterceptor, Type } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";

interface LocalFilesInterceptorOptions {
  fieldName: string;
  path?: string;
  fileFilter?: MulterOptions["fileFilter"];
  limits?: MulterOptions["limits"];
}

function LocalFilesInterceptor(options: LocalFilesInterceptorOptions): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    fileInterceptor: NestInterceptor;
    constructor(configService: ConfigService) {
      const filesDestination = configService.get("UPLOADED_FILES_DESTINATION");

      const destination = `${filesDestination}${options.path}`;

      const multerOptions: MulterOptions = {
        storage: diskStorage({
          destination,
        }),
        fileFilter: options.fileFilter,
        limits: options.limits,
      };

      this.fileInterceptor = new (FileInterceptor(options.fieldName, multerOptions))();
    }

    intercept(...args: Parameters<NestInterceptor["intercept"]>) {
      return this.fileInterceptor.intercept(...args);
    }
  }
  return mixin(Interceptor);
}

export default LocalFilesInterceptor;
```

让我们只允许在 mimetype 中包含“image”且小于 1MB 的文件。

```ts
import { UsersService } from "./users.service";
import { BadRequestException, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import JwtAuthenticationGuard from "../authentication/jwt-authentication.guard";
import RequestWithUser from "../authentication/requestWithUser.interface";
import { Express } from "express";
import LocalFilesInterceptor from "../localFiles/localFiles.interceptor";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("avatar")
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(
    LocalFilesInterceptor({
      fieldName: "file",
      path: "/avatars",
      fileFilter: (request, file, callback) => {
        if (!file.mimetype.includes("image")) {
          return callback(new BadRequestException("Provide a valid image"), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: Math.pow(1024, 2), // 1MB
      },
    })
  )
  async addAvatar(@Req() request: RequestWithUser, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.addAvatar(request.user.id, {
      path: file.path,
      filename: file.originalname,
      mimetype: file.mimetype,
    });
  }
}
```

如果文件不满足大小要求，NestJS 抛出 413 Payload Too Large。
不只是检查 mimetype 和使用文件类型库可能是一个好主意。

## 总结

在本文中，我们介绍了通过 NestJS 管理服务器上文件的基础知识。
我们已经学习了如何将它们存储在服务器上并返回给用户。
当这样做时，我们扩展了内置的 FileInterceptor 并实现了过滤。
仍然有一些方法可以扩展本文中的代码。
如本系列第 15 部分所述，您可以自由地实现文件删除和使用事务。

通过学习各种存储文件的方法，您现在可以自由地比较其优缺点，并使用最适合自己需求的方法。
