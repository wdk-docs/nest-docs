### 介绍

[OpenAPI](https://swagger.io/specification/)规范是一种与语言无关的定义格式，用于描述 RESTful api。
Nest 提供了一个专门的[模块](https://github.com/nestjs/swagger)，它允许通过利用装饰器生成这样的规范。

#### 安装

要开始使用它，我们首先安装所需的依赖项。

```bash
$ npm install --save @nestjs/swagger swagger-ui-express
```

如果你使用 fastify，安装 `fastify-swagger` 而不是 `swagger-ui-express`:

```bash
$ npm install --save @nestjs/swagger fastify-swagger
```

#### 引导

安装过程完成后，打开`main.ts`并使用 `SwaggerModule` 类初始化 Swagger:

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

> info **Hint** `document` (由`SwaggerModule#createDocument()`方法返回)是一个符合[OpenAPI 文档](https://swagger.io/specification/#openapi-document)的可序列化对象.
> 除了通过 HTTP 托管它，您还可以将它保存为 JSON/YAML 文件，并以不同的方式使用它。

`DocumentBuilder`有助于构造一个符合 OpenAPI 规范的基础文档。
它提供了几个方法，允许设置诸如标题、描述、版本等属性。
为了创建一个完整的文档(定义了所有 HTTP 路由)，我们使用了`SwaggerModule`类的`createDocument()`方法。
这个方法有两个参数，一个应用程序实例和一个 Swagger 选项对象。
或者，我们可以提供第三个参数，它的类型应该是`SwaggerDocumentOptions`。
更多信息请参见[文档选项部分](/openapi/introduction#document-options)。

一旦我们创建了一个文档，我们可以调用`setup()`方法。它接受:

1. 安装 Swagger UI 的路径
2. 一个应用程序实例
3. 上面实例化的文档对象
4. 可选的配置参数(阅读更多信息[此处](/openapi/introduction#document-options))

现在可以执行以下命令启动 HTTP 服务:

```bash
$ npm run start
```

当应用程序运行时，打开浏览器并导航到`http://localhost:3000/api`。你应该看看 Swagger UI。

<figure><img src="/assets/swagger1.png" /></figure>

`SwaggerModule` 会自动反映你所有的端点。请注意，根据平台的不同，Swagger UI 可以使用`swagger-ui-express` or `fastify-swagger`创建。

> info **Hint** 要生成和下载 Swagger JSON 文件，请在浏览器中导航到`http://localhost:3000/api-json`(`swagger-ui-express`)或`http://localhost:3000/api/json`(`fastify-swagger`)(假设您的 Swagger 文档在`http://localhost:3000/api`下可用)。

> warning **Warning** 当使用`fastify-swagger`和 `helmet`时，[CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)可能会有一个问题，为了解决这个碰撞，配置 CSP 如下所示:
>
> ```typescript
> app.register(helmet, {
>   contentSecurityPolicy: {
>     directives: {
>       defaultSrc: [`'self'`],
>       styleSrc: [`'self'`, `'unsafe-inline'`],
>       imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
>       scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
>     },
>   },
> });
>
> // If you are not going to use CSP at all, you can use this:
> app.register(helmet, {
>   contentSecurityPolicy: false,
> });
> ```

#### 文档选项

在创建文档时，可以提供一些额外的选项来微调库的行为。这些选项的类型应该是`SwaggerDocumentOptions`，可以如下:

```TypeScript
export interface SwaggerDocumentOptions {
  /**
   * List of modules to include in the specification
   */
  include?: Function[];

  /**
   * Additional, extra models that should be inspected and included in the specification
   */
  extraModels?: Function[];

  /**
   * If `true`, swagger will ignore the global prefix set through `setGlobalPrefix()` method
   */
  ignoreGlobalPrefix?: boolean;

  /**
   * If `true`, swagger will also load routes from the modules imported by `include` modules
   */
  deepScanRoutes?: boolean;

  /**
   * Custom operationIdFactory that will be used to generate the `operationId`
   * based on the `controllerKey` and `methodKey`
   * @default () => controllerKey_methodKey
   */
  operationIdFactory?: (controllerKey: string, methodKey: string) => string;
}
```

例如，如果你想确保库生成的操作名是 `createUser` 而不是 `UserController_createUser`，你可以设置如下:

```TypeScript
const options: SwaggerDocumentOptions =  {
  operationIdFactory: (
    controllerKey: string,
    methodKey: string
  ) => methodKey
};
const document = SwaggerModule.createDocument(app, config, options);
```

#### 设置选项

你可以通过传递实现`ExpressSwaggerCustomOptions`(如果你使用 express)接口的选项对象作为`SwaggerModule#setup`方法的第四个参数来配置 Swagger UI。

```TypeScript
export interface ExpressSwaggerCustomOptions {
  explorer?: boolean;
  swaggerOptions?: Record<string, any>;
  customCss?: string;
  customCssUrl?: string;
  customJs?: string;
  customfavIcon?: string;
  swaggerUrl?: string;
  customSiteTitle?: string;
  validatorUrl?: string;
  url?: string;
  urls?: Record<'url' | 'name', string>[];
}
```

如果你使用 fastify，你可以通过传递 `FastifySwaggerCustomOptions` 对象来配置用户界面。

```Typescript
export interface FastifySwaggerCustomOptions {
  uiConfig?: Record<string, any>;
}
```

例如，如果你想确保在刷新页面后认证令牌仍然存在，或者改变页面标题(显示在浏览器中)，你可以使用以下设置:

```TypeScript
const customOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customSiteTitle: 'My API Docs',
};
SwaggerModule.setup('docs', app, document, customOptions);
```

#### 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/11-swagger).
