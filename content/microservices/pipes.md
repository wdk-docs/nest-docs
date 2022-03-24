### Pipes

[常规管道](/pipes)和微服务管道之间没有根本区别。
唯一的区别是，你应该使用' `RpcException` '而不是抛出' `HttpException` '。

> info **Hint** The `RpcException` class is exposed from `@nestjs/microservices` package.

#### Binding pipes

The following example uses a manually instantiated method-scoped pipe. Just as with HTTP based applications, you can also use controller-scoped pipes (i.e., prefix the controller class with a `@UsePipes()` decorator).

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
