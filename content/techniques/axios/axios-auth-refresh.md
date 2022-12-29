---
title: "axios-auth-refresh"
linkTitle: "认证刷新"
weight: 3
---

> https://github.com/Flyrell/axios-auth-refresh

![Package version](https://img.shields.io/npm/v/axios-auth-refresh?label=version)
![Package size](https://img.shields.io/bundlephobia/min/axios-auth-refresh)
![Package downloads](https://img.shields.io/npm/dm/axios-auth-refresh)
![Package types definitions](https://img.shields.io/npm/types/axios-auth-refresh)

帮助您通过 axios [interceptors](https://github.com/axios/axios#interceptors)实现自动刷新授权的库。
当原始请求失败时，您可以轻松地拦截它，刷新授权并继续原始请求，而不需要任何用户交互。

当请求由于授权而失败时，将发生什么完全取决于您。
您可以为新的授权令牌运行刷新调用，也可以运行自定义逻辑。

在等待新的授权令牌时，插件将暂停已进入的其他请求，并在新令牌可用时解析它们。

## 安装

使用[npm](https://www.npmjs.com/get-npm)或[yarn](https://yarnpkg.com/en/docs/install):

```bash
npm install axios-auth-refresh --save
# or
yarn add axios-auth-refresh
```

## 语法

```typescript
createAuthRefreshInterceptor(
    axios: AxiosInstance,
    refreshAuthLogic: (failedRequest: any) => Promise<any>,
    options: AxiosAuthRefreshOptions = {}
): number;
```

#### 参数

- `axios` - Axios 的实例
- `refreshAuthLogic` - 一个用于刷新授权的函数(**必须返回一个承诺**)。
  只接受一个参数，即原始调用返回的' failedRequest '。
- `options` - 对象的拦截器设置(参见[可用选项](#available-options))

#### 返回

拦截器`id`，以防你想手动拒绝它。

## 使用

为了激活拦截器，您需要从*默认导出*的`axios-auth-refresh`导入一个函数，并使用想要拦截器的**axios 实例**调用它，以及需要编写刷新授权逻辑的**刷新授权函数**。

然后拦截器将被绑定到 axios 实例上，当从服务器(或您在选项中提供的任何其他状态代码)返回[401 (Unauthorized)](https://httpstatuses.com/401)状态代码时，指定的逻辑就会运行。
在 refreshAuthLogic 处理期间创建的所有新请求都将被绑定到从 refreshAuthLogic 函数返回的 Promise 上。这意味着当获取新的访问令牌或刷新逻辑失败时，请求将得到解决。

```javascript
import axios from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";

// Function that will be called to refresh authorization
const refreshAuthLogic = (failedRequest) =>
  axios.post("https://www.example.com/auth/token/refresh").then((tokenRefreshResponse) => {
    localStorage.setItem("token", tokenRefreshResponse.data.token);
    failedRequest.response.config.headers["Authorization"] = "Bearer " + tokenRefreshResponse.data.token;
    return Promise.resolve();
  });

// Instantiate the interceptor
createAuthRefreshInterceptor(axios, refreshAuthLogic);

// Make a call. If it returns a 401 error, the refreshAuthLogic will be run,
// and the request retried with the new token
axios.get("https://www.example.com/restricted/area").then(/* ... */).catch(/* ... */);
```

#### 跳过拦截器

:warning: 由于错误[axios#2295](https://github.com/axios/axios/issues/2295)不支持 v0.19.0。 :warning:

:white_check_mark: 这个问题已经修复，将在 axios v0.19.1 中发布

对于特定的调用，有可能跳过拦截器的逻辑。
要做到这一点，你需要为每个你不想拦截的请求传递`skipAuthRefresh`选项到请求配置。

```javascript
axios.get("https://www.example.com/", { skipAuthRefresh: true });
```

如果你使用的是 TypeScript，你可以从`axios-auth-refresh`中导入自定义请求配置接口。

```typescript
import { AxiosAuthRefreshRequestConfig } from "axios-auth-refresh";
```

#### 请求拦截器

由于这个插件会在刷新令牌的同时自动停止其他请求，所以将请求逻辑**包装在一个函数中**是一个好主意，以确保暂停的请求使用了新获取的数据(比如令牌)。

发送令牌的示例:

```javascript
// Obtain the fresh token each time the function is called
function getAccessToken() {
  return localStorage.getItem("token");
}

// Use interceptor to inject the token to requests
axios.interceptors.request.use((request) => {
  request.headers["Authorization"] = `Bearer ${getAccessToken()}`;
  return request;
});
```

## 可用选项

#### 要拦截的状态代码

您可以指定多个希望拦截器运行的状态代码。

```javascript
{
  statusCodes: [401, 403]; // default: [ 401 ]
}
```

#### 自定义拦截逻辑

您可以指定多个希望拦截器运行的状态代码。

```javascript
{
  shouldRefresh: (error) => error?.response?.data?.business_error_code === 100385;
}
```

#### 停止请求的重试实例

您可以指定用于重试停止的请求的实例。
默认值为`undefined`，并使用传递给`createAuthRefreshInterceptor`函数的实例。

```javascript
{
  retryInstance: someAxiosInstance; // default: undefined
}
```

#### `onRetry` 在发送停止的请求之前回调

你可以指定`onRetry`回调，它将在每个暂停的请求被调用之前，使用请求配置对象调用。

```javascript
{
  onRetry: (requestConfig) => ({ ...requestConfig, baseURL: "" }); // default: undefined
}
```

#### 在“刷新逻辑”运行时暂停实例

当您的刷新逻辑运行时，拦截器将为每个返回指定的`options.statusCodes`之一的请求(默认为 HTTP 401)触发。

为了防止拦截器循环(当你的刷新逻辑由于`options.statusCodes`中指定的任何状态代码而失败时)，你需要在`refreshAuthLogic`函数内的刷新调用中使用[`skipAuthRefresh`](#skip-the-interceptor)标志。

如果您的刷新逻辑不进行任何调用，您应该考虑在初始化拦截器时使用以下标志，以便在刷新挂起时暂停整个 axios 实例。
这将防止拦截器对每个失败的请求运行。

```javascript
{
  pauseInstanceWhileRefreshing: true; // default: false
}
```

#### 拦截网络错误

当返回一个 HTTP 401 Unauthorized 响应时，一些 CORS api 可能不会返回 CORS 响应头。
在这种情况下，浏览器将无法读取响应头来确定响应状态代码。

要拦截*any*网络错误，启用`interceptNetworkError`选项。

CAUTION: 这应该作为最后的手段。如果此方法用于处理带有 HTTP 401 响应的不支持 CORS 的 API，则重试逻辑可以测试尝试刷新身份验证的网络连通性。

```javascript
{
  interceptNetworkError: true; // default: undefined
}
```

### 库的其他用途

这个库还被用于:

- 自动请求节流[@amcsi](https://github.com/amcsi)
- Google2FA 的 OTP 挑战[@LeoniePhiline](https://github.com/LeoniePhiline)

你把它用在别的地方了吗?用你的用例创建一个公共关系来分享它。

---

### 更新日志

- **v3.1.0**

  - axios v0.21.1 支持
  - `interceptNetworkError` . See [#133](https://github.com/Flyrell/axios-auth-refresh/issues/133).

- **v3.0.0**
  - `skipWhileRefresh` flag has been deprecated due to its unclear name and its logic has been moved to `pauseInstanceWhileRefreshing` flag
  - `pauseInstanceWhileRefreshing` is set to `false` by default

---

#### 想要帮助吗?

查看[贡献指南](CONTRIBUTING.md)或我的[patreon page!](https://www.patreon.com/dawidzbinski)

---

#### 特别感谢[JetBrains](https://www.jetbrains.com/?from=axios-auth-refresh)为我们的库提供了 IDE

<a href="https://www.jetbrains.com/?from=axios-auth-refresh" title="Link to JetBrains"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/JetBrains_Logo_2016.svg/128px-JetBrains_Logo_2016.svg.png" alt="JetBrains"></a>
