### HTTP module

[Axios](https://github.com/axios/axios)是广泛使用的功能丰富的 HTTP 客户端包。
Nest 封装 Axios 并通过内置的`HttpModule`公开它。
`HttpModule`导出`HttpService`类，该类公开了基于 axios 的方法来执行 HTTP 请求。
该库还将产生的 HTTP 响应转换为“可观察对象”。

> info **Hint** 你也可以直接使用任何通用的 Node.js HTTP 客户端库，包括[got](https://github.com/sindresorhus/got)或[undici](https://github.com/nodejs/undici)。

#### 安装

要开始使用它，我们首先安装所需的依赖项。

```bash
$ npm i --save @nestjs/axios
```

#### 开始

一旦安装过程完成，要使用`HttpService`，首先导入`HttpModule`。

```typescript
@Module({
  imports: [HttpModule],
  providers: [CatsService],
})
export class CatsModule {}
```

接下来，使用普通构造函数注入注入`HttpService`。

> info **Hint** `HttpModule`和`HttpService`是从`@nestjs/axios`包中导入的。

```typescript
@@filename()
@Injectable()
export class CatsService {
  constructor(private httpService: HttpService) {}

  findAll(): Observable<AxiosResponse<Cat[]>> {
    return this.httpService.get('http://localhost:3000/cats');
  }
}
@@switch
@Injectable()
@Dependencies(HttpService)
export class CatsService {
  constructor(httpService) {
    this.httpService = httpService;
  }

  findAll() {
    return this.httpService.get('http://localhost:3000/cats');
  }
}
```

> info **Hint** `AxiosResponse`是从`axios`包(`$ npm i axios`)导出的接口。

所有的“HttpService”方法都返回一个包装在“Observable”对象中的“AxiosResponse”。

#### 配置

[Axios](https://github.com/axios/axios)可以配置各种选项来定制`HttpService`的行为。
[此处](https://github.com/axios/axios#request-config)了解更多。
要配置底层的 Axios 实例，在导入它时将一个可选选项对象传递给`HttpModule`的`register()`方法。
这个选项对象将直接传递给底层的 Axios 构造函数。

```typescript
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [CatsService],
})
export class CatsModule {}
```

#### 异步的配置

当您需要异步而不是静态地传递模块选项时，请使用`registerAsync()`方法。
与大多数动态模块一样，Nest 提供了几种处理异步配置的技术。

一种技术是使用工厂函数:

```typescript
HttpModule.registerAsync({
  useFactory: () => ({
    timeout: 5000,
    maxRedirects: 5,
  }),
});
```

像其他工厂提供程序一样，我们的工厂函数可以是[async](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)，并且可以通过`inject`注入依赖项。

```typescript
HttpModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    timeout: configService.getString('HTTP_TIMEOUT'),
    maxRedirects: configService.getString('HTTP_MAX_REDIRECTS'),
  }),
  inject: [ConfigService],
});
```

或者，你可以使用类而不是工厂来配置`HttpModule`，如下所示。

```typescript
HttpModule.registerAsync({
  useClass: HttpConfigService,
});
```

上面的构造函数在`HttpModule`中实例化了`HttpConfigService`，用它来创建一个选项对象。
注意，在本例中，`HttpConfigService`必须实现如下所示的`HttpModuleOptionsFactory`接口。
`HttpModule`将对所提供类的实例化对象调用`createHttpOptions()`方法。

```typescript
@Injectable()
class HttpConfigService implements HttpModuleOptionsFactory {
  createHttpOptions(): HttpModuleOptions {
    return {
      timeout: 5000,
      maxRedirects: 5,
    };
  }
}
```

如果你想重用现有的选项提供程序，而不是在`HttpModule`中创建私有副本，请使用`useExisting`语法。

```typescript
HttpModule.registerAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```
