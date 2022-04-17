### 异步服务提供者

有时，应用程序应该延迟启动，直到一个或多个异步任务完成。
例如，在与数据库建立连接之前，您可能不想开始接受请求。
您可以使用异步提供程序来实现这一点。

The syntax for this is to use `async/await` with the `useFactory` syntax.
The factory returns a `Promise`, and the factory function can `await` asynchronous tasks.
Nest will await resolution of the promise before instantiating any class that depends on (injects) such a provider.

```typescript
{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection(options);
    return connection;
  },
}
```

> info **Hint** Learn more about custom provider syntax [here](/fundamentals/custom-providers).

#### Injection

Asynchronous providers are injected to other components by their tokens, like any other provider.
In the example above, you would use the construct `@Inject('ASYNC_CONNECTION')`.

#### Example

[The TypeORM recipe](/recipes/sql-typeorm) has a more substantial example of an asynchronous provider.
