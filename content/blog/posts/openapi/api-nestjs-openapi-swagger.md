---
title: "OpenAPI规范和Swagger"
linkTitle: "Swagger"
weight: 1
---

> https://wanago.io/2022/02/14/api-nestjs-openapi-swagger/

Across this series, we emphasize code readability and maintainability.
In part #52 of this course, we’ve gone through generating documentation with Compodoc and JSDoc.
This time we look into the OpenAPI specification and the Swagger tool.

You can check out an interactive demo prepared by the Swagger team.

## OpenAPI 和 Swagger 介绍

With OpenAPI and Swagger, we can create a user interface that serves as interactive API documentation for our project.
However, since it might be confusing, it is worth outlining the difference between the OpenAPI and the Swagger.

The OpenAPI is a specification used to describe our API and gives us a way to provide the details of our endpoints.
It includes the endpoints and the description of each operation’s inputs and outputs.
It also allows us to specify our authentication method, license, and contact information.

Swagger is a set of tools built around the OpenAPI specification.
The one that we present in this article is the Swagger UI.
It allows us to render the OpenAPI specification we wrote in as the API documentation.
The thing that makes it so valuable is that it is interactive.
Swagger generates a web page that we can publish so that people can view our API and make HTTP requests.
It is a great tool to share knowledge with other people working in our organization.
If our API is open to the public, we can also deploy the above page and share it with everyone.

OpenAPI Specification was formerly called the Swagger Specification, which might add more to the confusion.

## 将 Swagger 添加到我们的 NestJS 项目中

We need to install two dependencies to add Swagger to our NestJS project.

npm install @nestjs/swagger swagger-ui-express
If you use Fastify, install fastify-swagger instead of swagger-ui-express.

To generate the basics of our Swagger UI, we need to use the SwaggerModule and DocumentBuilder from @nestjs/swagger.

main.ts

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // ...

  const swaggerConfig = new DocumentBuilder()
    .setTitle("API with NestJS")
    .setDescription("API developed throughout the API with NestJS course")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document);

  const port = configService.get("PORT") ?? 3000;

  await app.listen(port);
}
bootstrap();
```

The DocumentBuilder class contains a set of methods we can use to configure our Swagger UI.

Besides the above functions such as the setTitle, we will also go through some of the others in this article.

@nestjs/swagger/dist/document-builder.d.ts

```ts
export declare class DocumentBuilder {
  private readonly logger;
  private readonly document;
  setTitle(title: string): this;
  setDescription(description: string): this;
  setVersion(version: string): this;
  setTermsOfService(termsOfService: string): this;
  setContact(name: string, url: string, email: string): this;
  setLicense(name: string, url: string): this;
  addServer(url: string, description?: string, variables?: Record<string, ServerVariableObject>): this;
  setExternalDoc(description: string, url: string): this;
  setBasePath(path: string): this;
  addTag(name: string, description?: string, externalDocs?: ExternalDocumentationObject): this;
  addSecurity(name: string, options: SecuritySchemeObject): this;
  addSecurityRequirements(name: string | SecurityRequirementObject, requirements?: string[]): this;
  addBearerAuth(options?: SecuritySchemeObject, name?: string): this;
  addOAuth2(options?: SecuritySchemeObject, name?: string): this;
  addApiKey(options?: SecuritySchemeObject, name?: string): this;
  addBasicAuth(options?: SecuritySchemeObject, name?: string): this;
  addCookieAuth(cookieName?: string, options?: SecuritySchemeObject, securityName?: string): this;
  build(): Omit<OpenAPIObject, "paths">;
}
```

Doing all of the above generates the Swagger UI and serves it under at http://localhost:3000/api.

The above URL might be different based on the port of your NestJS application.

## 自动生成 OpenAPI 规范

Unfortunately, the specification we’ve defined so far does not contain much detail.

We can help NestJS generate a more detailed OpenAPI specification out of the box.
To do that, we need to use the CLI plugin "@nestjs/swagger" gives us.
To use it, we need to adjust our nest-cli.json file and run nest start.

nest-cli.json

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": ["@nestjs/swagger"]
  }
}
```

The CLI plugin assumes that our DTOs are suffixed with .dto.ts or .entity.ts.
It also assumes that the files that contain controllers end with .controller.ts.

## 手动定义 OpenAPI 规范

Thanks to using the above solution, we automatically get a significant part of the specification generated.
If we want to make some changes, we can use the wide variety of decorators that NestJS gives us.

### 模型定义

We can use the @ApiProperty() decorator to annotate class properties.

register.dto

