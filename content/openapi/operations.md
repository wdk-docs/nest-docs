### 操作

在 OpenAPI 术语中，路径是 API 公开的端点(资源)，如`/users`或`/reports/summary`，操作是用于操作这些路径的 HTTP 方法，如`GET`，` POST`或`DELETE`。

#### 标签

要将一个控制器附加到一个特定的标签，可以使用`@ApiTags(…tags)`装饰器。

```typescript
@ApiTags('cats')
@Controller('cats')
export class CatsController {}
```

#### 头

要定义作为请求一部分的自定义头文件，请使用`@ApiHeader()`。

```typescript
@ApiHeader({
  name: 'X-MyHeader',
  description: 'Custom header',
})
@Controller('cats')
export class CatsController {}
```

#### 响应

要定义一个自定义的 HTTP 响应，使用`@ApiResponse()`装饰器。

```typescript
@Post()
@ApiResponse({ status: 201, description: 'The record has been successfully created.'})
@ApiResponse({ status: 403, description: 'Forbidden.'})
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

Nest 提供了一组简短的**API 响应**装饰器，它们继承自`@ApiResponse`装饰器:

- `@ApiOkResponse()`
- `@ApiCreatedResponse()`
- `@ApiAcceptedResponse()`
- `@ApiNoContentResponse()`
- `@ApiMovedPermanentlyResponse()`
- `@ApiBadRequestResponse()`
- `@ApiUnauthorizedResponse()`
- `@ApiNotFoundResponse()`
- `@ApiForbiddenResponse()`
- `@ApiMethodNotAllowedResponse()`
- `@ApiNotAcceptableResponse()`
- `@ApiRequestTimeoutResponse()`
- `@ApiConflictResponse()`
- `@ApiTooManyRequestsResponse()`
- `@ApiGoneResponse()`
- `@ApiPayloadTooLargeResponse()`
- `@ApiUnsupportedMediaTypeResponse()`
- `@ApiUnprocessableEntityResponse()`
- `@ApiInternalServerErrorResponse()`
- `@ApiNotImplementedResponse()`
- `@ApiBadGatewayResponse()`
- `@ApiServiceUnavailableResponse()`
- `@ApiGatewayTimeoutResponse()`
- `@ApiDefaultResponse()`

```typescript
@Post()
@ApiCreatedResponse({ description: 'The record has been successfully created.'})
@ApiForbiddenResponse({ description: 'Forbidden.'})
async create(@Body() createCatDto: CreateCatDto) {
  this.catsService.create(createCatDto);
}
```

为了指定请求的返回模型，我们必须创建一个类，并使用`@ApiProperty()`装饰器注释所有属性。

```typescript
export class Cat {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

然后`Cat`模型可以与响应装饰器的`type`属性结合使用。

```typescript
@ApiTags('cats')
@Controller('cats')
export class CatsController {
  @Post()
  @ApiCreatedResponse({
    description: 'The record has been successfully created.',
    type: Cat,
  })
  async create(@Body() createCatDto: CreateCatDto): Promise<Cat> {
    return this.catsService.create(createCatDto);
  }
}
```

让我们打开浏览器并验证生成的`Cat`模型:

<figure><img src="/assets/swagger-response-type.png" /></figure>

#### 文件上传

你可以使用`@ApiBody`装饰器和`@ApiConsumes()`来启用特定方法的文件上传。
下面是一个使用[File Upload](/techniques/file-upload)技术的完整示例:

```typescript
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'List of cats',
  type: FileUploadDto,
})
uploadFile(@UploadedFile() file) {}
```

其中`FileUploadDto`的定义如下:

```typescript
class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
```

要处理多个文件上传，可以定义如下`FilesUploadDto`:

```typescript
class FilesUploadDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  files: any[];
}
```

#### 扩展

要向请求添加 Extension，请使用`@ApiExtension()`装饰器。
扩展名必须以`x-`作为前缀。

```typescript
@ApiExtension('x-foo', { hello: 'world' })
```

#### 高级:通用`ApiResponse`

有了提供[Raw Definitions](/openapi/types-and-parameters#raw-definitions)的能力，我们可以为 Swagger UI 定义通用模式。
假设我们有以下 DTO:

```ts
export class PaginatedDto<TData> {
  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;

  results: TData[];
}
```

我们跳过修饰`结果`，因为我们稍后将提供它的原始定义。
现在，让我们定义另一个 DTO 并命名它，例如，`CatDto`，如下所示:

```ts
export class CatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

有了这些，我们可以定义一个`PaginatedDto<CatDto>`响应，如下所示:

```ts
@ApiOkResponse({
  schema: {
    allOf: [
      { $ref: getSchemaPath(PaginatedDto) },
      {
        properties: {
          results: {
            type: 'array',
            items: { $ref: getSchemaPath(CatDto) },
          },
        },
      },
    ],
  },
})
async findAll(): Promise<PaginatedDto<CatDto>> {}
```

在本例中，我们指定响应的所有属性为`PaginatedDto`，而`results`属性的类型为`Array<CatDto>`。

- getSchemaPath()函数，返回给定模型 OpenAPI 规范文件中的 OpenAPI 架构路径。
  — `allOf`是 OAS 3 提供的一个概念，用于覆盖各种与继承相关的用例。

最后，由于`PaginatedDto`没有被任何控制器直接引用，`SwaggerModule`还不能生成相应的模型定义。
在这种情况下，我们必须将它添加为[Extra Model](/openapi/types-and-parameters#extra-models)。
例如，我们可以在控制器层使用`@ApiExtraModels()`装饰器，如下所示:

```ts
@Controller('cats')
@ApiExtraModels(PaginatedDto)
export class CatsController {}
```

如果你现在运行 Swagger，生成的`Swagger`。针对这个特定端点的 `Json`应该定义如下响应:

```json
"responses": {
  "200": {
    "description": "",
    "content": {
      "application/json": {
        "schema": {
          "allOf": [
            {
              "$ref": "#/components/schemas/PaginatedDto"
            },
            {
              "properties": {
                "results": {
                  "$ref": "#/components/schemas/CatDto"
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

为了使它可重用，我们可以为`PaginatedDto`创建一个自定义装饰器，如下所示:

```ts
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedDto) },
          {
            properties: {
              results: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};
```

> info **Hint** ` Type<any>`接口和`applyDecorators`函数是从`@nestjs/common`包中导入的。

有了这些，我们可以在端点上使用自定义的`@ApiPaginatedResponse()`装饰器:

```ts
@ApiPaginatedResponse(CatDto)
async findAll(): Promise<PaginatedDto<CatDto>> {}
```

对于客户端生成工具，这种方法在如何为客户端生成`PaginatedResponse<TModel>`方面造成了歧义。
下面的代码片段是上述`GET /`端点的客户机生成器结果示例。

```typescript
// Angular
findAll(): Observable<{ total: number, limit: number, offset: number, results: CatDto[] }>
```

如您所见，这里的**返回类型**是不明确的。
为了解决这个问题，你可以在`ApiPaginatedResponse`的`schema`中添加一个`title`属性:

```typescript
export const ApiPaginatedResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        title: `PaginatedResponseOf${model.name}`
        allOf: [
          // ...
        ],
      },
    }),
  );
};
```

现在客户端生成器工具的结果将变成:

```ts
// Angular
findAll(): Observable<PaginatedResponseOfCatDto>
```
