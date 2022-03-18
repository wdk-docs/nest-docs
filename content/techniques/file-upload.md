### 文件上传

为了处理文件上传，Nest 基于 Express 的[multer](https://github.com/expressjs/multer)中间件包提供了一个内置模块。
Multer 处理以`multipart/form-data`格式发布的数据，该格式主要用于通过 HTTP`POST`请求上传文件。  
此模块是完全可配置的，您可以根据应用程序的需求调整其行为。

> warning **Warning** Multer 不能处理不支持多部分格式的数据 (`multipart/form-data`).
> 另外，请注意这个包不兼容`FastifyAdapter`。

为了更好的类型安全，让我们安装 Multer typings 包:

```shell
$ npm i -D @types/multer
```

安装了这个包后，我们现在可以使用 `Express.Multer.File` 类型 (您可以如下方式导入该类型: `import {{ '{' }} Express {{ '}' }} from 'express'`).

#### 基本的例子

要上传单个文件，只需将`FileInterceptor()`拦截器绑定到路由处理程序上，然后使用`@UploadedFile()`装饰器从`request`中提取 `file` 。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  console.log(file);
}
@@switch
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@Bind(UploadedFile())
uploadFile(file) {
  console.log(file);
}
```

> info **Hint** `FileInterceptor()`装饰器是从`@nestjs/platform-express`包导出的。
> `@UploadedFile()`装饰器是从`@nestjs/common`导出的。

`FileInterceptor()`装饰器有两个参数:

- `fieldName`: 字符串，它提供了保存文件的 HTML 表单中字段的名称
- `options`: 类型为`MulterOptions`的可选对象。
  这是 multiter 构造函数使用的同一个对象 (更多细节[在这里](https://github.com/expressjs/multer#multeropts)).

> warning **Warning** `FileInterceptor()`可能不兼容第三方云提供商，如谷歌 Firebase 或其他。

#### 文件数组

要上传一个文件数组(用一个字段名标识)，使用`FilesInterceptor()`装饰器(注意装饰器名称中的复数**Files**)。
这个装饰器有三个参数:

- `fieldName`: 如上所述
- `maxCount`: 可选数目，定义要接受的最大文件数目
- `options`: 可选的`MulterOptions`对象，如上所述

当使用`FilesInterceptor()`时，使用`@UploadedFiles()`装饰器从`request`中提取文件。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(FilesInterceptor('files'))
uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
  console.log(files);
}
@@switch
@Post('upload')
@UseInterceptors(FilesInterceptor('files'))
@Bind(UploadedFiles())
uploadFile(files) {
  console.log(files);
}
```

> info **Hint** `FilesInterceptor()`装饰器是从`@nestjs/platform-express`包中导出的。
> `@UploadedFiles()`装饰器是从`@nestjs/common`导出的。

#### 多个文件

要上传多个字段(都有不同的字段名键)，请使用`FileFieldsInterceptor()`装饰器。
这个装饰器有两个参数:

- `uploadedFields`: 一个对象数组，其中每个对象指定一个必需的`name`属性和一个指定字段名称的字符串值，如前所述，以及一个可选的`maxCount`属性，如前所述
- `options`: 可选的`MulterOptions`对象，如上所述

当使用`FileFieldsInterceptor()`时，使用`@UploadedFiles()`装饰器从`request`中提取文件。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'avatar', maxCount: 1 },
  { name: 'background', maxCount: 1 },
]))
uploadFile(@UploadedFiles() files: { avatar?: Express.Multer.File[], background?: Express.Multer.File[] }) {
  console.log(files);
}
@@switch
@Post('upload')
@Bind(UploadedFiles())
@UseInterceptors(FileFieldsInterceptor([
  { name: 'avatar', maxCount: 1 },
  { name: 'background', maxCount: 1 },
]))
uploadFile(files) {
  console.log(files);
}
```

#### 任何文件

要上传带有任意字段名键的所有字段，请使用`AnyFilesInterceptor()`装饰器。
这个装饰器可以接受一个可选的`options`对象，如上所述。

当使用`AnyFilesInterceptor()`时，使用`@UploadedFiles()`装饰器从`request`中提取文件。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(AnyFilesInterceptor())
uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
  console.log(files);
}
@@switch
@Post('upload')
@Bind(UploadedFiles())
@UseInterceptors(AnyFilesInterceptor())
uploadFile(files) {
  console.log(files);
}
```

#### 默认选项

您可以在上面描述的文件拦截器中指定多个选项。
要设置默认选项，你可以在导入`MulterModule`时调用静态的`register()`方法，传入支持的选项。
您可以使用[这里](https://github.com/expressjs/multer#multeropts)列出的所有选项。

```typescript
MulterModule.register({
  dest: './upload',
});
```

> info **Hint** `MulterModule`类是从`@nestjs/platform-express`包中导出的。

#### 异步的配置

当你需要异步而不是静态地设置 `MulterModule` 选项时，使用 `registerAsync()` 方法。
与大多数动态模块一样，Nest 提供了几种技术来处理异步配置。

一种方法是使用工厂函数:

```typescript
MulterModule.registerAsync({
  useFactory: () => ({
    dest: './upload',
  }),
});
```

像其他[工厂提供程序](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)一样，我们的工厂函数可以是`async`的，并且可以通过`inject`注入依赖项。

```typescript
MulterModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    dest: configService.getString('MULTER_DEST'),
  }),
  inject: [ConfigService],
});
```

或者，你可以使用类而不是工厂来配置 `MulterModule`，如下所示:

```typescript
MulterModule.registerAsync({
  useClass: MulterConfigService,
});
```

上面的构造在 `MulterModule` 中实例化了 `MulterConfigService`，使用它来创建所需的选项对象。
注意在这个例子中，`MulterConfigService`必须实现`MulterOptionsFactory` 接口，如下所示。
`MulterModule` 会在提供的类的实例化对象上调用 `createMulterOptions()` 方法。

```typescript
@Injectable()
class MulterConfigService implements MulterOptionsFactory {
  createMulterOptions(): MulterModuleOptions {
    return {
      dest: './upload',
    };
  }
}
```

如果你想重用现有的选项提供程序，而不是在 `MulterModule` 中创建一个私有副本，请使用 `useExisting` 语法。

```typescript
MulterModule.registerAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

#### 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/29-file-upload).
