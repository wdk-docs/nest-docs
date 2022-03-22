### 安全

要定义特定操作应该使用哪些安全机制，请使用' @ apissecurity() '装饰器。

```typescript
@ApiSecurity('basic')
@Controller('cats')
export class CatsController {}
```

在运行你的应用程序之前，记得使用 DocumentBuilder 将安全定义添加到你的基础文档中:

```typescript
const options = new DocumentBuilder().addSecurity('basic', {
  type: 'http',
  scheme: 'basic',
});
```

一些最流行的身份验证技术是内置的(例如，‘basic’和‘承载者’)，因此您不必像上面所示那样手动定义安全机制。

#### 基本身份验证

要启用基本身份验证，请使用' @ApiBasicAuth() '。

```typescript
@ApiBasicAuth()
@Controller('cats')
export class CatsController {}
```

Before you run your application, remember to add the security definition to your base document using `DocumentBuilder`:

```typescript
const options = new DocumentBuilder().addBasicAuth();
```

#### 持票人身份验证

要启用承载身份验证，使用' @ApiBearerAuth() '。

```typescript
@ApiBearerAuth()
@Controller('cats')
export class CatsController {}
```

在运行你的应用程序之前，记得使用 DocumentBuilder 将安全定义添加到你的基础文档中:

```typescript
const options = new DocumentBuilder().addBearerAuth();
```

#### OAuth2 身份认证

To enable OAuth2, use `@ApiOAuth2()`.

```typescript
@ApiOAuth2(['pets:write'])
@Controller('cats')
export class CatsController {}
```

Before you run your application, remember to add the security definition to your base document using `DocumentBuilder`:

```typescript
const options = new DocumentBuilder().addOAuth2();
```

#### Cookie 验证

To enable cookie authentication, use `@ApiCookieAuth()`.

```typescript
@ApiCookieAuth()
@Controller('cats')
export class CatsController {}
```

Before you run your application, remember to add the security definition to your base document using `DocumentBuilder`:

```typescript
const options = new DocumentBuilder().addCookieAuth('optional-session-id');
```
