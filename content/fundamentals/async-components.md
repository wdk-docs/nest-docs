# 异步服务提供器

有时，应用程序应该延迟启动，直到一个或多个异步任务完成。
例如，在与数据库建立连接之前，您可能不想开始接受请求。
您可以使用异步提供程序来实现这一点。

这个语法是和`useFactory`语法使用`async/await`。
工厂返回一个`Promise`，并且工厂函数可以`await`异步任务。
Nest 将在实例化依赖于(注入)这样一个提供器的任何类之前等待承诺的解析。

```typescript linenums="1" hl_lines="3 4"
{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection(options);
    return connection;
  },
}
```

!!! info "**了解有关自定义提供程序语法的更多信息[此处](/fundamentals/custom-providers).**"

## 注入

异步提供程序通过它们的令牌注入到其他组件，就像任何其他提供程序一样。
在上面的例子中，你将使用`@Inject('ASYNC_CONNECTION')`结构。

## 例子

[TypeORM 食谱](/recipes/sql-typeorm)有一个更重要的异步提供程序示例。
