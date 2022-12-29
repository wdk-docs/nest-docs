# 类型和参数

“SwaggerModule”在路由处理程序中搜索所有的“@Body()”、“@Query()”和“@Param()”装饰器来生成 API 文档。
它还通过利用反射创建相应的模型定义。考虑以下代码:

```typescript
@Post()
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

!!! info "**Hint**"

    要显式设置 body 定义，请使用 `@ApiBody()` 装饰器(从 `@nestjs/swagger` 包导入)。

基于“CreateCatDto”，下面的模型定义将创建 Swagger UI:

<figure><img src="/assets/swagger-dto.png" /></figure>

正如您所看到的，虽然类有一些声明的属性，但定义是空的。
为了让类属性对“SwaggerModule”可见，我们必须要么用“@ApiProperty()”装饰器来注释它们，要么使用 CLI 插件(更多信息请阅读 **插件** 部分)，它会自动完成:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

!!! info "**Hint**"

    与其手动注释每个属性，不如考虑使用 Swagger 插件(参见[plugin](/openapi/cli-plugin)部分)，它会自动为你提供这些。

让我们打开浏览器并验证生成的“CreateCatDto”模型:

<figure><img src="/assets/swagger-dto2.png" /></figure>

In addition, the `@ApiProperty()` decorator allows setting various [Schema Object](https://swagger.io/specification/#schemaObject) properties:

```typescript
@ApiProperty({
  description: 'The age of a cat',
  minimum: 1,
  default: 1,
})
age: number;
```

!!! info "**Hint**"

    Instead of explicitly typing the `{{"@ApiProperty({ required: false })"}}` you can use the `@ApiPropertyOptional()` short-hand decorator.

In order to explicitly set the type of the property, use the `type` key:

```typescript
@ApiProperty({
  type: Number,
})
age: number;
```

## Arrays

When the property is an array, we must manually indicate the array type as shown below:

```typescript
@ApiProperty({ type: [String] })
names: string[];
```

!!! info "**Hint**"

    Consider using the Swagger plugin (see [Plugin](/openapi/cli-plugin) section) which will automatically detect arrays.

Either include the type as the first element of an array (as shown above) or set the `isArray` property to `true`.

## Circular dependencies

When you have circular dependencies between classes, use a lazy function to provide the `SwaggerModule` with type information:

```typescript
@ApiProperty({ type: () => Node })
node: Node;
```

!!! info "**Hint**"

    Consider using the Swagger plugin (see [Plugin](/openapi/cli-plugin) section) which will automatically detect circular dependencies.

## Generics and interfaces

Since TypeScript does not store metadata about generics or interfaces, when you use them in your DTOs, `SwaggerModule` may not be able to properly generate model definitions at runtime.
For instance, the following code won't be correctly inspected by the Swagger module:

```typescript
createBulk(@Body() usersDto: CreateUserDto[])
```

In order to overcome this limitation, you can set the type explicitly:

```typescript
@ApiBody({ type: [CreateUserDto] })
createBulk(@Body() usersDto: CreateUserDto[])
```

## Enums

To identify an `enum`, we must manually set the `enum` property on the `@ApiProperty` with an array of values.

```typescript
@ApiProperty({ enum: ['Admin', 'Moderator', 'User']})
role: UserRole;
```

Alternatively, define an actual TypeScript enum as follows:

```typescript
export enum UserRole {
  Admin = 'Admin',
  Moderator = 'Moderator',
  User = 'User',
}
```

You can then use the enum directly with the `@Query()` parameter decorator in combination with the `@ApiQuery()` decorator.

```typescript
@ApiQuery({ name: 'role', enum: UserRole })
async filterByRole(@Query('role') role: UserRole = UserRole.User) {}
```

<figure><img src="/assets/enum_query.gif" /></figure>

With `isArray` set to **true**, the `enum` can be selected as a **multi-select** :

<figure><img src="/assets/enum_query_array.gif" /></figure>

## Enums schema

By default, the `enum` property will add a raw definition of [Enum](https://swagger.io/docs/specification/data-models/enums/) on the `parameter`.

```yaml
- breed:
    type: 'string'
    enum:
      - Persian
      - Tabby
      - Siamese
