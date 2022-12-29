---
title: "介绍使用内置记录器和TypeORM进行日志记录"
linkTitle: "日志介绍"
weight: 50
---

随着应用程序的发展，越来越多的人开始依赖它。
在这样的时刻，确保我们的 API 正常工作是至关重要的。
为此，我们可以使用一种方法对应用程序进行故障排除，以检测异常，并能够找到异常的来源。
本文介绍了如何记录应用程序中发生的事情。

## 内置到 NestJS 中的 Logger

幸运的是，NestJS 自带了一个内置的日志记录器。
在使用它之前，我们应该创建它的实例。

posts.service.ts

```ts
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export default class PostsService {
  private readonly logger = new Logger(PostsService.name);

  // ...
}
```

虽然我们可以直接使用从`@nestjs/common`导入的 Logger，但为每个服务创建一个全新的实例是一个很好的实践，它允许我们为 Logger 的构造函数提供服务的名称。

### 日志级别

Logger 的一个关键之处在于它带有一些方法:

- error
- warn
- log
- verbose
- debug

上述方法对应于我们可以为应用程序配置的日志级别。

main.ts

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import getLogLevels from "./utils/getLogLevels";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: getLogLevels(process.env.NODE_ENV === "production"),
  });

  // ...
}
bootstrap();
```

> 我们没有使用上面的 `ConfigService` 来读取环境变量，因为它还没有初始化。

getLogLevels.ts

```ts
import { LogLevel } from "@nestjs/common/services/logger.service";

function getLogLevels(isProduction: boolean): LogLevel[] {
  if (isProduction) {
    return ["log", "warn", "error"];
  }
  return ["error", "warn", "log", "verbose", "debug"];
}

export default getLogLevels;
```

由于上述设置，调试和详细方法不会在生产环境中产生日志。

> 如果我们看一下 [isLogLevelEnabled](https://github.com/nestjs/nest/blob/90ebd6825754fbd9d007ed3b873da782c75e9be7/packages/common/services/utils/is-log-level-enabled.util.ts) 函数，我们会注意到提供`['debug']`会打开所有日志级别，而不仅仅是详细日志级别。
> 这是因为 NestJS 假设，如果要显示详细日志，还需要显示所有较低级别的日志。
> 因此，`['debug']`与`['error', 'warn', 'log', 'verbose', 'debug']`相同。
>
> 我们可以在[这里](https://github.com/nestjs/nest/blob/90ebd6825754fbd9d007ed3b873da782c75e9be7/packages/common/services/console-logger.service.ts#L19)找到每个日志级别的重要性。

在完成上述所有工作之后，让我们开始使用记录器。

posts.service.ts

```ts
import { Injectable, Logger } from "@nestjs/common";
import Post from "./post.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import PostNotFoundException from "./exceptions/postNotFound.exception";

@Injectable()
export default class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>
  ) {}

  async getPostById(id: number) {
    const post = await this.postsRepository.findOne(id, { relations: ["author"] });
    if (post) {
      return post;
    }
    this.logger.warn("Tried to access a post that does not exist");
    throw new PostNotFoundException(id);
  }

  // ...
}
```

![](https://wanago.io/wp-content/uploads/2021/10/Screenshot-from-2021-10-02-17-48-20.png)

现在我们可以看到，传递 `PostsService.name` 导致 `PostService` 作为日志消息的前缀出现。

## 在中间件中使用日志记录器

尽管上述方法可能很方便，但手动编写日志消息可能很麻烦。
幸运的是，我们可以从中间件生成日志。

logs.middleware.ts

```ts
import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
class LogsMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction) {
    response.on("finish", () => {
      const { method, originalUrl } = request;
      const { statusCode, statusMessage } = response;

      const message = `${method} ${originalUrl} ${statusCode} ${statusMessage}`;

      if (statusCode >= 500) {
        return this.logger.error(message);
      }

      if (statusCode >= 400) {
        return this.logger.warn(message);
      }

      return this.logger.log(message);
    });

    next();
  }
}

export default LogsMiddleware;
```

> 查看 [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) 文档以阅读更多关于 HTTP 响应状态码的信息。

在上面，我们收集了关于请求和响应的信息，并根据状态代码对其进行日志记录。
当然，请求和响应对象包含更多有用的信息，所以您可以随意编写更详细的日志。

最后一步是为我们所有的路由应用我们的中间件。

app.module.ts

```ts
import { MiddlewareConsumer, Module } from "@nestjs/common";
import { PostsModule } from "./posts/posts.module";
import { DatabaseModule } from "./database/database.module";
import LogsMiddleware from "./utils/logs.middleware";

