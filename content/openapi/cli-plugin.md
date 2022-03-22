### CLI 插件

TypeScript 的元数据反射系统有几个限制，比如，它不可能确定一个类由哪些属性组成，或者识别一个给定的属性是可选的还是必需的。
但是，其中一些约束可以在编译时解决。
Nest 提供了一个增强 TypeScript 编译过程的插件，以减少所需样板代码的数量。

> info **Hint** 这个插件是**opt-in**。
> 如果愿意，可以手动声明所有的 decorator，或者只在需要它们的地方声明特定的 decorator。

#### 概述

Swagger 插件将自动:

- 用`@ApiProperty`注释所有的 DTO 属性，除非使用`@ApiHideProperty`
- 根据问号设置“`required`”属性(例如:`name?:string`将设置`required:false`)
- 根据类型设置`type`或`enum`属性(也支持数组)
- 根据指定的默认值设置`default`属性
- 设置几个基于`class-validator`装饰器的验证规则(如果`classValidatorShim`设置为`true`)
- 向每个端点添加一个具有适当状态和`type`的响应装饰器(响应模型)
- 基于注释生成属性和端点的描述(如果`introspeccomments`设置为`true`)
- 根据注释为属性生成示例值(如果`introspeccomments`设置为`true`)

请注意，你的文件名**必须**以下后缀之一:`['.dto.ts'， '.entity.ts']`(例如，`create-user.dto.ts`)，才能被插件分析。

如果你使用了一个不同的后缀，你可以通过指定`dtoFileNameSuffix`选项来调整插件的行为(见下文)。

以前，如果你想提供与 Swagger UI 的交互体验，你必须复制大量的代码，让包知道你的模型/组件应该如何在规范中声明。
例如，你可以像下面这样定义一个简单的 CreateUserDto 类:

```typescript
export class CreateUserDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty({ enum: RoleEnum, default: [], isArray: true })
  roles: RoleEnum[] = [];

  @ApiProperty({ required: false, default: true })
  isEnabled?: boolean = true;
}
```

虽然对于中等规模的项目来说这不是一个大问题，但是一旦你有一大堆的类，它就会变得冗长并且难以维护。

通过启用 Swagger 插件，上面的类定义可以简单地声明:

```typescript
export class CreateUserDto {
  email: string;
  password: string;
  roles: RoleEnum[] = [];
  isEnabled?: boolean = true;
}
```

该插件根据**抽象语法树**动态添加适当的装饰器。
这样你就不必在代码中纠结于`@ApiProperty`装饰器了。

> info **Hint** 插件会自动生成任何丢失的 swagger 属性，但如果你需要重写它们，你只需通过`@ApiProperty()`显式地设置它们。

#### 注释内省

启用注释内省功能后，CLI 插件将根据注释生成描述和属性示例值。

例如，给定一个 `roles` 属性示例:

```typescript
/**
 * A list of user's roles
 * @example ['admin']
 */
@ApiProperty({
  description: `A list of user's roles`,
  example: ['admin'],
})
roles: RoleEnum[] = [];
```

描述和示例值都必须重复。
启用`introspectComments`后，CLI 插件可以提取这些注释，并自动为属性提供描述(如果定义了示例)。
现在，上面的属性可以简单地声明如下:

```typescript
/**
 * A list of user's roles
 * @example ['admin']
 */
roles: RoleEnum[] = [];
```

有`dtoKeyOfComment` 和 `controllerKeyOfComment`插件选项，你可以使用它们来定制插件将如何分别为`ApiProperty` 和 `ApiOperation`装饰器设置值。
看看下面的例子:

```typescript
export class SomeController {
  /**
   * Create some resource
   */
  @Post()
  create() {}
}
```

默认情况下，这些选项设置为`"description"`。
这意味着插件将`"Create some resource"`分配给`ApiOperation`操作符上的`description`键。
像这样:

```ts
@ApiOperation({ description: "Create some resource" })
```

> info **Hint** 对于模型，同样的逻辑适用于`ApiProperty`装饰器。

#### 使用 CLI 插件

要启用插件，打开`nest-cli.json`(如果你使用 [Nest CLI](/cli/overview))，并添加以下`plugins`配置:

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": ["@nestjs/swagger"]
  }
}
```

