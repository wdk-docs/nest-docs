### 配置

应用程序通常在不同的**环境**中运行。
根据环境的不同，应该使用不同的配置设置。
例如，本地环境通常依赖于特定的数据库凭据，这些凭据仅对本地 DB 实例有效。
生产环境将使用一组单独的 DB 凭证。
由于配置变量的变化，最佳实践是在环境中[存储配置变量](https://12factor.net/config)。

外部定义的环境变量可以通过`process.env`全局变量在 Node.js 中可见。
我们可以通过在每个环境中分别设置环境变量来尝试解决多个环境的问题。
这很快就会变得笨拙不堪，特别是在开发和测试环境中，这些值需要很容易地被模仿和/或更改。
在 Node.js 应用程序中，通常使用`.env`文件，保存键-值对，其中每个键代表一个特定的值，以表示每个环境。

在不同的环境中运行应用程序只是交换正确的`.env`文件的问题。

在 Nest 中使用这种技术的一个好方法是创建一个`ConfigModule`来公开一个`ConfigService`来加载适当的`env`文件。
虽然你可以选择自己编写这样一个模块，但为了方便起见，Nest 提供了现成的`@nestjs/config`包。
我们将在本章中讨论这个包。

#### 安装

要开始使用它，我们首先安装所需的依赖项。

```bash
$ npm i --save @nestjs/config
```

> info **Hint** `@nestjs/config`包内部使用[dotenv](https://github.com/motdotla/dotenv).

> warning **Note** `@nestjs/config` 需要 TypeScript 4.1 或更高版本。

#### 开始

一旦安装过程完成，我们可以导入`ConfigModule`。
通常，我们会把它导入根模块 AppModule，并使用静态方法`forRoot()`来控制它的行为。
在此步骤中，将解析和解决环境变量键/值对。
稍后，我们将在其他特性模块中看到访问`ConfigModule`类的`ConfigService`类的几个选项。

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}
```

上面的代码将从默认位置(项目根目录)加载并解析一个`.env`文件，将`.env`文件中的键/值对与分配给`processenv`的环境变量合并，并将结果存储在一个私有结构中，你可以通过`ConfigService`访问该结构。
`forRoot()`方法注册了`ConfigService`提供程序，后者提供了一个`get()`方法来读取这些解析/合并的配置变量。
由于`@nestjs/config`依赖于[dotenv](https://github.com/motdotla/dotenv)，它使用该包的规则来解决环境变量名称中的冲突。
当一个键同时存在于运行时环境中作为一个环境变量(例如，通过 OS shell 导出，如`export DATABASE_USER=test`)和一个`.env`文件中时，运行时环境变量优先。

一个示例`.env`文件看起来像这样:

```json
DATABASE_USER=test
DATABASE_PASSWORD=test
```

#### 自定义环境文件路径

默认情况下，包会在应用程序的根目录中查找`.env`文件。
要为`.env`文件指定另一个路径，请设置传递给`forRoot()`的(可选)选项对象的`envFilePath`属性，如下所示:

```typescript
ConfigModule.forRoot({
  envFilePath: '.development.env',
});
```

你也可以像这样为`.env`文件指定多个路径:

```typescript
ConfigModule.forRoot({
  envFilePath: ['.env.development.local', '.env.development'],
});
```

如果在多个文件中找到一个变量，则第一个变量优先。

#### 禁用环境变量加载

如果你不想加载`.env`文件，而是想简单地从运行环境中访问环境变量(就像操作系统 shell 导出`export DATABASE_USER=test`一样)，设置选项对象的`ignoreEnvFile`属性为`true`，如下所示:

```typescript
ConfigModule.forRoot({
  ignoreEnvFile: true,
});
```

#### 在全局范围内使用模块

当你想在其他模块中使用`ConfigModule`时，你需要导入它(这是任何 Nest 模块的标准配置)。
或者，通过设置 options 对象的`isGlobal`属性为`true`，将其声明为[global 模块](https://docs.nestjs.com/modules#global-modules)，如下所示。
在这种情况下，一旦 `ConfigModule` 被加载到根模块中(例如，`AppModule`)，你就不需要在其他模块中导入它了。

```typescript
ConfigModule.forRoot({
  isGlobal: true,
});
```

#### 自定义配置文件

对于更复杂的项目，您可以利用自定义配置文件来返回嵌套的配置对象。
这允许您按功能对相关的配置设置分组(例如，与数据库相关的设置)，并将相关的设置存储在单个文件中，以帮助独立地管理它们。

自定义配置文件导出一个返回配置对象的工厂函数。
配置对象可以是任意嵌套的普通 JavaScript 对象。
`process.env`对象将包含完全解析的环境变量键/值对(与`.env`文件和外部定义的变量解析并合并，如[上面](techniques/configuration#getting-started))所述。
因为您控制返回的配置对象，所以您可以添加任何必需的逻辑来将值强制转换为适当的类型，设置默认值，等等... 例如:

```typescript
@@filename(config/configuration)
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432
  }
});
```

我们使用传递给`ConfigModule.forRoot()`方法的 options 对象的`load`属性来加载这个文件:

```typescript
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
  ],
})
export class AppModule {}
```

> info **Notice** `load`属性的值是一个数组，允许你加载多个配置文件 (如... `load: [databaseConfig, authConfig]`)

使用自定义配置文件，我们还可以管理自定义文件，如 YAML 文件。
下面是一个使用 YAML 格式的配置示例:

```yaml
http:
  host: 'localhost'
  port: 8080