@Module({
  imports: [
    PostsModule,
    DatabaseModule,
    // ...
  ],
  // ...
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogsMiddleware).forRoutes("*");
  }
}
```

![](https://wanago.io/wp-content/uploads/2021/10/Screenshot-from-2021-10-03-17-44-35.png)

## 使用 TypeORM 记录器

我们可以做的另一件有用的事情是记录应用程序中发生的所有 SQL 查询。
为了实现 TypeORM，我们需要实现 Logger 接口:

databaseLogger.ts

```ts
import { Logger as TypeOrmLogger } from "typeorm";
import { Logger as NestLogger } from "@nestjs/common";

class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger("SQL");

  logQuery(query: string, parameters?: unknown[]) {
    this.logger.log(`${query} -- Parameters: ${this.stringifyParameters(parameters)}`);
  }

  logQueryError(error: string, query: string, parameters?: unknown[]) {
    this.logger.error(`${query} -- Parameters: ${this.stringifyParameters(parameters)} -- ${error}`);
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]) {
    this.logger.warn(`Time: ${time} -- Parameters: ${this.stringifyParameters(parameters)} -- ${query}`);
  }

  logMigration(message: string) {
    this.logger.log(message);
  }

  logSchemaBuild(message: string) {
    this.logger.log(message);
  }

  log(level: "log" | "info" | "warn", message: string) {
    if (level === "log") {
      return this.logger.log(message);
    }
    if (level === "info") {
      return this.logger.debug(message);
    }
    if (level === "warn") {
      return this.logger.warn(message);
    }
  }

  private stringifyParameters(parameters?: unknown[]) {
    try {
      return JSON.stringify(parameters);
    } catch {
      return "";
    }
  }
}

export default DatabaseLogger;
```

The last step is to use the above class in our TypeORM configuration:

database.module.ts

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import DatabaseLogger from "./databaseLogger";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        logger: new DatabaseLogger(),
        host: configService.get("POSTGRES_HOST"),
        // ...
      }),
    }),
  ],
})
export class DatabaseModule {}
```

当我们开始查看来自 TypeORM 的日志时，我们注意到它经常产生相当长的查询。
例如，当我们检索试图登录的用户的数据时，会发生下面的查询:

## 将日志保存到 PostgreSQL 数据库中

到目前为止，我们只将所有消息记录到控制台。
虽然在我们的机器上开发应用程序时，这可能工作得很好，但在已部署的应用程序中，这没有多大意义。
有很多服务可以帮助我们收集和管理日志，比如 DataDog 和 Loggly。
不过，它们不是免费的。
因此，在本文中，我们将日志保存到 PostgreSQL 数据库中。

首先，让我们为我们的日志创建一个实体:

log.entity.ts

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class Log {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public context: string;

  @Column()
  public message: string;

  @Column()
  public level: string;

  @CreateDateColumn()
  creationDate: Date;
}

export default Log;
```

Above, we use the `@CreateDateColum` decorator.
If you want to know more about dates in PostgreSQL, check out Managing date and time with PostgreSQL and TypeORM

Once we’ve got the above done, let’s create a service that allows us to create logs:

logs.service.ts

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Log from "./log.entity";
import CreateLogDto from "./dto/createLog.dto";

@Injectable()
export default class LogsService {
  constructor(
    @InjectRepository(Log)
    private logsRepository: Repository<Log>
  ) {}

  async createLog(log: CreateLogDto) {
    const newLog = await this.logsRepository.create(log);
    await this.logsRepository.save(newLog, {
      data: {
        isCreatingLogs: true,
      },
    });
    return newLog;
  }
}
```

Above, you can notice that we pass isCreatingLogs: true when saving our logs to the database.
The above is because we need to overcome the issue of an infinite loop.
When we store logs in the database, it causes SQL queries to be logged.
When we log SQL queries, they are saved to the database, causing an infinite loop.
Because of that, we need to adjust our DatabaseLogger slightly:

databaseLogger.ts

