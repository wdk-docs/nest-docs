# 管道

在[常规管道](/pipes)和 web 套接字管道之间没有根本的区别。
唯一的区别是，你应该使用`WsException`而不是抛出`HttpException`。
此外，所有管道将只应用于`data`参数(因为验证或转换`client`实例是无用的)。

!!! info "`WsException`类是从`@nestjs/websockets`包中公开的。"

## 绑定管道

下面的示例使用一个手工实例化的方法范围的管道。
就像基于 HTTP 的应用程序一样，您也可以使用网关作用域的管道(即，在网关类前面加上`@UsePipes()`装饰器)。

=== "TypeScript"

    ```ts
    @UsePipes(new ValidationPipe())
    @SubscribeMessage('events')
    handleEvent(client: Client, data: unknown): WsResponse<unknown> {
      const event = 'events';
      return { event, data };
    }
    ```

=== "JavaScript"

    ```js
    @UsePipes(new ValidationPipe())
    @SubscribeMessage('events')
    handleEvent(client, data) {
      const event = 'events';
      return { event, data };
    }
    ```
