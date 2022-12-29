# 独立应用程序

挂载 Nest 应用程序有几种方法。
你可以创建一个 web 应用，一个微服务，或者只是一个裸的 Nest 独立应用(没有任何网络监听器)。

独立的 Nest 应用程序是 Nest **IoC 容器** 的包装器，该容器包含所有实例化的类。
我们可以直接使用独立的应用程序对象从任何导入的模块中获取对任何现有实例的引用。
因此，你可以在任何地方利用 Nest 框架，例如，包括脚本化的 **CRON** 作业。你甚至可以在上面构建一个 **CLI** 。

## 开始

要创建一个独立的 Nest 应用程序，使用以下构造:

```typescript
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // application logic...
}
bootstrap();
```

独立应用程序对象允许您获取对 Nest 应用程序中注册的任何实例的引用。
假设我们在 TasksModule 中有一个 TasksService。
这个类提供了一组我们希望从 CRON 作业中调用的方法。

```typescript
const app = await NestFactory.createApplicationContext(AppModule);
const tasksService = app.get(TasksService);
```

要访问`TasksService`实例，我们使用`get()`方法。
`get()`方法的作用类似于一个 **查询** ，在每个注册的模块中搜索一个实例。

或者，对于严格的上下文检查，传递一个带有`strict: true`属性的选项对象。
实际上，使用这个选项，您必须通过特定的模块来从选定的上下文获取特定的实例。

```typescript
const app = await NestFactory.createApplicationContext(AppModule);
const tasksService = app
  .select(TasksModule)
  .get(TasksService, { strict: true });
```

以下是可用于从独立应用程序对象检索实例引用的方法的摘要。

<table>
  <tr>
    <td>
      <code>get()</code>
    </td>
    <td>
      检索应用程序上下文中可用的控制器或提供器的实例(包括守卫、过滤器等)。
    </td>
  </tr>
  <tr>
    <td>
      <code>select()</code>
    </td>
    <td>
      在模块图中导航，从所选模块中取出特定实例(与上面描述的`strict`模式一起使用)。
    </td>
  </tr>
</table>

!!! info "在非严格模式下，默认选择根模块。要选择任何其他模块，您需要一步一步地手动导航模块图。"

如果你想让 node 应用程序在脚本完成后关闭(例如，一个运行 CRON 作业的脚本)，添加`await app.close()`到你的`bootstrap`函数的末尾:

```typescript
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // application logic...
  await app.close();
}
bootstrap();
```

## 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/18-context).
