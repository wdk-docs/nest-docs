# 常见的错误

在使用 NestJS 开发过程中，您可能会在学习框架时遇到各种错误。

## "Cannot resolve dependency" error

可能最常见的错误消息是关于 Nest 无法解析提供器的依赖关系。
错误信息通常是这样的:

```bash
Nest can't resolve dependencies of the <provider> (?).
Please make sure that the argument <unknown_token> at index [<index>] is available in the <module> context.

Potential solutions:
- If <unknown_token> is a provider, is it part of the current <module>?
- If <unknown_token> is exported from a separate @Module, is that module imported within <module>?
  @Module({
    imports: [ /* the Module containing <unknown_token> */ ]
  })
```

这个错误最常见的罪魁祸首是在模块的 `providers` 数组中没有包含 `provider` 。
请确保该提供器确实在 `providers` 数组中，并遵循[标准的 NestJS 提供器实践](/fundamentals/custom-providers#di-fundamentals)。

这里有一些常见的陷阱。
一种是将提供器放在一个 `imports` 数组中。
如果是这种情况，该错误将包含提供程序的名称，而 `<module>` 应该包含在其中。

如果你在开发过程中遇到这个错误，请查看错误消息中提到的模块，并查看它的`provider`。
对于 `providers` 数组中的每个提供器，确保模块能够访问所有的依赖项。
通常情况下，“提供器”会在“特性模块”和“根模块”中重复，这意味着 Nest 会尝试两次实例化该提供器。
更有可能的是，包含被复制的`provider`的模块应该被添加到“根模块”的`imports`数组中。

如果上面的 `unknown_token` 是字符串 `dependency` ，你可能会有一个循环文件导入。
这与下面的[圆形依赖](./errors.md#circular-dependency-error)不同，因为它不是让提供程序在它们的构造函数中相互依赖，而是意味着两个文件最终会互相导入。
常见的情况是，模块文件声明令牌并导入提供器，提供器从模块文件导入令牌常量。
如果您正在使用 barrel 文件，请确保您的 barrel 导入也不会最终创建这些循环导入。

## "Circular dependency" error

偶尔你会发现在你的应用程序中很难避免[circular dependencies](/fundamentals/circular-dependency)。
您需要采取一些步骤来帮助 Nest 解决这些问题。
由循环依赖引起的错误如下所示:

```bash
Nest cannot create the <module> instance.
The module at index [<index>] of the <module> "imports" array is undefined.

Potential causes:
- A circular dependency between modules.
Use forwardRef() to avoid it.
Read more: https://docs.nestjs.com/fundamentals/circular-dependency
- The module at index [<index>] is of type "undefined".
Check your import statements and the type of the module.

Scope [<module_import_chain>]
# example chain AppModule -> FooModule
```

循环依赖可能产生于两个相互依赖的提供者，或者 typescript 文件彼此依赖于常量，比如从模块文件导出常量，然后导入到服务文件中。
在后一种情况下，建议为常量创建一个单独的文件。
在前一种情况下，请遵循循环依赖的指南，并确保模块 **和** 提供商都被标记为`forwardRef`。

## 调试依赖性错误

除了手动验证你的依赖项是否正确之外，在 Nest 8.1.0 版本中，
你可以将环境变量`NEST_DEBUG`设置为一个解析为 `true` 的字符串，并在 Nest 解析应用程序的所有依赖项时获得额外的日志信息。

<figure><img src="/assets/injector_logs.png" /></figure>

在上图中，黄色的字符串是被注入依赖的宿主类，蓝色的字符串是被注入依赖的名称，或者它的注入令牌，紫色的字符串是正在搜索依赖的模块。
使用这个，你通常可以追踪到依赖解析发生了什么以及为什么你会遇到依赖注入问题。