```

The above specification works fine for most cases.
However, if you are utilizing a tool that takes the specification as **input** and generates **client-side** code, you might run into a problem with the generated code containing duplicated `enums`.
Consider the following code snippet:

```typescript
// generated client-side code
export class CatDetail {
  breed: CatDetailEnum;
}

export class CatInformation {
  breed: CatInformationEnum;
}

export enum CatDetailEnum {
  Persian = 'Persian',
  Tabby = 'Tabby',
  Siamese = 'Siamese',
}

export enum CatInformationEnum {
  Persian = 'Persian',
  Tabby = 'Tabby',
  Siamese = 'Siamese',
}
```

!!! info "**Hint**"

    The above snippet is generated using a tool called [NSwag](https://github.com/RicoSuter/NSwag).

You can see that now you have two `enums` that are exactly the same.
To address this issue, you can pass an `enumName` along with the `enum` property in your decorator.

```typescript
export class CatDetail {
  @ApiProperty({ enum: CatBreed, enumName: 'CatBreed' })
  breed: CatBreed;
}
```

The `enumName` property enables `@nestjs/swagger` to turn `CatBreed` into its own `schema` which in turns makes `CatBreed` enum reusable.
The specification will look like the following:

```yaml
CatDetail:
  type: 'object'
  properties:
    ...
    - breed:
        schema:
          $ref: '#/components/schemas/CatBreed'
CatBreed:
  type: string
  enum:
    - Persian
    - Tabby
    - Siamese
```

!!! info "**Hint**"

    Any **decorator** that takes `enum` as a property will also take `enumName`.

## Raw definitions

In some specific scenarios (e.g., deeply nested arrays, matrices), you may want to describe your type by hand.

```typescript
@ApiProperty({
  type: 'array',
  items: {
    type: 'array',
    items: {
      type: 'number',
    },
  },
})
coords: number[][];
```

Likewise, in order to define your input/output content manually in controller classes, use the `schema` property:

```typescript
@ApiBody({
  schema: {
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
  },
})
async create(@Body() coords: number[][]) {}
```

## Extra models

To define additional models that are not directly referenced in your controllers but should be inspected by the Swagger module, use the `@ApiExtraModels()` decorator:

```typescript
@ApiExtraModels(ExtraModel)
export class CreateCatDto {}
```

!!! info "**Hint**"

    You only need to use `@ApiExtraModels()` once for a specific model class.

Alternatively, you can pass an options object with the `extraModels` property specified to the `SwaggerModule#createDocument()` method, as follows:

```typescript
const document = SwaggerModule.createDocument(app, options, {
  extraModels: [ExtraModel],
});
```

To get a reference (`$ref`) to your model, use the `getSchemaPath(ExtraModel)` function:

```typescript
'application/vnd.api+json': {
   schema: { $ref: getSchemaPath(ExtraModel) },
},
```

## oneOf, anyOf, allOf

To combine schemas, you can use the `oneOf`, `anyOf` or `allOf` keywords ([read more](https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/)).

```typescript
@ApiProperty({
  oneOf: [
    { $ref: getSchemaPath(Cat) },
    { $ref: getSchemaPath(Dog) },
  ],
})
pet: Cat | Dog;
```

If you want to define a polymorphic array (i.e., an array whose members span multiple schemas), you should use a raw definition (see above) to define your type by hand.

```typescript
type Pet = Cat | Dog;

@ApiProperty({
  type: 'array',
  items: {
    oneOf: [
      { $ref: getSchemaPath(Cat) },
      { $ref: getSchemaPath(Dog) },
    ],
  },
})
pets: Pet[];
```

!!! info "**Hint**"

    The `getSchemaPath()` function is imported from `@nestjs/swagger`.

Both `Cat` and `Dog` must be defined as extra models using the `@ApiExtraModels()` decorator (at the class-level).
