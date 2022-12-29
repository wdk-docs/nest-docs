# 其他功能

这个页面列出了所有其他有用的功能。

## 全局前缀

要忽略通过 `setGlobalPrefix()` 设置的路由的全局前缀，请使用 `ignoreGlobalPrefix` :

```typescript
const document = SwaggerModule.createDocument(app, options, {
  ignoreGlobalPrefix: true,
});
```

## 多个规范

SwaggerModule 提供了一种支持多个规范的方法。
换句话说，您可以在不同的端点上使用不同的 ui 提供不同的文档。

要支持多个规范，应用程序必须使用模块化方法编写。
`createDocument()` 方法有第三个参数 `extraOptions` ，它是一个带有名为 `include` 属性的对象。
`include` 属性的值是一个模块数组。

您可以设置多个规格支持如下所示:

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CatsModule } from './cats/cats.module';
import { DogsModule } from './dogs/dogs.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * createDocument(application, configurationOptions, extraOptions);
   *
   * createDocument method takes an optional 3rd argument "extraOptions"
   * which is an object with "include" property where you can pass an Array
   * of Modules that you want to include in that Swagger Specification
   * E.g: CatsModule and DogsModule will have two separate Swagger Specifications which
   * will be exposed on two different SwaggerUI with two different endpoints.
   */

  const options = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();

  const catDocument = SwaggerModule.createDocument(app, options, {
    include: [CatsModule],
  });
  SwaggerModule.setup('api/cats', app, catDocument);

  const secondOptions = new DocumentBuilder()
    .setTitle('Dogs example')
    .setDescription('The dogs API description')
    .setVersion('1.0')
    .addTag('dogs')
    .build();

  const dogDocument = SwaggerModule.createDocument(app, secondOptions, {
    include: [DogsModule],
  });
  SwaggerModule.setup('api/dogs', app, dogDocument);

  await app.listen(3000);
}
bootstrap();
```

现在你可以用以下命令启动你的服务器:

```bash
$ npm run start
```

导航到`http://localhost:3000/api/cats`查看猫的 Swagger UI:

<figure><img src="/assets/swagger-cats.png" /></figure>

反过来，`http://localhost:3000/api/dogs`将为狗狗提供 Swagger 用户界面:

<figure><img src="/assets/swagger-dogs.png" /></figure>
