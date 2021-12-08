### 管道

在[常规管道](/pipes)和web套接字管道之间没有根本的区别。
唯一的区别是，你应该使用`WsException`而不是抛出`HttpException`。
此外，所有管道将只应用于`data`参数(因为验证或转换`client`实例是无用的)。

> info **Hint** `WsException`类是从`@nestjs/websockets`包中公开的。

#### 绑定管道

下面的示例使用手动实例化的method-scoped管道。
就像基于HTTP的应用程序一样，你也可以使用gateway-scoped的管道(例如，在网关类的前缀加上一个`@UsePipes()`装饰器)。

```typescript
@@filename()
@UsePipes(new ValidationPipe())
@SubscribeMessage('events')
handleEvent(client: Client, data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@UsePipes(new ValidationPipe())
@SubscribeMessage('events')
handleEvent(client, data) {
  const event = 'events';
  return { event, data };
}
```