```ts
import { IsEmail, IsString, IsNotEmpty, MinLength, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    deprecated: true,
    description: "Use the name property instead",
  })
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  password: string;

  @ApiProperty({
    description: "Has to match a regular expression: /^\\+[1-9]\\d{1,14}$/",
    example: "+123123123123",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phoneNumber: string;
}

export default RegisterDto;
```

The CLI plugin can understand the decorators from the class-validator such as @MinLength()

### 分组端点

All of our endpoints go into the “default” group by default.
To categorize them better, we can use the @ApiTags() decorator.

posts.controller.ts

```ts
import { Controller } from "@nestjs/common";
import PostsService from "./posts.service";
import { ApiTags } from "@nestjs/swagger";

@Controller("posts")
@ApiTags("posts")
export default class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ...
}
```

### 用更多的细节描述我们的端点

We can use decorators such as @ApiParam() and @ApiResponse() to provide more details about our endpoints.

posts.controller.ts

```ts
class DemoController {
  @Get(":id")
  @ApiParam({
    name: "id",
    required: true,
    description: "Should be an id of a post that exists in the database",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "A post has been successfully fetched",
    type: PostEntity,
  })
  @ApiResponse({
    status: 404,
    description: "A post with given id does not exist.",
  })
  getPostById(@Param() { id }: FindOneParams) {
    return this.postsService.getPostById(Number(id));
  }
}
```

Instead of passing status: 200 and status: 404 we could use the @ApiOkResponse() and @ApiNotFoundResponse() decorators.

## 验证和 cookies

In this series, we use cookie-based authentication.
Since many of our endpoints require the user to log in, let’s add this functionality to our OpenAPI specification.

If you want to know more about authentication, check out API with NestJS #3.
Authenticating users with bcrypt, Passport, JWT, and cookies

Swagger supports a variety of different types of authentication.
Unfortunately, it currently does not support sending cookies when using the “Try it out” button.
We can deal with this issue by using the Swagger interface to directly log in to our API.

In our application, we have the /log-in endpoint.
A lot of its logic happens in the LocalAuthenticationGuard.
Therefore, the CLI plugin does not note that the user needs to provide an email and a password.
Let’s fix that using the @ApiBody() decorator.

authentication.controller.ts

```ts
class DemoController {
  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post("log-in")
  @ApiBody({ type: LogInDto })
  async logIn(@Req() request: RequestWithUser) {
    const { user } = request;
    const accessTokenCookie = this.authenticationService.getCookieWithJwtAccessToken(user.id);
    const { cookie: refreshTokenCookie, token: refreshToken } = this.authenticationService.getCookieWithJwtRefreshToken(
      user.id
    );

    await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

    request.res.setHeader("Set-Cookie", [accessTokenCookie, refreshTokenCookie]);

    if (user.isTwoFactorAuthenticationEnabled) {
      return;
    }

    return user;
  }
}
```

We now can use the “Try it out” button to send a request to the /log-in endpoint.

Performing the above request sets the right cookie in our browser.
Thanks to that, we will send this cookie when interacting with other endpoints automatically.

## 处理文件上传

In part #55 of this series, we’ve implemented a way to upload files and store them on our server.
To reflect that in Swagger, we can use the @ApiBody() and @ApiConsumes() decorators.

users.controller.ts

```ts
import { UsersService } from "./users.service";
import { BadRequestException, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import JwtAuthenticationGuard from "../authentication/jwt-authentication.guard";
import RequestWithUser from "../authentication/requestWithUser.interface";
import { Express } from "express";
import LocalFilesInterceptor from "../localFiles/localFiles.interceptor";
import { ApiBody, ApiConsumes } from "@nestjs/swagger";
import FileUploadDto from "./dto/fileUpload.dto";

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
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "A new avatar for the user",
    type: FileUploadDto,
  })
  async addAvatar(@Req() request: RequestWithUser, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.addAvatar(request.user.id, {
      path: file.path,
      filename: file.originalname,
      mimetype: file.mimetype,
    });
  }
}
```

fileUpload.dto.ts

```ts
import { ApiProperty } from "@nestjs/swagger";
import { Express } from "express";

class FileUploadDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: Express.Multer.File;
}

export default FileUploadDto;
```

Doing the above creates an interface in Swagger UI where we can upload our image.

## 总结

在本文中，我们已经介绍了 OpenAPI 规范和 Swagger UI 工具。
我们已经使用 CLI 插件获得了很多现成的东西。
尽管如此，在某些情况下，我们必须手动使用 NestJS 提供的不同装饰器。
我们还处理了 cookie 认证和文件上传。
以上内容为我们提供了创建健壮的交互式文档所必需的知识。
