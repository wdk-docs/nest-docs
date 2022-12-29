# 全局前缀

使用 INestApplication 实例的 `setGlobalPrefix()` 方法为 HTTP 应用中注册的 **每个路由** 设置前缀。

```typescript
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('v1');
```

你可以使用以下结构从全局前缀中排除路由:

```typescript
app.setGlobalPrefix('v1', {
  exclude: [{ path: 'health', method: RequestMethod.GET }],
});
```

或者，你可以将 route 指定为一个字符串(它将应用于每个请求方法):

```typescript
app.setGlobalPrefix('v1', { exclude: ['cats'] });
```
