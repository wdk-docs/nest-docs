# CSRF 保护

跨站请求伪造(也称为 CSRF 或 XSRF)是一种恶意利用网站的类型，其中 **unauthorized** 命令由 web 应用程序信任的用户传输。
为了减轻这种攻击，您可以使用[csurf](https://github.com/expressjs/csurf)包。

## 与 Express 一起使用(默认)

首先安装所需的包:

```bash
$ npm i --save csurf
```

!!! warning

    As explained in the [`csurf` docs](https://github.com/expressjs/csurf#csurf), this middleware requires either session middleware or `cookie-parser` to be initialized first.
    Please see that documentation for further instructions.

Once the installation is complete, apply the `csurf` middleware as global middleware.

```typescript
import * as csurf from 'csurf';
// ...
// somewhere in your initialization file
app.use(csurf());
```

## 与 Fastify 一起使用

Start by installing the required package:

```bash
$ npm i --save fastify-csrf
```

Once the installation is complete, register the `fastify-csrf` plugin, as follows:

```typescript
import fastifyCsrf from 'fastify-csrf';
// ...
// somewhere in your initialization file after registering some storage plugin
app.register(fastifyCsrf);
```

!!! warning

    As explained in the `fastify-csrf` docs [here](https://github.com/fastify/fastify-csrf#usage), this plugin requires a storage plugin to be initialized first.
    Please, see that documentation for further instructions.
