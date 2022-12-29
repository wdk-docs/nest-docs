# 拦截器

[常规拦截器](/interceptors)和 web 套接字拦截器之间没有区别。
下面的示例使用手动实例化的 method-scoped 的拦截器。
就像基于 HTTP 的应用程序一样，你也可以使用网关范围的拦截器(例如，在网关类的前缀加上一个`@UseInterceptors()`装饰器)。

```typescript
@@filename()
@UseInterceptors(new TransformInterceptor())
@SubscribeMessage('events')
handleEvent(client: Client, data: unknown): WsResponse<unknown> {
  const event = 'events';
  return { event, data };
}
@@switch
@UseInterceptors(new TransformInterceptor())
@SubscribeMessage('events')
handleEvent(client, data) {
  const event = 'events';
  return { event, data };
}
```
