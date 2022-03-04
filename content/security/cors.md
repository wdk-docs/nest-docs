### CORS

跨源资源共享(CORS)是一种允许从另一个域请求资源的机制。
Under the hood, Nest makes use of the Express [cors](https://github.com/expressjs/cors) package.
This package provides various options that you can customize based on your requirements.

#### 入门

要启用 CORS，调用 Nest 应用程序对象上的`enableCors()`方法。

```typescript
const app = await NestFactory.create(AppModule);
app.enableCors();
await app.listen(3000);
```

`enableCors()`方法接受一个可选的配置对象参数。
该对象的可用属性在官方[CORS](https://github.com/expressjs/cors#configuration-options)文档中有描述。
另一种方法是传递一个[回调函数](https://github.com/expressjs/cors#configuring-cors-asynchronously)，它允许您根据请求(动态地)异步定义配置对象。

或者，通过`create()`方法的 options 对象启用 CORS。
将`cors`属性设置为`true`以启用 cors 的默认设置。

或者，将[CORS 配置对象](https://github.com/expressjs/cors#configuration-options)或[回调函数](https://github.com/expressjs/cors#configuring-cors-asynchronously)作为`CORS`属性值来定制其行为。

```typescript
const app = await NestFactory.create(AppModule, { cors: true });
await app.listen(3000);
```

上述方法仅适用于 REST 端点。

要在 GraphQL 中启用 CORS，请将`cors`属性设置为`true`，或者在导入 GraphQL 模块时，将[CORS 配置对象](https://github.com/expressjs/cors#configuration-options)或一个[回调函数](https://github.com/expressjs/cors#configuring-cors-asynchronously)作为`cors`属性值。

> warning **Warning** `CorsOptionsDelegate` 解决方案并不适用于 `apollo-server-fastify` 软件包。

```typescript
GraphQLModule.forRoot({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
}),
```
