### 模块引用

Nest 提供了`ModuleRef`类来导航提供器的内部列表，并使用其注入令牌作为查找键来获取对任何提供器的引用。
`ModuleRef`类还提供了一种方法来动态实例化静态和限定作用域的提供器。
`ModuleRef`可以通过正常的方式注入到类中:

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(private moduleRef: ModuleRef) {}
}
@@switch
@Injectable()
@Dependencies(ModuleRef)
export class CatsService {
  constructor(moduleRef) {
    this.moduleRef = moduleRef;
  }
}
```

> info **Hint** `ModuleRef`类是从`@nestjs/core`包导入的。

#### 检索实例

`ModuleRef`实例(以后我们将把它称为**模块引用**)有一个`get()`方法。
这个方法使用注入令牌/类名来获取存在于**current**模块中(已被实例化)的提供器、控制器或可注入对象(例如，守卫、拦截器等)。

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService implements OnModuleInit {
  private service: Service;
  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.service = this.moduleRef.get(Service);
  }
}
@@switch
@Injectable()
@Dependencies(ModuleRef)
export class CatsService {
  constructor(moduleRef) {
    this.moduleRef = moduleRef;
  }

  onModuleInit() {
    this.service = this.moduleRef.get(Service);
  }
}
```

> warning **Warning** `get()`方法不能检索作用域的提供器(瞬态或请求作用域)。
> 相反，使用[下面](https://docs.nestjs.com/fundamentals/module-ref#resolving-scoped-providers)描述的技术。
> [此处](/fundamentals/injection-scopes)学习如何控制作用域.

要从全局上下文中检索提供器(例如，如果提供器已被注入到不同的模块中)，将 `{{ '{' }} strict: false {{ '}' }}` 选项作为第二个参数传递给 `get()`。

```typescript
this.moduleRef.get(Service, { strict: false });
```

#### 解决作用域内的提供器

要动态解析作用域的提供器(瞬态或请求作用域)，请使用`resolve()`方法，并将提供器的注入令牌作为参数传递。

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService implements OnModuleInit {
  private transientService: TransientService;
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.transientService = await this.moduleRef.resolve(TransientService);
  }
}
@@switch
@Injectable()
@Dependencies(ModuleRef)
export class CatsService {
  constructor(moduleRef) {
    this.moduleRef = moduleRef;
  }

  async onModuleInit() {
    this.transientService = await this.moduleRef.resolve(TransientService);
  }
}
```

`resolve()`方法从它自己的**DI 容器子树**中返回提供器的唯一实例。
每个子树都有一个惟一的上下文标**识符**。
因此，如果多次调用该方法并比较实例引用，就会发现它们是不相等的。

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    const transientServices = await Promise.all([
      this.moduleRef.resolve(TransientService),
      this.moduleRef.resolve(TransientService),
    ]);
    console.log(transientServices[0] === transientServices[1]); // false
  }
}
@@switch
@Injectable()
@Dependencies(ModuleRef)
export class CatsService {
  constructor(moduleRef) {
    this.moduleRef = moduleRef;
  }

  async onModuleInit() {
    const transientServices = await Promise.all([
      this.moduleRef.resolve(TransientService),
      this.moduleRef.resolve(TransientService),
    ]);
    console.log(transientServices[0] === transientServices[1]); // false
  }
}
```

要跨多个`resolve()`调用生成单个实例，并确保它们共享生成的 DI 容器子树，可以将上下文标识符传递给`resolve()`方法。
使用`contextfactory`类来生成上下文标识符。
该类提供了一个`create()`方法，该方法返回一个适当的惟一标识符。

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    const contextId = ContextIdFactory.create();
    const transientServices = await Promise.all([
      this.moduleRef.resolve(TransientService, contextId),
      this.moduleRef.resolve(TransientService, contextId),
    ]);
    console.log(transientServices[0] === transientServices[1]); // true
  }
}
@@switch
@Injectable()
@Dependencies(ModuleRef)
export class CatsService {
  constructor(moduleRef) {
    this.moduleRef = moduleRef;
  }

  async onModuleInit() {
    const contextId = ContextIdFactory.create();
    const transientServices = await Promise.all([
      this.moduleRef.resolve(TransientService, contextId),
      this.moduleRef.resolve(TransientService, contextId),
    ]);
    console.log(transientServices[0] === transientServices[1]); // true
  }
}
```

> info **Hint** `contextfactory`类是从`@nestjs/core`包中导入的。

#### 注册请求的提供器

手动生成的上下文标识符(使用`contextfactory.create()`)表示 DI 子树，其中`REQUEST`提供器是`undefined`，因为它们没有被 Nest 依赖注入系统实例化和管理。

要为手动创建的 DI 子树注册一个自定义的`REQUEST`对象，请使用`ModuleRef#registerRequestByContextId()`方法，如下所示:

```typescript
const contextId = ContextIdFactory.create();
this.moduleRef.registerRequestByContextId(/* YOUR_REQUEST_OBJECT */, contextId);
```

#### 获得当前子树

有时，您可能希望在**请求**上下文中解析请求作用域的提供器的实例。
假设`CatsService`是请求作用域的，您希望解析`CatsRepository`实例，该实例也被标记为请求作用域的提供器。
为了共享相同的 DI 容器子树，你必须获取当前的上下文标识符，而不是生成一个新的上下文标识符(例如，使用`contextfactory.create()`函数，如上所示)。
要获得当前的上下文标识符，首先使用`@Inject()`装饰器注入请求对象。

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(
    @Inject(REQUEST) private request: Record<string, unknown>,
  ) {}
}
@@switch
@Injectable()
@Dependencies(REQUEST)
export class CatsService {
  constructor(request) {
    this.request = request;
  }
}
```

> info **Hint** 了解关于请求提供器的更多信息[此处](https://docs.nestjs.com/fundamentals/injection-scopes#request-provider).

现在，使用`contextfactory`类的`getByRequest()`方法创建一个基于请求对象的上下文 id，并将其传递给`resolve()`调用:

```typescript
const contextId = ContextIdFactory.getByRequest(this.request);
const catsRepository = await this.moduleRef.resolve(CatsRepository, contextId);
```

#### 动态实例化自定义类

要动态实例化一个之前没有注册为提供器的类，请使用模块引用的`create()`方法。

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService implements OnModuleInit {
  private catsFactory: CatsFactory;
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.catsFactory = await this.moduleRef.create(CatsFactory);
  }
}
@@switch
@Injectable()
@Dependencies(ModuleRef)
export class CatsService {
  constructor(moduleRef) {
    this.moduleRef = moduleRef;
  }

  async onModuleInit() {
    this.catsFactory = await this.moduleRef.create(CatsFactory);
  }
}
```

这种技术使您能够在框架容器之外有条件地实例化不同的类。
