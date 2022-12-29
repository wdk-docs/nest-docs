# 修饰器

所有可用的 OpenAPI 装饰器都有一个`Api`前缀，以区别于核心装饰器。
下面是导出的 decorator 的完整列表，并指定了 decorator 可以应用的级别。

|                          |                     |
| ------------------------ | ------------------- |
| `@ApiOperation()`        | Method              |
| `@ApiResponse()`         | Method / Controller |
| `@ApiProduces()`         | Method / Controller |
| `@ApiConsumes()`         | Method / Controller |
| `@ApiBearerAuth()`       | Method / Controller |
| `@ApiOAuth2()`           | Method / Controller |
| `@ApiBasicAuth()`        | Method / Controller |
| `@ApiSecurity()`         | Method / Controller |
| `@ApiExtraModels()`      | Method / Controller |
| `@ApiBody()`             | Method              |
| `@ApiParam()`            | Method              |
| `@ApiQuery()`            | Method              |
| `@ApiHeader()`           | Method / Controller |
| `@ApiExcludeEndpoint()`  | Method              |
| `@ApiTags()`             | Method / Controller |
| `@ApiProperty()`         | Model               |
| `@ApiPropertyOptional()` | Model               |
| `@ApiHideProperty()`     | Model               |
| `@ApiExtension()`        | Method              |