你可以使用 `options` 属性来定制插件的行为。

```javascript
"plugins": [
  {
    "name": "@nestjs/swagger",
    "options": {
      "classValidatorShim": false,
      "introspectComments": true
    }
  }
]
```

`options`属性必须满足以下接口:

```typescript
export interface PluginOptions {
  dtoFileNameSuffix?: string[];
  controllerFileNameSuffix?: string[];
  classValidatorShim?: boolean;
  dtoKeyOfComment?: string;
  controllerKeyOfComment?: string;
  introspectComments?: boolean;
}
```

<table>
  <tr>
    <th>选项</th>
    <th>默认</th>
    <th>描述</th>
  </tr>
  <tr>
    <td><code>dtoFileNameSuffix</code></td>
    <td><code>['.dto.ts', '.entity.ts']</code></td>
    <td>DTO(数据传输对象)文件后缀</td>
  </tr>
  <tr>
    <td><code>controllerFileNameSuffix</code></td>
    <td><code>.controller.ts</code></td>
    <td>控制器文件后缀</td>
  </tr>
  <tr>
    <td><code>classValidatorShim</code></td>
    <td><code>true</code></td>
    <td>如果设置为true，模块将重用 `class-validator` 验证装饰器(例如: `@Max(10)` 将在模式定义中添加 `max: 10`)</td>
  </tr>
  <tr>
    <td><code>dtoKeyOfComment</code></td>
    <td><code>'description'</code></td>
    <td>属性键用来设置`ApiProperty`上的注释文本。</td>
  </tr>
  <tr>
    <td><code>controllerKeyOfComment</code></td>
    <td><code>'description'</code></td>
    <td>在`ApiOperation`上设置注释文本的属性键。</td>
  </tr>
  <tr>
  <td><code>introspectComments</code></td>
    <td><code>false</code></td>
    <td>如果设置为`true`，插件将根据注释生成属性的描述和示例值</td>
  </tr>
</table>

如果你不使用 CLI，而是有一个自定义的`webpack`配置，你可以结合`ts-loader`使用这个插件:

```javascript
getCustomTransformers: (program: any) => ({
  before: [require('@nestjs/swagger/plugin').before({}, program)]
}),
```

#### 与`ts-jest`集成(端到端测试)

要运行端到端测试，`ts-jest`会在内存中动态编译源代码文件。
这意味着，它不使用 Nest CLI 编译器，也不应用任何插件或执行 AST 转换。

要启用插件，请在 e2e 测试目录中创建以下文件:

```javascript
const transformer = require('@nestjs/swagger/plugin');

module.exports.name = 'nestjs-swagger-transformer';
// you should change the version number anytime you change the configuration below - otherwise, jest will not detect changes
module.exports.version = 1;

module.exports.factory = (cs) => {
  return transformer.before(
    {
      // @nestjs/swagger/plugin options (can be empty)
    },
    cs.program, // "cs.tsCompiler.program" for older versions of Jest (<= v27)
  );
};
```

完成这些之后，在`jest`配置文件中导入 AST 转换器。
默认情况下(在 starter 应用程序中)，e2e 测试配置文件位于`test`文件夹下，命名为`jest-e2e.json`。

```json
{
  ...
// other configuration
  "globals": {
    "ts-jest": {
      "astTransformers": {
        "before": ["<path to the file created above>"],
      }
    }
  }
}
```

#### “jest”故障排除(端到端测试)

In case `jest` does not seem to pick up your configuration changes, it's possible that Jest has already **cached** the build result.
To apply the new configuration, you need to clear Jest's cache directory.

To clear the cache directory, run the following command in your NestJS project folder:

```bash
$ npx jest --clearCache
```

In case the automatic cache clearance fails, you can still manually remove the cache folder with the following commands:

```bash
# Find jest cache directory (usually /tmp/jest_rs)
# by running the following command in your NestJS project root
$ npx jest --showConfig | grep cache
# ex result:
#   "cache": true,
#   "cacheDirectory": "/tmp/jest_rs"

# Remove or empty the Jest cache directory
$ rm -rf  <cacheDirectory value>
# ex:
# rm -rf /tmp/jest_rs
```
