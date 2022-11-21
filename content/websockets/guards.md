### 守卫

web套接字保护和[常规HTTP应用程序保护](/guards)之间没有根本区别。
唯一的区别是，你应该使用 `WsException` 而不是抛出 `HttpException`。

> info **Hint** `WsException` 类从 `@nestjs/websockets` 包中公开。

#### 绑定守卫

下面的示例使用方法范围的保护。
就像基于HTTP的应用程序一样，您也可以使用网关作用域的守卫(即，在网关类前面加上`@UseGuards()`装饰器)。

```typescript
@@filename()
@UseGuards(AuthGuard)
@SubscribeMessage('events')
handleEvent(client: Client, data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@UseGuards(AuthGuard)
@SubscribeMessage('events')
handleEvent(client, data) {
  const event = 'events';
  return { event, data };
}
```
