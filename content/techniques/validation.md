# 验证

最好的做法是验证发送到 web 应用程序的任何数据的正确性。
为了自动验证传入的请求，Nest 提供了几个现成的可用管道:

- `ValidationPipe`
- `ParseIntPipe`
- `ParseBoolPipe`
- `ParseArrayPipe`
- `ParseUUIDPipe`

`ValidationPipe`使用了功能强大的[class-validator](https://github.com/typestack/class-validator)包及其声明性验证装饰器。
`ValidationPipe`提供了一种方便的方法来为所有传入的客户机有效负载强制验证规则，其中特定的规则在每个模块的本地类/DTO 声明中使用简单的注释声明。

## 概述

在[Pipes](/pipes)一章中，我们详细介绍了如何构建简单的管道，并将它们绑定到控制器、方法或全局应用中，以演示这个过程是如何工作的。
为了更好地理解本章的主题，一定要回顾那一章。
在这里，我们将重点关注`ValidationPipe`的各种 **真实世界** 用例，并展示如何使用它的一些高级定制特性。

## 使用内置的 ValidationPipe

要开始使用它，我们首先安装所需的依赖项。

```bash
$ npm i --save class-validator class-transformer
```

!!! info "**Hint**"

    `ValidationPipe`是从`@nestjs/common`包中导出的。

因为这个管道使用了`class-validator` 和 `class-transformer` 库，所以有很多可用的选项。
您可以通过传递给管道的配置对象配置这些设置。
以下是内置选项:

```typescript
export interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  exceptionFactory?: (errors: ValidationError[]) => any;
}
```

除此之外，所有的`class-validator`选项(继承自`ValidatorOptions`接口)都是可用的:

<table>
  <tr>
    <th>选项</th>
    <th>类型</th>
    <th>描述</th>
  </tr>
  <tr>
    <td><code>enableDebugMessages</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，当出现问题时，验证器将向控制台输出额外的警告消息。</td>
  </tr>
  <tr>
    <td><code>skipUndefinedProperties</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，验证器将跳过验证对象中所有为空的属性的验证。</td>
  </tr>
  <tr>
    <td><code>skipNullProperties</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，验证器将跳过验证对象中所有为空或未定义的属性的验证。</td>
  </tr>
  <tr>
    <td><code>skipMissingProperties</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，验证器将跳过对验证对象中缺失的所有属性的验证。</td>
  </tr>
  <tr>
    <td><code>whitelist</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，验证器将删除已验证(返回)对象中不使用任何验证装饰器的任何属性。</td>
  </tr>
  <tr>
    <td><code>forbidNonWhitelisted</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，验证器将抛出异常，而不是剥离非白名单属性。</td>
  </tr>
  <tr>
    <td><code>forbidUnknownValues</code></td>
    <td><code>boolean</code></td>
    <td>如果设置为true，尝试验证未知对象将立即失败。</td>
  </tr>
  <tr>
    <td><code>disableErrorMessages</code></td>
    <td><code>boolean</code></td>
    <td>If set to true, validation errors will not be returned to the client.</td>
  </tr>
  <tr>
    <td><code>errorHttpStatusCode</code></td>
    <td><code>number</code></td>
    <td>This setting allows you to specify which exception type will be used in case of an error.
By default it throws <code>BadRequestException</code>.</td>
  </tr>
  <tr>
    <td><code>exceptionFactory</code></td>
    <td><code>Function</code></td>
    <td>Takes an array of the validation errors and returns an exception object to be thrown.</td>
  </tr>
  <tr>
    <td><code>groups</code></td>
    <td><code>string[]</code></td>
    <td>Groups to be used during validation of the object.</td>
  </tr>
  <tr>
    <td><code>always</code></td>
    <td><code>boolean</code></td>
    <td>Set default for <code>always</code> option of decorators.
Default can be overridden in decorator options</td>
  </tr>

  <tr>
    <td><code>strictGroups</code></td>
    <td><code>boolean</code></td>
    <td>If <code>groups</code> is not given or is empty, ignore decorators with at least one group.</td>
  </tr>
  <tr>
    <td><code>dismissDefaultMessages</code></td>
    <td><code>boolean</code></td>
    <td>If set to true, the validation will not use default messages.
Error message always will be <code>undefined</code>        if
      its not explicitly set.</td>
  </tr>
  <tr>
    <td><code>validationError.target</code></td>
    <td><code>boolean</code></td>
    <td>Indicates if target should be exposed in <code>ValidationError</code>.</td>
  </tr>
  <tr>
    <td><code>validationError.value</code></td>
    <td><code>boolean</code></td>
    <td>Indicates if validated value should be exposed in <code>ValidationError</code>.</td>
  </tr>
  <tr>
    <td><code>stopAtFirstError</code></td>
    <td><code>boolean</code></td>
    <td>When set to true, validation of the given property will stop after encountering the first error.
Defaults to false.</td>
  </tr>
</table>

!!! info **Notice** 在它的[存储库](https://github.com/typestack/class-validator)中找到关于`class-validator`包的更多信息。

## 自动验证

我们将首先在应用程序级别绑定`ValidationPipe`，从而确保所有端点都受到保护，不接收不正确的数据。

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
```

为了测试管道，让我们创建一个基本端点。

```typescript
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return 'This action adds a new user';
}
```

!!! info "**Hint**"

    由于 TypeScript 不存储关于泛型或接口的元数据，当你在 DTOs 中使用它们时，`ValidationPipe` 可能无法正确地验证传入的数据。

> 出于这个原因，请考虑在 DTOs 中使用具体类。

!!! info "**Hint**"

    当导入你的 DTOs 时，你不能使用仅类型导入，因为它会在运行时被删除。

> 记得 `import {{ '{' }} CreateUserDto {{ '}' }}` 而不是 `import type {{ '{' }} CreateUserDto {{ '}' }}`.

现在我们可以在`CreateUserDto`中添加一些验证规则。
我们使用 `class-validator` 包提供的装饰器来实现这一点，详细描述[在这里](https://github.com/typestack/class-validator#validation-decorators)。
在这种方式下，任何使用 `CreateUserDto` 的路由都会自动执行这些验证规则。

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
```

有了这些规则，如果一个请求在请求体中有一个无效的 `email` 属性，应用程序将自动响应一个`400 Bad request`代码，以及下面的响应体:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["email must be an email"]
}
```

除了验证请求体之外，`ValidationPipe`还可以与其他请求对象属性一起使用。
假设我们希望在端点路径中接受`:id`。
为了确保这个请求参数只接受数字，我们可以使用以下构造:

```typescript
@Get(':id')
findOne(@Param() params: FindOneParams) {
  return 'This action returns a user';
}
```

像 DTO 一样，`FindOneParams`只是一个使用`class-validator`定义验证规则的类。
它看起来是这样的:

```typescript
import { IsNumberString } from 'class-validator';