db:
  postgres:
    url: 'localhost'
    port: 5432
    database: 'yaml-db'

  sqlite:
    database: 'sqlite.db'
```

要读取和解析 YAML 文件，我们可以利用`js-yaml`包。

```bash
$ npm i js-yaml
$ npm i -D @types/js-yaml
```

一旦安装了这个包，我们使用`yaml#load`函数来加载我们刚才创建的 yaml 文件。

```typescript
@@filename(config/configuration)
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export default () => {
  return yaml.load(
    readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;
};
```

> warning **Note** 在构建过程中，Nest CLI 不会自动移动你的"assets"(非 ts 文件)到`dist`文件夹。 为了确保你的 YAML 文件被复制，你必须在`nest-clijson`文件中的`compilerOptions#assets`对象中指定这一点。 例如，如果`config`文件夹和`src`文件夹在同一级别，添加“compilerOptions#assets”值为 `"assets": [{{ '{' }}"include": "../config/*.yaml", "outDir": "./dist/config"{{ '}' }}]`. 阅读更多(在这里)(/cli/monorepo#assets).

#### 使用 `ConfigService`

要从`ConfigService`中访问配置值，我们首先需要注入`ConfigService`。
与任何提供商一样，我们需要将其包含的模块- ConfigModule -导入到将要使用它的模块中(除非你将传递给`ConfigModule.forroot()`方法的选项对象中的`isGlobal`属性设置为`true`)。
将其导入特性模块中，如下所示。

```typescript
@@filename(feature.module)
@Module({
  imports: [ConfigModule],
  // ...
})
```

然后我们可以使用标准构造函数注入来注入它:

```typescript
constructor(private configService: ConfigService) {}
```

> info **Hint** ConfigService 是从`@nestjs/config`包中导入的。

在我们的类上使用它:

```typescript
// get an environment variable
const dbUser = this.configService.get<string>('DATABASE_USER');

// get a custom configuration value
const dbHost = this.configService.get<string>('database.host');
```

