### 循环依赖

当两个类相互依赖时，就会发生循环依赖。
例如，A 类需要 B 类，B 类也需要 A 类。
在 Nest 中，模块之间和提供者之间可能会出现循环依赖。

尽管应该尽可能避免循环依赖关系，但不能总是这样做。
在这种情况下，Nest 支持以两种方式解析提供者之间的循环依赖项。
在本章中，我们描述了使用**前向引用**作为一种技术，以及使用**ModuleRef**类从 DI 容器中检索提供者实例作为另一种技术。

我们还描述了如何解析模块之间的循环依赖关系。

> warning **Warning** A circular dependency might also be caused when using "barrel files"/index.ts files to group imports.
> Barrel files should be omitted when it comes to module/provider classes.
> For example, barrel files should not be used when importing files within the same directory as the barrel file, i.e.
> `cats/cats.controller` should not import `cats` to import the `cats/cats.service` file.
> For more details please also see [this github issue](https://github.com/nestjs/nest/issues/1181#issuecomment-430197191).

#### 向前引用

前向引用允许 Nest 引用尚未使用' forwardRef() '实用函数定义的类。
例如，如果' CatsService '和' CommonService '相互依赖，关系的双方都可以使用' @Inject() '和' forwardRef() '工具来解决循环依赖。
否则 Nest 将不会实例化它们，因为所有的基本元数据都将不可用。
这里有一个例子:

```typescript
@@filename(cats.service)
@Injectable()
export class CatsService {
  constructor(
    @Inject(forwardRef(() => CommonService))
    private commonService: CommonService,
  ) {}
}
@@switch
@Injectable()
@Dependencies(forwardRef(() => CommonService))
export class CatsService {
  constructor(commonService) {
    this.commonService = commonService;
  }
}
```

> info **Hint** The `forwardRef()` function is imported from the `@nestjs/common` package.

That covers one side of the relationship.
Now let's do the same with `CommonService`:

```typescript
@@filename(common.service)
@Injectable()
export class CommonService {
  constructor(
    @Inject(forwardRef(() => CatsService))
    private catsService: CatsService,
  ) {}
}
@@switch
@Injectable()
@Dependencies(forwardRef(() => CatsService))
export class CommonService {
  constructor(catsService) {
    this.catsService = catsService;
  }
}
```

> warning **Warning** The order of instantiation is indeterminate.
> Make sure your code does not depend on which constructor is called first.

#### ModuleRef 类替代

使用“forwardRef()”的另一种选择是重构你的代码，并使用“ModuleRef”类来检索(否则)循环关系的一边的提供者。
了解更多关于' ModuleRef '实用程序类的信息[这里](/fundamentals/module-ref)。

#### 模块向前引用

为了解决模块之间的循环依赖关系，在模块关联的两边都使用相同的' forwardRef() '实用函数。
例如:

```typescript
@@filename(common.module)
@Module({
  imports: [forwardRef(() => CatsModule)],
})
export class CommonModule {}
```