export class FindOneParams {
  @IsNumberString()
  id: number;
}
```

## 禁用详细错误

错误消息有助于解释请求中的错误。
然而，一些生产环境倾向于禁用详细错误。
通过将一个 options 对象传递给`ValidationPipe`来实现:

```typescript
app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: true }));
```

因此，详细的错误消息将不会显示在响应体中。

## 剥离性能

我们的`ValidationPipe`还可以过滤掉方法处理程序不应该接收的属性。
在这种情况下，我们可以将可接受的属性 **白名单** ，而任何未包含在白名单中的属性将自动从结果对象中删除。
例如，如果我们的处理程序需要 `email` 和 `password` 属性，但请求还包含 `age` 属性，则可以自动从结果 DTO 中删除该属性。
要启用这种行为，请将`whitelist`设置为`true`。

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

当设置为 `true` 时，这将自动删除非白名单属性(在验证类中没有任何装饰器的属性)。

或者，当出现非白名单属性时，您可以停止处理请求，并向用户返回一个错误响应。
要启用此功能，请将 `forbidNonWhitelisted` 选项属性设置为 `true` ，同时将 `whitelist` 设置为 `true` 。

## 变换负载对象

通过网络传入的有效负载是普通的 JavaScript 对象。
`ValidationPipe` 可以根据 DTO 类自动将有效负载转换为对象类型。
要启用自动转换，请将 `transform` 设置为 `true` 。
这可以在方法级别完成:

=== "cats.controller.ts"

    ```ts
    @Post()
    @UsePipes(new ValidationPipe({ transform: true }))
    async create(@Body() createCatDto: CreateCatDto) {
      this.catsService.create(createCatDto);
    }
    ```

要全局启用此行为，请在全局管道上设置该选项:

```typescript
app.useGlobalPipes(new ValidationPipe({ transform: true }));
```

启用自动转换选项后， `ValidationPipe` 也将执行基元类型的转换。
在下面的例子中， `findOne()` 方法接受一个参数，它表示提取的 `id` 路径参数:

```typescript
@Get(':id')
findOne(@Param('id') id: number) {
  console.log(typeof id === 'number'); // true
  return 'This action returns a user';
}
```

默认情况下，网络中的每个路径参数和查询参数都是一个`string`。
在上面的例子中，我们将`id` 类型指定为`number`(在方法签名中)。
因此，`ValidationPipe`将尝试自动将字符串标识符转换为数字。

## 显式转换

在上一节中，我们展示了`ValidationPipe`如何根据预期的类型隐式地转换查询和路径参数。
然而，该特性需要启用自动转换。

或者(禁用自动转换)，您可以使用 `ParseIntPipe` 或 `ParseBoolPipe` 显式地强制转换值(注意， `ParseStringPipe` 是不需要的，因为正如前面提到的，每个路径参数和查询参数默认都作为`string`通过网络传递)。

```typescript
@Get(':id')
findOne(  @Param('id', ParseIntPipe) id: number,  @Query('sort', ParseBoolPipe) sort: boolean,) {
  console.log(typeof id === 'number'); // true
  console.log(typeof sort === 'boolean'); // true
  return 'This action returns a user';
}
```

!!! info "**Hint**"

    `ParseIntPipe` 和 `ParseBoolPipe` 是从 `@nestjs/common` 包导出的。

## 映射类型

当你构建像 **CRUD** (创建/读取/更新/删除)这样的特性时，在基本实体类型上构造变量通常很有用。
Nest 提供了几个执行类型转换的实用函数，使这项任务更加方便。

> **Warning** 如果你的应用程序使用 `@nestjs/swagger` 包，请参阅[本章](/openapi/mapped-types)了解更多关于 Mapped Types 的信息。
> Likewise, if you use the `@nestjs/graphql` package see [this chapter](/graphql/mapped-types).
> 这两个包都严重依赖于类型，因此它们需要使用不同的导入。
> 因此，如果你使用 `@nestjs/mapped-types` (而不是一个适当的， `@nestjs/swagger` 或 `@nestjs/graphql` ，这取决于你的应用程序的类型)，你可能会面临各种各样的，没有文档化的副作用。

当构建输入验证类型(也称为 dto)时，在同一类型上构建 **create**和**update** 变体通常很有用。
例如， **create**变量可能需要所有字段，而**update** 变量可能让所有字段都是可选的。

Nest 提供了 `PartialType()` 实用函数来简化此任务并最小化样板文件。

`PartialType()` 函数返回一个类型(类)，其中输入类型的所有属性设置为可选。
例如，假设我们有一个如下的 **create** 类型:

```typescript
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