如上所示，使用`configService.get()`方法通过传递变量名来获取一个简单的环境变量。
你可以通过传递类型来做 TypeScript 类型提示，如上所示(例如，`get<string>(…)`)。
`get()`方法也可以遍历嵌套的自定义配置对象(通过[自定义配置文件](techniques/configuration#custom-configuration-files)创建)，如上面的第二个例子所示。

你也可以使用一个接口作为类型提示来获得整个嵌套的自定义配置对象:

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
}

const dbConfig = this.configService.get<DatabaseConfig>('database');

// you can now use `dbConfig.port` and `dbConfig.host`
const port = dbConfig.port;
```

`get()`方法还接受一个可选的第二个参数，它定义了一个默认值，当键不存在时将返回这个默认值，如下所示:

```typescript
// use "localhost" when "database.host" is not defined
const dbHost = this.configService.get<string>('database.host', 'localhost');
```

`ConfigService`有两个可选的泛型(类型参数)。
第一个是帮助防止访问不存在的配置属性。如下图所示:

```typescript
interface EnvironmentVariables {
  PORT: number;
  TIMEOUT: string;
}

// somewhere in the code
constructor(private configService: ConfigService<EnvironmentVariables>) {
  const port = this.configService.get('PORT', { infer: true });

  // TypeScript Error: this is invalid as the URL property is not defined in EnvironmentVariables
  const url = this.configService.get('URL', { infer: true });
}
```

当`infer`属性设置为`true`时，`ConfigService#get`方法将根据接口自动推断属性类型，举个例子,`typeof port === "number"`(如果你没有在 TypeScript 中使用' strictNullChecks '标志)因为`PORT`在`EnvironmentVariables`接口中有一个`number`类型。

同样，使用`infer`特性，你可以推断嵌套的自定义配置对象的属性的类型，即使使用点符号，如下所示:

```typescript
constructor(private configService: ConfigService<{ database: { host: string } }>) {
  const dbHost = this.configService.get('database.host', { infer: true })!;
  // typeof dbHost === "string"                                          |
  //                                                                     +--> non-null assertion operator
}
```

第二个泛型依赖于第一个泛型，作为一个类型断言，以消除当`strictNullChecks`打开时`ConfigService`的方法可以返回的所有`undefined`类型。例如:

```typescript
// ...
constructor(private configService: ConfigService<{ PORT: number }, true>) {
  //                                                               ^^^^
  const port = this.configService.get('PORT', { infer: true });
  //    ^^^ The type of port will be 'number' thus you don't need TS type assertions anymore
}
```

#### 配置名称空间

ConfigModule 允许你定义和加载多个自定义配置文件，如上面[自定义配置文件](techniques/configuration#custom-configuration-files)所示。
您可以使用嵌套的配置对象管理复杂的配置对象层次结构，如该部分所示。
或者，你可以用`registerAs()`函数返回一个"命名空间"的配置对象，如下所示:

```typescript
@@filename(config/database.config)
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 5432
}));
```

与自定义配置文件一样，在你的`registerAs()`工厂函数中，`process.env`对象将包含完全解析的环境变量键/值对(与`.env`文件和外部定义的变量解析和合并，如[上面](techniques/configuration#gettingstarted)所述。

> info **Hint** `registerAs`函数是从`@nestjs/config`包导出的。

用`forRoot()`方法的 options 对象的`load`属性加载有命名空间的配置，就像你加载自定义配置文件一样:

```typescript
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
  ],
})
export class AppModule {}
```

现在，要从`database`名称空间获取`host`值，请使用点表示法。
使用`database`作为属性名的前缀，对应于命名空间的名称(作为`registerAs()`函数的第一个参数传递):

```typescript
const dbHost = this.configService.get<string>('database.host');
```

一个合理的替代方法是直接注入`database`名称空间。这让我们可以从强类型中获益:

```typescript
constructor(
  @Inject(databaseConfig.KEY)
  private dbConfig: ConfigType<typeof databaseConfig>,
) {}
```

> info **Hint** ConfigType 是从`@nestjs/config`包中导出的。

#### 缓存环境变量

由于访问`process.env`可能很慢，你可以设置传递给`ConfigModule.forRoot()`的选项对象的`cache`属性来提高`ConfigService#get`方法的性能，当它存储在`process.env`中的变量时。

```typescript
ConfigModule.forRoot({
  cache: true,
});
```

#### 部分注册

到目前为止，我们已经在根模块(例如`AppModule`)中处理了配置文件，使用的是`forRoot()`方法。
也许您有一个更复杂的项目结构，特性特定的配置文件位于多个不同的目录中。  
`@nestjs/config`包提供了一个名为**部分注册**的特性，它只引用与每个特性模块相关的配置文件，而不是将所有这些文件加载到根模块中。
在特性模块中使用`forFeature()`静态方法来执行部分注册，如下所示:

```typescript
import databaseConfig from './config/database.config';

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
})
export class DatabaseModule {}
```

> info **Warning** 在某些情况下，您可能需要使用`onModuleInit()`钩子访问通过部分注册加载的属性，而不是在构造函数中。这是因为`forFeature()`方法是在模块初始化期间运行的，模块初始化的顺序是不确定的。如果在构造函数中访问另一个模块以这种方式加载的值，则配置所依赖的模块可能还没有初始化。`onModuleInit()`方法只有在它依赖的所有模块都被初始化后才会运行，所以这种技术是安全的。

#### 模式验证

如果没有提供所需的环境变量，或者它们不符合某些验证规则，那么在应用程序启动期间抛出异常是标准的做法。`@nestjs/config`包可以通过两种不同的方式来实现:

- [Joi](https://github.com/sideway/joi)内置验证器。使用 Joi，您可以定义一个对象模式，并根据它验证 JavaScript 对象。
- 一个自定义的`validate()`函数，它接受环境变量作为输入。

要使用 Joi，我们必须安装 Joi 包:

```bash
$ npm install --save joi
```

> warning **Notice** “joi”的最新版本要求您运行的是 Node v12 或更高版本。对于较老版本的节点，请安装`v16.1.8`。这主要是在“v17.0.2”发布之后，它会在构建时导致错误。更多信息，请参考他们的[17.0.0 发布说明](https://github.com/sideway/joi/issues/2262)。

现在我们可以定义一个 Joi 验证模式，并通过`forRoot()`方法的 options 对象的`validationSchema`属性传递它，如下所示:

```typescript
@@filename(app.module)
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
      }),
    }),
  ],
})
export class AppModule {}
```

默认情况下，所有模式键都被认为是可选的。
在这里，我们为`NODE_ENV`和`PORT`设置了默认值，如果我们在环境('.env'文件或进程环境)中不提供这些变量，将使用它们。
或者，我们可以使用`required()`验证方法来要求一个值必须定义在环境中(`.env`文件或进程环境)。
在这种情况下，如果我们不提供环境中的变量，验证步骤将抛出一个异常。
有关如何构造验证模式的更多信息，请参见[Joi 验证方法](https://joi.dev/api/?v=17.3.0#example)。

默认情况下，允许未知的环境变量(其键不在模式中出现的环境变量)，并且不会触发验证异常。
缺省情况下，报告所有验证错误。
你可以通过`forRoot()`选项对象的`validationOptions`键传递一个选项对象来改变这些行为。
这个选项对象可以包含由[Joi validation options](https://joi.dev/api/?v=17.3.0#anyvalidatevalue-options)提供的任何标准验证选项属性。
例如，要反转上面的两个设置，可以这样传递选项:

```typescript
@@filename(app.module)
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
      }),
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
  ],
})
export class AppModule {}
```

`@nestjs/config`包使用默认设置:

- `allowUnknown`: 控制环境变量中是否允许未知键。默认是`true`
- `abortEarly`: 如果`true`，在第一个错误时停止验证;如果为`fals`e，返回所有错误。默认为`false`。

请注意，一旦你决定传递一个`validationOptions`对象，任何你没有显式传递的设置将默认为`Joi`标准默认值(而不是`@nestjs/config`默认值)。
例如，如果你在你的自定义`validationOptions`对象中未指定`allowUnknowns`，它的`Joi`默认值为`false`。
因此，在你的自定义对象中同时指定这**两个**设置可能是最安全的。

#### 自定义验证函数

或者，你可以指定一个**同步** `validate`函数，该函数接受一个包含环境变量的对象(来自 env 文件和进程)，并返回一个包含已验证环境变量的对象，这样你可以在需要时对它们进行转换/修改。
如果函数抛出错误，它将阻止应用程序引导。

在本例中，我们将继续使用`class-transformer` and `class-validator` 包。首先，我们必须定义:

- 一个有验证约束的类，
- 使用`plainToClass`和`validateSync`函数的验证函数。

```typescript
@@filename(env.validation)
import { plainToClass } from 'class-transformer';
import { IsEnum, IsNumber, validateSync } from 'class-validator';

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
  Provision = "provision",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

在这里，使用`validate`函数作为`ConfigModule`的配置选项，如下所示:

```typescript
@@filename(app.module)
import { validate } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
    }),
  ],
})
export class AppModule {}
```

<app-banner-shop></app-banner-shop>

#### 定制的 getter 函数

`ConfigService`定义了一个通用的`get()`方法来按键检索配置值。
我们还可以添加`getter`函数来实现更自然的编码风格:

```typescript
@@filename()
@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  get isAuthEnabled(): boolean {
    return this.configService.get('AUTH_ENABLED') === 'true';
  }
}
@@switch
@Dependencies(ConfigService)
@Injectable()
export class ApiConfigService {
  constructor(configService) {
    this.configService = configService;
  }

  get isAuthEnabled() {
    return this.configService.get('AUTH_ENABLED') === 'true';
  }
}
```

现在我们可以像下面这样使用 getter 函数:

```typescript
@@filename(app.service)
@Injectable()
export class AppService {
  constructor(apiConfigService: ApiConfigService) {
    if (apiConfigService.isAuthEnabled) {
      // Authentication is enabled
    }
  }
}
@@switch
@Dependencies(ApiConfigService)
@Injectable()
export class AppService {
  constructor(apiConfigService) {
    if (apiConfigService.isAuthEnabled) {
      // Authentication is enabled
    }
  }
}
```

#### 可扩展的变量

`@nestjs/config`包支持环境变量扩展。
使用这种技术，您可以创建嵌套的环境变量，其中一个变量在另一个变量的定义中被引用。
例如:

```json
APP_URL=mywebsite.com
SUPPORT_EMAIL=support@${APP_URL}
```

在这个构造中，变量`SUPPORT_EMAIL`解析为`'support@mywebsite.com'`。注意`${{ '{' }}...{{ '}' }}`语法触发解析`SUPPORT_EMAIL`定义中的变量`APP_URL`的值。

> info **Hint** 对于这个特性，`@nestjs/config`包内部使用[dotenv-expand](https://github.com/motdotla/dotenv-expand)。

在传递给`ConfigModule`的`forRoot()`方法的 options 对象中，使用`expandVariables`属性启用环境变量展开，如下所示:

```typescript
@@filename(app.module)
@Module({
  imports: [
    ConfigModule.forRoot({
      // ...
      expandVariables: true,
    }),
  ],
})
export class AppModule {}
```

#### 在`main.ts`中使用

虽然我们的配置存储在服务中，但它仍然可以在`main.ts`文件中使用。这样，您就可以使用它来存储诸如应用程序端口或 CORS 主机之类的变量。
要访问它，你必须使用`app.get()`方法，后面跟着服务引用:

```typescript
const configService = app.get(ConfigService);
```

然后你可以像往常一样使用它，通过使用配置键调用`get`方法:

```typescript
const port = configService.get('PORT');
```
