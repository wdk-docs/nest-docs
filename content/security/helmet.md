# Helmet

[Helmet](https://github.com/helmetjs/helmet)可以通过设置适当的 HTTP 头来保护你的应用程序免受一些众所周知的 web 漏洞。
通常，Helmet 只是 14 个较小的中间件函数的集合，用于设置与安全相关的 HTTP 头(请阅读[更多](https://github.com/helmetjs/helmet#how-it-works))。

!!! info "**Hint**"

    注意，将`helmet`应用为全局或注册它必须在其他调用`app.use()`或可能调用`app.use()`的 setup 函数之前。
    这是由于底层平台(即 Express 或 Fastify)的工作方式，其中中间件/路由的定义顺序很重要。
    如果你在定义路由后使用`helmet`或`cors`之类的中间件，那么该中间件将不会应用于该路由，它只会应用于路由后定义的中间件。

## 与 Express 一起使用(默认)

Start by installing the required package.

```bash
$ npm i --save helmet
```

Once the installation is complete, apply it as a global middleware.

```typescript
import * as helmet from 'helmet';
// somewhere in your initialization file
app.use(helmet());
```

!!! info "**Hint**"

    If you are getting the `This expression is not callable` error while trying to import `Helmet`, you very likely have the `allowSyntheticDefaultImports` and `esModuleInterop` options set to `true` in your project's `tsconfig.json` file.
    If that's the case, change the import statement to: `import helmet from 'helmet'` instead.

## 与 Fastify 一起使用

If you are using the `FastifyAdapter`, install the [fastify-helmet](https://github.com/fastify/fastify-helmet) package:

```bash
$ npm i --save fastify-helmet
```

[fastify-helmet](https://github.com/fastify/fastify-helmet) should not be used as a middleware, but as a [Fastify plugin](https://www.fastify.io/docs/latest/Plugins/), i.e., by using `app.register()`:

```typescript
import { fastifyHelmet } from 'fastify-helmet';
// somewhere in your initialization file
await app.register(fastifyHelmet);
```

!!! warning

    When using `apollo-server-fastify` and `fastify-helmet`, there may be a problem with [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) on the GraphQL playground, to solve this collision, configure the CSP as shown below:

    ```typescript
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            'cdn.jsdelivr.net',
            'fonts.googleapis.com',
          ],
          fontSrc: [`'self'`, 'fonts.gstatic.com'],
          imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`, `cdn.jsdelivr.net`],
        },
      },
    });
    // If you are not going to use CSP at all, you can use this:
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: false,
    });
    ```
