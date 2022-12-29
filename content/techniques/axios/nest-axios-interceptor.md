---
title: "@narando/nest-axios-interceptor"
linkTitle: "拦截器"
weight: 2
---

> https://github.com/narando/nest-axios-interceptor

为 NestJS [HttpModule/HttpService](https://docs.nestjs.com/techniques/http-module)轻松构建和配置[axios 拦截器](https://github.com/axios/axios#interceptors)。

<p align="center">
    <a href="https://www.npmjs.com/package/@narando/nest-axios-interceptor" target="_blank"><img src="https://img.shields.io/npm/v/@narando/nest-axios-interceptor.svg" alt="NPM Version"/></a>
    <a href="https://www.npmjs.com/package/@narando/nest-axios-interceptor" target="_blank"><img src="https://img.shields.io/npm/l/@narando/nest-axios-interceptor.svg" alt="Package License"/></a>
    <a href="https://www.npmjs.com/package/@narando/nest-axios-interceptor" target="_blank"><img src="https://img.shields.io/npm/dm/@narando/nest-axios-interceptor.svg" alt="NPM Downloads"/></a>
    <a href="https://github.com/narando/nest-axios-interceptor/actions?query=workflow%3A%22CI%22" target="_blank"><img src="https://img.shields.io/github/workflow/status/narando/nest-axios-interceptor/CI/master" alt="Travis"/></a>
</p>

## 特性

- 定义 axios 拦截器
- `HttpService.axiosRef` 上的注册拦截器
- 请求配置中自定义选项的类型安全处理

## 使用

> ⚠️ 如果你想在 NestJS 版本 6 或 7 中使用@narando/nest-axios-interceptor，请使用 v1 版本。
> v2 版本只兼容 NestJS Version 8 和@nestjs/axios 包。

### 安装

安装这个模块:

```shell
$ npm i @narando/nest-axios-interceptor
```

### 创建一个 `AxiosInterceptor`

创建一个新模块并导入 `HttpModule`:

```typescript
// cats.module.ts
import { HttpModule, HttpService } from "@nestjs/axios";

@Module({
  imports: [HttpModule],
  providers: [HttpService],
})
export class CatsModule {}
```

用这个样板文件引导你的新拦截器:

```typescript
// logging.axios-interceptor.ts
import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { AxiosInterceptor, AxiosFulfilledInterceptor, AxiosRejectedInterceptor } from "@narando/nest-axios-interceptor";

@Injectable()
export class LoggingAxiosInterceptor extends AxiosInterceptor {
  constructor(httpService: HttpService) {
    super(httpService);
  }

  // requestFulfilled(): AxiosFulfilledInterceptor<AxiosRequestConfig> {}
  // requestRejected(): AxiosRejectedInterceptor {}
  // responseFulfilled(): AxiosFulfilledInterceptor<AxiosResponse> {}
  // responseRejected(): AxiosRejectedInterceptor {}
}
```

默认情况下，拦截器为所有 4 个可能的事件使用标识函数(no-op)。

要添加您的行为，覆盖您想要处理的事件的类方法，并返回一个将在拦截器中使用的函数。

```typescript
// logging.axios-interceptor.ts
@Injectable()
export class LoggingAxiosInterceptor extends AxiosInterceptor {
  constructor(httpService: HttpService) {
    super(httpService);
  }

  requestFulfilled(): AxiosFulfilledInterceptor<AxiosRequestConfig> {
    return (config) => {
      // Log outgoing request
      console.log(`Request: ${config.method} ${config.path}`);

      return config;
    };
  }

  // requestRejected(): AxiosRejectedInterceptor {}
  // responseFulfilled(): AxiosFulfilledInterceptor<AxiosResponse> {}
  // responseRejected(): AxiosRejectedInterceptor {}
}
```

### 为请求配置设置自定义选项

如果你想把数据从一个拦截器传递到另一个拦截器，把它添加到请求配置对象中。

首先，定义新的请求配置类型。为了避免与其他拦截器的冲突，我们将定义一个 Symbol，并将其用作 object 的键:

```typescript
// logging.axios-interceptor.ts
const LOGGING_CONFIG_KEY = Symbol("kLoggingAxiosInterceptor");

// Merging our custom properties with the base config
interface LoggingConfig extends AxiosRequestConfig {
  [LOGGING_CONFIG_KEY]: {
    id: number;
  };
}
```

现在我们必须更新拦截器来使用这个新的配置:

```diff
  // logging.axios-interceptor.ts
  @Injectable()
- export class LoggingAxiosInterceptor extends AxiosInterceptor {
+ export class LoggingAxiosInterceptor extends AxiosInterceptor<LoggingConfig> {
    constructor(httpService: HttpService) {
      super(httpService);
    }

-   requestFulfilled(): AxiosFulfilledInterceptor<AxiosRequestConfig> {
+   requestFulfilled(): AxiosFulfilledInterceptor<LoggingConfig> {
      return (config) => {
        // Log outgoing request
        console.log(`Request: ${config.method} ${config.path}`);

        return config;
      };
    }

    // requestRejected(): AxiosRejectedInterceptor {}
-   // responseFulfilled(): AxiosFulfilledInterceptor<AxiosResponse> {}
+   // responseFulfilled(): AxiosFulfilledInterceptor<AxiosResponseCustomConfig<LoggingConfig>> {}
    // responseRejected(): AxiosRejectedInterceptor {}
  }
```

有了更新的类型，你现在可以使用扩展配置:

```typescript
// logging.axios-interceptor.ts
const LOGGING_CONFIG_KEY = Symbol("kLoggingAxiosInterceptor");

@Injectable()
export class LoggingAxiosInterceptor extends AxiosInterceptor<LoggingConfig> {
  constructor(httpService: HttpService) {
    super(httpService);
  }

  requestFulfilled(): AxiosFulfilledInterceptor<LoggingConfig> {
    return (config) => {
      const requestId = 1234;

      config[LOGGING_CONFIG_KEY] = {
        id: requestId,
      };
      // Log outgoing request
      console.log(`Request(ID=${requestId}): ${config.method} ${config.path}`);

      return config;
    };
  }

  // requestRejected(): AxiosRejectedInterceptor {}

  responseFulfilled(): AxiosFulfilledInterceptor<AxiosResponseCustomConfig<LoggingConfig>> {
    return (response) => {
      const requestId = response.config[LOGGING_CONFIG_KEY].id;
      // Log response
      console.log(`Response(ID=${requestId}): ${response.status}`);

      return response;
    };
  }

  // responseRejected(): AxiosRejectedInterceptor {}
}
```

### 处理错误

默认情况下，axios error (rejected)拦截器传递类型为`any`的错误。这并不是很有用，因为我们不能用它做任何事情。

在内部， `axios` 将所有错误封装在一个自定义对象`AxiosError`中。我们可以使用类方法 `isAxiosError` 来断言传递的错误确实是 `AxiosError` 类型的，然后按我们想要的方式处理它:

```typescript
// logging.axios-interceptor.ts

@Injectable()
export class LoggingAxiosInterceptor extends AxiosInterceptor {
  constructor(httpService: HttpService) {
    super(httpService);
  }

  // requestFulfilled(): AxiosFulfilledInterceptor<AxiosRequestConfig> {}
  // requestRejected(): AxiosRejectedInterceptor {}
  // responseFulfilled(): AxiosFulfilledInterceptor<AxiosResponse> {}

  responseRejected(): AxiosRejectedInterceptor {
    return (err) => {
      if (this.isAxiosError(err)) {
        const { config, response } = err;

        console.log(`Error ${response.status} in request "${config.method} ${config.path}`);
      } else {
        console.error("Unexpected generic error", err);
      }

      throw err;
    };
  }
}
```

## 许可证

此存储库是在[MIT License](./License)下发布的。
