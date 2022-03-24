### 警卫

微服务保护和[常规 HTTP 应用程序保护](/guards)之间没有根本区别。
唯一的区别是，你应该使用 `RpcException` 而不是抛出 `HttpException` 。

> info **Hint** `RpcException`类是从`@nestjs/microservices`包中公开的。

#### 绑定警卫

下面的示例使用了一个方法范围的保护。
就像基于 HTTP 的应用程序一样，你也可以使用控制器范围的保护器(例如，在控制器类前面加上 `@UseGuards()` 装饰器)。

```typescript
@@filename()
@UseGuards(AuthGuard)
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@UseGuards(AuthGuard)
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```
