# Pipes

[常规管道](/pipes)和微服务管道之间没有根本区别。
唯一的区别是，你应该使用 `RpcException` 而不是抛出 `HttpException`。

!!! info "**Hint**"

    `RpcException`类从`@nestjs/microservices`包中公开。

## 绑定管道

下面的示例使用一个手工实例化的方法范围的管道。就像基于 HTTP 的应用程序一样，您也可以使用控制器作用域的管道(即，在控制器类前面加上`@UsePipes()` 装饰器)。

```typescript
@@filename()
@UsePipes(new ValidationPipe())
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
@@switch
@UsePipes(new ValidationPipe())
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```
