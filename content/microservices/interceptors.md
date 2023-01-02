# 拦截器

[常规拦截器](/拦截器)和微服务拦截器没有区别。下面的示例使用了一个手工实例化的方法范围的拦截器。
就像基于 HTTP 的应用程序一样，你也可以使用控制器作用域的拦截器(例如，在控制器类前面加上`@UseInterceptors()`装饰器)。

=== "TypeScript"

```ts
@UseInterceptors(new TransformInterceptor())
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
```

=== "JavaScript"

```js
@UseInterceptors(new TransformInterceptor())
@MessagePattern({ cmd: 'sum' })
accumulate(data) {
  return (data || []).reduce((a, b) => a + b);
}
```
