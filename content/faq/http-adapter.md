### HTTP adapter

有时，您可能希望访问底层 HTTP 服务器，可以在 Nest 应用程序上下文中访问，也可以从外部访问。

每个本地(特定于平台的)HTTP 服务器/库(例如 Express 和 fasttify)实例都包装在一个**适配器**中。
适配器被注册为一个全局可用的提供者，可以从应用程序上下文中检索它，也可以注入到其他提供者中。

#### 外部应用程序上下文策略

要从应用程序上下文外部获取对`HttpAdapter`的引用，请调用`getHttpAdapter()`方法。

```typescript
@@filename()
const app = await NestFactory.create(AppModule);
const httpAdapter = app.getHttpAdapter();
```

#### 语境策略

要从应用程序上下文中获取对`HttpAdapterHost`的引用，使用与任何其他现有提供商相同的技术(例如，使用构造函数注入)注入它。

```typescript
@@filename()
export class CatsService {
  constructor(private adapterHost: HttpAdapterHost) {}
}
@@switch
@Dependencies(HttpAdapterHost)
export class CatsService {
  constructor(adapterHost) {
    this.adapterHost = adapterHost;
  }
}
```

> info **Hint** The `HttpAdapterHost` is imported from the `@nestjs/core` package.

`HttpAdapterHost`不是一个实际的`HttpAdapter`。
要获得实际的`HttpAdapter`实例，只需访问`HttpAdapter`属性。

```typescript
const adapterHost = app.get(HttpAdapterHost);
const httpAdapter = adapterHost.httpAdapter;
```

`httpAdapter`是底层框架使用的 HTTP 适配器的实际实例。
它是`ExpressAdapter`或`FastifyAdapter`的一个实例(两个类都扩展了`AbstractHttpAdapter`)。

适配器对象公开了几个与 HTTP 服务器交互的有用方法。
但是，如果你想直接访问库实例(例如 Express 实例)，可以调用`getInstance()`方法。

```typescript
const instance = httpAdapter.getInstance();
```
