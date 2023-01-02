# 循环依赖

当两个类相互依赖时，就会发生循环依赖。
例如，A 类需要 B 类，B 类也需要 A 类。
在 Nest 中，模块之间和提供器之间可能会出现循环依赖。

尽管应该尽可能避免循环依赖关系，但不能总是这样做。
在这种情况下，Nest 支持以两种方式解析提供器之间的循环依赖项。
在本章中，我们描述了使用 **前向引用** 作为一种技术，以及使用 **ModuleRef** 类从 DI 容器中检索提供器实例作为另一种技术。

我们还描述了如何解析模块之间的循环依赖关系。

!!! Warning "**Warning**"

    当使用"barrel files"/index.ts文件进行分组导入时，也可能引起循环依赖关系。
    对于模块/提供商类，应省略桶文件。
    例如，在与桶文件相同的目录中导入文件时，不应使用桶文件。
    `cats/cats.controller` 不应该导入 `cats` 来导入 `cats/cats.service`文件。
    有关更多详细信息，请参见[此GitHub问题](https://github.com/nestjs/nest/issues/1181#issuecomment-430197191).

## 向前引用

前向引用允许 Nest 引用尚未使用 `forwardRef()` 实用函数定义的类。
例如，如果 `CatsService` 和 `CommonService` 相互依赖，关系的双方都可以使用 `@Inject()` 和 `forwardRef()` 工具来解决循环依赖。
否则 Nest 将不会实例化它们，因为所有的基本元数据都将不可用。
这里有一个例子:

=== "cats.service.ts"

    ```typescript hl_lines="5"
    @Injectable()
    export class CatsService {
      constructor(
        @Inject(forwardRef(() => CommonService))
        private commonService: CommonService,
      ) {}
    }
    ```

=== "cats.service.js"

    ```js linenums="1" hl_lines="2"
    @Injectable()
    @Dependencies(forwardRef(() => CommonService))
    export class CatsService {
      constructor(commonService) {
        this.commonService = commonService;
      }
    }
    ```

!!! info "`forwardRef()`函数是从`@nestjs/common`软件包导入的。"

这只是双方关系的一个方面。
现在让我们对`CommonService`做同样的事情:

=== "common.service.ts"

    ```typescript hl_lines="5"
    @Injectable()
    export class CommonService {
      constructor(
        @Inject(forwardRef(() => CatsService))
        private catsService: CatsService,
      ) {}
    }
    ```

=== "common.service.js"

    ```js hl_lines="2"
    @Injectable()
    @Dependencies(forwardRef(() => CatsService))
    export class CommonService {
      constructor(catsService) {
        this.catsService = catsService;
      }
    }
    ```

!!! warning "**Warning**"

    实例化顺序是不确定的。
    确保您的代码不取决于首先调用哪个构造函数。

## ModuleRef 类替代

使用`forwardRef()`的另一种选择是重构你的代码，并使用`ModuleRef`类来检索(否则)循环关系的一边的提供器。
了解更多关于 `ModuleRef` 实用程序类的信息[这里](/fundamentals/module-ref)。

## 模块向前引用

为了解决模块之间的循环依赖关系，在模块关联的两边都使用相同的 `forwardRef()` 实用函数。例如:

```typescript title="common.module" hl_lines="2"
@Module({
  imports: [forwardRef(() => CatsModule)],
})
export class CommonModule {}
```