默认情况下，所有这些字段都是必需的。
要创建具有相同字段的类型，但每个字段都是可选的，使用 `PartialType()` 传递类引用(`CreateCatDto`)作为参数:

```typescript
export class UpdateCatDto extends PartialType(CreateCatDto) {}
```

!!! info "**Hint**"

     `PartialType()` 函数是从 `@nestjs/mapped-types` 包中导入的。

`PickType()` 函数通过从输入类型中选取一组属性来构造一个新类型(类)。
例如，假设我们以如下类型开始:

```typescript
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

我们可以使用 `PickType()` 实用函数从这个类中选取一组属性:

```typescript
export class UpdateCatAgeDto extends PickType(CreateCatDto, ['age'] as const) {}
```

!!! info "**Hint**"

     `PickType()` 函数是从 `@nestjs/mapped-types` 包中导入的。

`OmitType()` 函数通过从输入类型中选取所有属性，然后删除一组特定的键来构造类型。
例如，假设我们以如下类型开始:

```typescript
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
```

我们可以生成一个具有 **除** `name` 之外的所有属性的派生类型，如下所示。
在这个构造中， `OmitType` 的第二个参数是一个属性名数组。

```typescript
export class UpdateCatDto extends OmitType(CreateCatDto, ['name'] as const) {}
```

!!! info "**Hint**"

     `OmitType()` 函数是从 `@nestjs/mapped-types` 包中导入的。

`IntersectionType()` 函数将两种类型合并成一个新的类型(类)。
例如，假设我们从以下两种类型开始:

```typescript
export class CreateCatDto {
  name: string;
  breed: string;
}

export class AdditionalCatInfo {
  color: string;
}
```

我们可以生成一个新类型，它结合了这两种类型中的所有属性。

```typescript
export class UpdateCatDto extends IntersectionType(
  CreateCatDto,
  AdditionalCatInfo,
) {}
```

!!! info "**Hint**"

    IntersectionType()函数是从 `@nestjs/mapped-types` 包中导入的。

类型映射实用函数是可组合的。
例如，下面将生成一个类型(类)，它拥有 `CreateCatDto` 类型的所有属性，除了 `name` ，这些属性将被设置为可选:

```typescript
export class UpdateCatDto extends PartialType(
  OmitType(CreateCatDto, ['name'] as const),
) {}
```

## 解析和验证数组

TypeScript 不存储关于泛型或接口的元数据，所以当你在 dto 中使用它们时， `ValidationPipe` 可能无法正确地验证传入的数据。
例如，在下面的代码中， `createUserDtos` 将不会被正确验证:

```typescript
@Post()
createBulk(@Body() createUserDtos: CreateUserDto[]) {
  return 'This action adds new users';
}
```

要验证数组，请创建一个专用类，其中包含一个包装数组的属性，或者使用 `ParseArrayPipe` 。

```typescript
@Post()
createBulk(
  @Body(new ParseArrayPipe({ items: CreateUserDto }))
  createUserDtos: CreateUserDto[],
) {
  return 'This action adds new users';
}
```

此外，在解析查询参数时， `ParseArrayPipe` 可能会派上用场。
让我们考虑一个 `findByIds()` 方法，它根据作为查询参数传递的标识符返回用户。

```typescript
@Get()
findByIds(  @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))  ids: number[],) {
  return 'This action returns users by ids';
}
```

这个构造验证来自 HTTP `GET` 请求的传入查询参数，如下所示:

```bash
GET /?ids=1,2,3
```

## WebSockets and Microservices

虽然本章展示了使用 HTTP 风格应用程序的例子(如 Express 或 Fastify)，但无论使用哪种传输方法，“ValidationPipe”对于 WebSockets 和微服务都是一样的。

## 了解更多

更多关于自定义验证器、错误消息和“类验证器”包提供的可用装饰器的信息请参见[这里](https://github.com/typestack/class-validator)。
