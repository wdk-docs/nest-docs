### 测试

自动化测试被认为是任何严肃的软件开发工作的重要组成部分。
自动化使得在开发过程中可以轻松快速地重复单个测试或测试套件。
这有助于确保发布满足质量和性能目标。
自动化有助于增加覆盖率，并为开发人员提供更快的反馈循环。
自动化既提高了独立开发人员的生产力，又确保了测试在关键的开发生命周期节点上运行，比如源代码控制签入、特性集成和版本发布。

这样的测试通常跨越各种类型，包括单元测试、端到端(e2e)测试、集成测试等等。
虽然这些好处是毋庸置疑的，但设置起来可能很繁琐。
Nest 致力于推广开发最佳实践，包括有效的测试，因此它包括以下功能，以帮助开发人员和团队构建和自动化测试。

Nest:

- 自动搭建组件的默认单元测试和应用程序的端到端测试
- 提供默认工具(例如构建隔离模块/应用程序加载器的测试运行器)
- 提供了与[Jest](https://github.com/facebook/jest)和[Supertest](https://github.com/visionmedia/supertest)的开箱即用的集成，同时保持与测试工具无关
- 使得 Nest 依赖项注入系统在测试环境中可用，可以轻松模拟组件

如前所述，您可以使用任何您喜欢的测试框架，因为 Nest 不强制使用任何特定的工具。
只需替换所需的元素(比如测试运行器)，您仍然可以享受到 Nest 现成测试工具的好处。

#### 安装

首先安装所需的软件包:

```bash
$ npm i --save-dev @nestjs/testing
```

#### 单元测试

在下面的例子中，我们测试了两个类:`CatsController`和`CatsService`。
如前所述，[Jest](https://github.com/facebook/jest)是作为默认测试框架提供的。
它充当测试运行器，还提供断言函数和 test-double 实用程序，以帮助模拟、监视等。
在接下来的基本测试中，我们手动实例化这些类，并确保控制器和服务履行它们的 API 契约。

```typescript
@@filename(cats.controller.spec)
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController: CatsController;
  let catsService: CatsService;

  beforeEach(() => {
    catsService = new CatsService();
    catsController = new CatsController(catsService);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
@@switch
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController;
  let catsService;

  beforeEach(() => {
    catsService = new CatsService();
    catsController = new CatsController(catsService);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
```

> info **Hint** Keep your test files located near the classes they test.
> Testing files should have a `.spec` or `.test` suffix.

因为上面的示例很简单，所以我们并没有真正测试任何特定于 nest 的东西。
事实上，我们甚至没有使用依赖注入(注意，我们传递了一个`CatsService`的实例给`catsController`)。
这种形式的测试——我们手动实例化被测试的类——通常被称为**隔离测试**，因为它独立于框架。
让我们介绍一些更高级的功能，它们可以帮助您测试更广泛使用 Nest 特性的应用程序。

#### 测试工具

`@nestjs/testing`包提供了一组实用程序，支持更健壮的测试过程。
让我们用内置的`Test`类重写前面的例子:

```typescript
@@filename(cats.controller.spec)
import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController: CatsController;
  let catsService: CatsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
        controllers: [CatsController],
        providers: [CatsService],
      }).compile();

    catsService = moduleRef.get<CatsService>(CatsService);
    catsController = moduleRef.get<CatsController>(CatsController);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
@@switch
import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let catsController;
  let catsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
        controllers: [CatsController],
        providers: [CatsService],
      }).compile();

    catsService = moduleRef.get(CatsService);
    catsController = moduleRef.get(CatsController);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const result = ['test'];
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});
```

“Test”类在提供应用程序执行上下文时非常有用，该上下文实际上模拟了完整的 Nest 运行时，但它提供了一些钩子，使管理类实例变得容易，包括模拟和覆盖。
`Test`类有一个`createTestingModule()`方法，它接受一个模块元数据对象作为它的参数(与你传递给`@Module()`装饰器的对象相同)。
这个方法返回一个`TestingModule`实例，该实例又提供了一些方法。
对于单元测试，重要的是`compile()`方法。
这个方法引导一个模块及其依赖项(类似于传统的`main`引导应用程序的方式。使用`NestFactory.create()`)，并返回一个已准备好测试的模块。

> info **Hint** The `compile()` method is **asynchronous** and therefore has to be awaited.
> Once the module is compiled you can retrieve any **static** instance it declares (controllers and providers) using the `get()` method.

`TestingModule` inherits from the [module reference](/fundamentals/module-ref) class, and therefore its ability to dynamically resolve scoped providers (transient or request-scoped).
Do this with the `resolve()` method (the `get()` method can only retrieve static instances).

```typescript
const moduleRef = await Test.createTestingModule({
  controllers: [CatsController],
  providers: [CatsService],
}).compile();

catsService = await moduleRef.resolve(CatsService);
```

> warning **Warning** The `resolve()` method returns a unique instance of the provider, from its own **DI container sub-tree**.
> Each sub-tree has a unique context identifier.
> Thus, if you call this method more than once and compare instance references, you will see that they are not equal.

> info **Hint** Learn more about the module reference features [here](/fundamentals/module-ref).

Instead of using the production version of any provider, you can override it with a [custom provider](/fundamentals/custom-providers) for testing purposes.
For example, you can mock a database service instead of connecting to a live database.
We'll cover overrides in the next section, but they're available for unit tests as well.

#### Auto mocking

Nest 还允许您定义一个模拟工厂，以应用于所有丢失的依赖项。
这对于在一个类中有大量依赖项，并且模拟所有依赖项将花费很长时间和大量设置的情况很有用。
要利用这个特性，`createTestingModule()`需要与`useMocker()`方法连接起来，为依赖项模拟传递一个工厂。
这个工厂可以接受一个可选的令牌，这是一个实例令牌，任何对 Nest 提供程序有效的令牌，并返回一个模拟实现。
下面是一个使用[' jest-mock '](https://www.npmjs.com/package/jest-mock)创建通用 mock 和使用' jest.fn() '为' CatsService '创建特定 mock 的示例。

```typescript
const moduleMocker = new ModuleMocker(global);

describe('CatsController', () => {
  let controller: CatsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatsController],
    })
      .useMocker((token) => {
        if (token === CatsService) {
          return { findAll: jest.fn().mockResolveValue(results) };
        }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token,
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    controller = moduleRef.get(CatsController);
  });
});
```

> info **Hint** A general mock factory, like `createMock` from [`@golevelup/ts-jest`](https://github.com/golevelup/nestjs/tree/master/packages/testing) can also be passed directly.

You can also retrieve these mocks out of the testing container as you normally would custom providers, `moduleRef.get(CatsService)`.

#### 端到端测试

与单元测试(侧重于单个模块和类)不同，端到端(e2e)测试在更聚合的层次上覆盖了类和模块的交互——更接近于终端用户与生产系统的交互。
随着应用程序的增长，手动测试每个 API 端点的端到端行为变得越来越困难。
自动化的端到端测试帮助我们确保系统的整体行为是正确的，并满足项目需求。
为了执行端到端测试，我们使用了与刚刚在**单元测试**中介绍的配置类似的配置。
此外，Nest 可以很容易地使用[Supertest](https://github.com/visionmedia/supertest)库来模拟 HTTP 请求。

```typescript
@@filename(cats.e2e-spec)
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { CatsModule } from '../../src/cats/cats.module';
import { CatsService } from '../../src/cats/cats.service';
import { INestApplication } from '@nestjs/common';

describe('Cats', () => {
  let app: INestApplication;
  let catsService = { findAll: () => ['test'] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({
        data: catsService.findAll(),
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
@@switch
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { CatsModule } from '../../src/cats/cats.module';
import { CatsService } from '../../src/cats/cats.service';
import { INestApplication } from '@nestjs/common';

describe('Cats', () => {
  let app: INestApplication;
  let catsService = { findAll: () => ['test'] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({
        data: catsService.findAll(),
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

> info **Hint** If you're using [Fastify](/techniques/performance) as your HTTP adapter, it requires a slightly different configuration, and has built-in testing capabilities:
>
> ```ts
> let app: NestFastifyApplication;
>
> beforeAll(async () => {
>   app = moduleRef.createNestApplication<NestFastifyApplication>(
>     new FastifyAdapter(),
>   );
>
>   await app.init();
>   await app.getHttpAdapter().getInstance().ready();
> });
>
> it(`/GET cats`, () => {
>   return app
>     .inject({
>       method: 'GET',
>       url: '/cats',
>     })
>     .then((result) => {
>       expect(result.statusCode).toEqual(200);
>       expect(result.payload).toEqual(/* expectedPayload */);
>     });
> });
>
> afterAll(async () => {
>   await app.close();
> });
> ```

In this example, we build on some of the concepts described earlier.
In addition to the `compile()` method we used earlier, we now use the `createNestApplication()` method to instantiate a full Nest runtime environment.
We save a reference to the running app in our `app` variable so we can use it to simulate HTTP requests.

We simulate HTTP tests using the `request()` function from Supertest.
We want these HTTP requests to route to our running Nest app, so we pass the `request()` function a reference to the HTTP listener that underlies Nest (which, in turn, may be provided by the Express platform).
Hence the construction `request(app.getHttpServer())`.
The call to `request()` hands us a wrapped HTTP Server, now connected to the Nest app, which exposes methods to simulate an actual HTTP request.
For example, using `request(...).get('/cats')` will initiate a request to the Nest app that is identical to an **actual** HTTP request like `get '/cats'` coming in over the network.

In this example, we also provide an alternate (test-double) implementation of the `CatsService` which simply returns a hard-coded value that we can test for.
Use `overrideProvider()` to provide such an alternate implementation.
Similarly, Nest provides methods to override guards, interceptors, filters and pipes with the`overrideGuard()`, `overrideInterceptor()`, `overrideFilter()`, and `overridePipe()` methods respectively.

Each of the override methods returns an object with 3 different methods that mirror those described for [custom providers](https://docs.nestjs.com/fundamentals/custom-providers):

- `useClass`: you supply a class that will be instantiated to provide the instance to override the object (provider, guard, etc.).
- `useValue`: you supply an instance that will override the object.
- `useFactory`: you supply a function that returns an instance that will override the object.

Each of the override method types, in turn, returns the `TestingModule` instance, and can thus be chained with other methods in the [fluent style](https://en.wikipedia.org/wiki/Fluent_interface).
You should use `compile()` at the end of such a chain to cause Nest to instantiate and initialize the module.

Also, sometimes you may want to provide a custom logger e.g.
when the tests are run (for example, on a CI server).
Use the `setLogger()` method and pass an object that fulfills the `LoggerService` interface to instruct the `TestModuleBuilder` how to log during tests (by default, only "error" logs will be logged to the console).

The compiled module has several useful methods, as described in the following table:

<table>
  <tr>
    <td>
      <code>createNestApplication()</code>
    </td>
    <td>
      Creates and returns a Nest application (<code>INestApplication</code> instance) based on the given module.
      Note that you must manually initialize the application using the <code>init()</code> method.
    </td>
  </tr>
  <tr>
    <td>
      <code>createNestMicroservice()</code>
    </td>
    <td>
      Creates and returns a Nest microservice (<code>INestMicroservice</code> instance) based on the given module.
    </td>
  </tr>
  <tr>
    <td>
      <code>get()</code>
    </td>
    <td>
      Retrieves a static instance of a controller or provider (including guards, filters, etc.) available in the application context.
Inherited from the <a href="/fundamentals/module-ref">module reference</a> class.
    </td>
  </tr>
  <tr>
     <td>
      <code>resolve()</code>
    </td>
    <td>
      Retrieves a dynamically created scoped instance (request or transient) of a controller or provider (including guards, filters, etc.) available in the application context.
Inherited from the <a href="/fundamentals/module-ref">module reference</a> class.
    </td>
  </tr>
  <tr>
    <td>
      <code>select()</code>
    </td>
    <td>
      Navigates through the module's dependency graph; can be used to retrieve a specific instance from the selected module (used along with strict mode (<code>strict: true</code>) in <code>get()</code> method).
    </td>
  </tr>
</table>

> info **Hint** Keep your e2e test files inside the `test` directory.
> The testing files should have a `.e2e-spec` suffix.

#### 重写全局注册的增强子

如果您有一个全局注册的守卫(或管道、拦截器或过滤器)，您需要采取更多的步骤来覆盖该增强程序。
回顾一下最初的注册，看起来像这样:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
],
```

This is registering the guard as a "multi"-provider through the `APP_*` token.
To be able to replace the `JwtAuthGuard` here, the registration needs to use an existing provider in this slot:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useExisting: JwtAuthGuard,
    // ^^^^^^^^ notice the use of 'useExisting' instead of 'useClass'
  },
  JwtAuthGuard,
],
```

> info **Hint** Change the `useClass` to `useExisting` to reference a registered provider instead of having Nest instantiate it behind the token.

Now the `JwtAuthGuard` is visible to Nest as a regular provider that can be overridden when creating the `TestingModule`:

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(JwtAuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

Now all your tests will use the `MockAuthGuard` on every request.

#### 请求范围内测试实例

[request -scoped](/fundamentals/injection-scoped)提供程序是为每个传入的**请求**创建的。
在请求完成处理后，对实例进行垃圾回收。
这就产生了一个问题，因为我们不能访问专门为测试请求生成的依赖注入子树。

我们知道(基于上面的部分)`resolve()`方法可以用于检索动态实例化的类。
此外，正如<a href="https://docs.nestjs.com/fundamentals/module-ref#resolving-scoped-providers">在这里</a>，我们知道我们可以传递一个惟一的上下文标识符来控制 DI 容器子树的生命周期。
我们如何在测试环境中利用这一点?

策略是预先生成上下文标识符，并强制 Nest 使用这个特定的 ID 为所有传入请求创建子树。
通过这种方式，我们将能够检索为测试请求创建的实例。

要做到这一点，在`contextfactory`上使用`jest.spyOn()`:

```typescript
const contextId = ContextIdFactory.create();
jest
  .spyOn(ContextIdFactory, 'getByRequest')
  .mockImplementation(() => contextId);
```

Now we can use the `contextId` to access a single generated DI container sub-tree for any subsequent request.

```typescript
catsService = await moduleRef.resolve(CatsService, contextId);
```