```ts
import { Logger as TypeOrmLogger, QueryRunner } from "typeorm";
import { Logger as NestLogger } from "@nestjs/common";

class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger("SQL");

  logQuery(query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    if (queryRunner?.data?.isCreatingLogs) {
      return;
    }
    this.logger.log(`${query} -- Parameters: ${this.stringifyParameters(parameters)}`);
  }
  logQueryError(error: string, query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    if (queryRunner?.data?.isCreatingLogs) {
      return;
    }
    this.logger.error(`${query} -- Parameters: ${this.stringifyParameters(parameters)} -- ${error}`);
  }
  logQuerySlow(time: number, query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    if (queryRunner?.data?.isCreatingLogs) {
      return;
    }
    this.logger.warn(`Time: ${time} -- Parameters: ${this.stringifyParameters(parameters)} -- ${query}`);
  }
  logMigration(message: string) {
    this.logger.log(message);
  }
  logSchemaBuild(message: string) {
    this.logger.log(message);
  }
  log(level: "log" | "info" | "warn", message: string, queryRunner?: QueryRunner) {
    if (queryRunner?.data?.isCreatingLogs) {
      return;
    }
    if (level === "log") {
      return this.logger.log(message);
    }
    if (level === "info") {
      return this.logger.debug(message);
    }
    if (level === "warn") {
      return this.logger.warn(message);
    }
  }
  private stringifyParameters(parameters?: unknown[]) {
    try {
      return JSON.stringify(parameters);
    } catch {
      return "";
    }
  }
}

export default DatabaseLogger;
```

Above, we don’t log SQL queries if they are involved in creating logs.

Now we need to extend the logger built into NestJS and use the LogsService:

customLogger.ts

```ts
import { Injectable, ConsoleLogger } from "@nestjs/common";
import { ConsoleLoggerOptions } from "@nestjs/common/services/console-logger.service";
import { ConfigService } from "@nestjs/config";
import getLogLevels from "../utils/getLogLevels";
import LogsService from "./logs.service";

@Injectable()
class CustomLogger extends ConsoleLogger {
  private readonly logsService: LogsService;

  constructor(context: string, options: ConsoleLoggerOptions, configService: ConfigService, logsService: LogsService) {
    const environment = configService.get("NODE_ENV");

    super(context, {
      ...options,
      logLevels: getLogLevels(environment === "production"),
    });

    this.logsService = logsService;
  }

  log(message: string, context?: string) {
    super.log.apply(this, [message, context]);

    this.logsService.createLog({
      message,
      context,
      level: "log",
    });
  }
  error(message: string, stack?: string, context?: string) {
    super.error.apply(this, [message, stack, context]);

    this.logsService.createLog({
      message,
      context,
      level: "error",
    });
  }
  warn(message: string, context?: string) {
    super.warn.apply(this, [message, context]);

    this.logsService.createLog({
      message,
      context,
      level: "error",
    });
  }
  debug(message: string, context?: string) {
    super.debug.apply(this, [message, context]);

    this.logsService.createLog({
      message,
      context,
      level: "error",
    });
  }
  verbose(message: string, context?: string) {
    super.debug.apply(this, [message, context]);

    this.logsService.createLog({
      message,
      context,
      level: "error",
    });
  }
}

export default CustomLogger;
```

We also need to create the LoggerModule so that we can add it into our AppModule:

logger.module.ts

```ts
import { Module } from "@nestjs/common";
import CustomLogger from "./customLogger";
import { ConfigModule } from "@nestjs/config";
import LogsService from "./logs.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import Log from "./log.entity";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Log])],
  providers: [CustomLogger, LogsService],
  exports: [CustomLogger],
})
export class LoggerModule {}
```

最后一步是调用 useLogger 方法，将我们的自定义记录器注入到应用程序中:

main.ts

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import CustomLogger from "./logger/customLogger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(CustomLogger));

  // ...
}
bootstrap();
```

我们可以将一些数据存储在单独的列中。
例如，我们可以使用 HTTP 方法来查询日志，只查找 POST 请求。

## 总结

在本文中，我们已经了解了使用 NestJS 和 TypeORM 进行日志记录的基础知识。
我们已经了解了各种日志级别，以及如何直接和通过中间件记录消息。
我们还学习了如何将日志保存到 SQL 数据库中。
这样做有一些好处。
例如，我们可以在单独的列中存储更多的数据，并在查询数据时使用它们。

即使将日志保存到 SQL 数据库中有一些优势，但如果日志很多，性能可能不是最好的。
此外，它可能会填满我们数据库的可用空间。
因此，研究诸如 DataDog 和 Loggly 这样的服务可能是个好主意。
不过，这是另一篇文章的主题，请继续关注!
