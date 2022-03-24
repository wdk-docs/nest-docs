### HTTPS

要创建一个使用 HTTPS 协议的应用程序，在传递给' `NestFactory` '类的' `create()` '方法的 `options` 对象中设置' `httpOptions` '属性:

```typescript
const httpsOptions = {
  key: fs.readFileSync('./secrets/private-key.pem'),
  cert: fs.readFileSync('./secrets/public-certificate.pem'),
};
const app = await NestFactory.create(AppModule, {
  httpsOptions,
});
await app.listen(3000);
```

If you use the `FastifyAdapter`, create the application as follows:

```typescript
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ https: httpsOptions }),
);
```

#### 多个同步服务器

下面的菜谱展示了如何实例化一个同时侦听多个端口(例如，侦听非 HTTPS 端口和 HTTPS 端口)的 Nest 应用程序。

```typescript
const httpsOptions = {
  key: fs.readFileSync('./secrets/private-key.pem'),
  cert: fs.readFileSync('./secrets/public-certificate.pem'),
};

const server = express();
const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
await app.init();

http.createServer(server).listen(3000);
https.createServer(httpsOptions, server).listen(443);
```

> info **Hint** The `ExpressAdapter` is imported from the `@nestjs/platform-express` package. The `http` and `https` packages are native Node.js packages.

> **Warning** This recipe does not work with [GraphQL Subscriptions](/graphql/subscriptions).
