# NEST REDIS 模块

## @liaoliaots/nestjs-redis

## 关于该项目

### 特征

- **Both redis & cluster are supported**: You can also specify multiple instances.
- **Health**: Checks health of **redis & cluster** server.
- **Rigorously tested**: With 100+ tests and 100% code coverage.
- **Decorators**: Injects **redis & cluster** clients via `@InjectRedis()`, `@InjectCluster()`.
- **Services**: Retrieves **redis & cluster** clients via `RedisService`, `ClusterService`.
- **Testing**: Generates an injection token via `getRedisToken`, `getClusterToken`.

## 入门

### 先决条件

This lib requires **Node.js >=12.22.0**, **NestJS ^9.0.0**, **ioredis ^5.0.0**.

- If you depend on **ioredis 4**, please use [version 7](https://github.com/liaoliaots/nestjs-redis/tree/v7.0.0) of the lib.
- If you depend on **ioredis 5**, **NestJS 7** or **8**, please use [version 8](https://github.com/liaoliaots/nestjs-redis/tree/v8.2.2) of the lib.

### 安装

```sh
# with npm
npm install @liaoliaots/nestjs-redis ioredis
# with yarn
yarn add @liaoliaots/nestjs-redis ioredis
# with pnpm
pnpm add @liaoliaots/nestjs-redis ioredis
```

## 用法

- [Redis](./usage.md)

  - [Usage](./usage.md)
  - [Configuration](./usage.md#configuration)
  - [Testing](./usage.md#testing)
  - [Non-Global](./usage.md#non-global)
  - [Auto-reconnect](https://luin.github.io/ioredis/interfaces/CommonRedisOptions.html#retryStrategy)
  - [Unix domain socket](./usage.md#unix-domain-socket)

- [Cluster](/docs/latest/cluster.md)

  - [Usage](/docs/latest/cluster.md)
  - [Configuration](/docs/latest/cluster.md#configuration)
  - [Testing](/docs/latest/cluster.md#testing)
  - [Non-Global](/docs/latest/cluster.md#non-global)
  - [Auto-reconnect](https://luin.github.io/ioredis/interfaces/ClusterOptions.html#clusterRetryStrategy)

- [Health Checks](/packages/redis-health/README.md)
- [Examples](/docs/latest/examples.md)

  - [Redis Sentinel](/docs/latest/examples.md#sentinel)

### 遗产

- version 7, [click here](/docs/v7)
- version 8, [click here](/docs/v8)

## 常见问题解答

### 循环依赖性 ⚠️

[A circular dependency](https://docs.nestjs.com/fundamentals/circular-dependency) might also be caused when using "barrel files"/index.ts files to group imports. Barrel files should be omitted when it comes to module/provider classes. For example, barrel files should not be used when importing files within the same directory as the barrel file, i.e. `cats/cats.controller` should not import `cats` to import the `cats/cats.service` file. For more details please also see [this github issue](https://github.com/nestjs/nest/issues/1181#issuecomment-430197191).

### "Cannot resolve dependency" error

If you encountered an error like this:

```
Nest can't resolve dependencies of the <provider> (?). Please make sure that the argument <unknown_token> at index [<index>] is available in the <module> context.

Potential solutions:
- If <unknown_token> is a provider, is it part of the current <module>?
- If <unknown_token> is exported from a separate @Module, is that module imported within <module>?
  @Module({
    imports: [ /* the Module containing <unknown_token> */ ]
  })
```

Please make sure that the `RedisModule` is added directly to the `imports` array of `@Module()` decorator of "Root Module"(if `isGlobal` is true) or "Feature Module"(if `isGlobal` is false).

Examples of code:

```ts
// redis-config.service.ts
import { Injectable } from '@nestjs/common';
import {
  RedisModuleOptions,
  RedisOptionsFactory,
} from '@liaoliaots/nestjs-redis';

@Injectable()
export class RedisConfigService implements RedisOptionsFactory {
  createRedisOptions(): RedisModuleOptions {
    return {
      readyLog: true,
      config: {
        host: 'localhost',
        port: 6379,
        password: 'authpassword',
      },
    };
  }
}
```

#### ✅ 正确的

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { RedisConfigService } from './redis-config.service';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useClass: RedisConfigService,
    }),
  ],
})
export class AppModule {}
```

#### ❌ 不正确

```ts
// my-redis.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { RedisConfigService } from './redis-config.service';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useClass: RedisConfigService,
    }),
  ],
})
export class MyRedisModule {}
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { MyRedisModule } from './my-redis.module';

@Module({
  imports: [MyRedisModule],
})
export class AppModule {}
```

## 测试覆盖范围

| Statements                                                                                                | Branches                                                                                              | Functions                                                                                               | Lines                                                                                           |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/statements-100%25-brightgreen.svg?style=flat-square&logo=jest) | ![Branches](https://img.shields.io/badge/branches-100%25-brightgreen.svg?style=flat-square&logo=jest) | ![Functions](https://img.shields.io/badge/functions-100%25-brightgreen.svg?style=flat-square&logo=jest) | ![Lines](https://img.shields.io/badge/lines-100%25-brightgreen.svg?style=flat-square&logo=jest) |
