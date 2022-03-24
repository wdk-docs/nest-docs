### 请求生命周期

Nest 应用程序处理请求并按照我们所说的**请求生命周期**的顺序产生响应。
使用中间件、管道、守卫和拦截器，在请求生命周期中追踪特定代码的执行位置可能会很困难，特别是当全局、控制器级和路由级组件开始发挥作用时。
通常，一个请求通过中间件流到守卫，然后到拦截器，然后到管道，最后返回到返回路径上的拦截器(在生成响应时)。

#### Middleware

Middleware is executed in a particular sequence.
First, Nest runs globally bound middleware (such as middleware bound with `app.use`) and then it runs [module bound middleware](/middleware), which are determined on paths.
Middleware are run sequentially in the order they are bound, similar to the way middleware in Express works.
In the case of middleware bound across different modules, the middleware bound to the root module will run first, and then middleware will run in the order that the modules are added to the imports array.

#### Guards

Guard execution starts with global guards, then proceeds to controller guards, and finally to route guards.
As with middleware, guards run in the order in which they are bound.
For example:

```typescript
@UseGuards(Guard1, Guard2)
@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @UseGuards(Guard3)
  @Get()
  getCats(): Cats[] {
    return this.catsService.getCats();
  }
}
```

`Guard1` will execute before `Guard2` and both will execute before `Guard3`.

> info **Hint** When speaking about globally bound vs controller or locally bound, the difference is where the guard (or other component is bound).
> If you are using `app.useGlobalGuard()` or providing the component via a module, it is globally bound.
> Otherwise, it is bound to a controller if the decorator precedes a controller class, or to a route if the decorator proceeds a route declaration.

#### Interceptors

Interceptors, for the most part, follow the same pattern as guards, with one catch: as interceptors return [RxJS Observables](https://github.com/ReactiveX/rxjs), the observables will be resolved in a first in last out manner.
So inbound requests will go through the standard global, controller, route level resolution, but the response side of the request (i.e., after returning from the controller method handler) will be resolved from route to controller to global.
Also, any errors thrown by pipes, controllers, or services can be read in the `catchError` operator of an interceptor.

#### Pipes

Pipes follow the standard global to controller to route bound sequence, with the same first in first out in regards to the `@usePipes()` parameters.
However, at a route parameter level, if you have multiple pipes running, they will run in the order of the last parameter with a pipe to the first.
This also applies to the route level and controller level pipes.
For example, if we have the following controller:

```typescript
@UsePipes(GeneralValidationPipe)
@Controller('cats')
export class CatsController {
  constructor(private catsService: CatsService) {}

  @UsePipes(RouteSpecificPipe)
  @Patch(':id')
  updateCat(
    @Body() body: UpdateCatDTO,
    @Param() params: UpdateCatParams,
    @Query() query: UpdateCatQuery,
  ) {
    return this.catsService.updateCat(body, params, query);
  }
}
```

then the `GeneralValidationPipe` will run for the `query`, then the `params`, and then the `body` objects before moving on to the `RouteSpecificPipe`, which follows the same order.
If any parameter-specific pipes were in place, they would run (again, from the last to first parameter) after the controller and route level pipes.

#### Filters

Filters are the only component that do not resolve global first.
Instead, filters resolve from the lowest level possible, meaning execution starts with any route bound filters and proceeding next to controller level, and finally to global filters.
Note that exceptions cannot be passed from filter to filter; if a route level filter catches the exception, a controller or global level filter cannot catch the same exception.
The only way to achieve an effect like this is to use inheritance between the filters.

> info **Hint** Filters are only executed if any uncaught exception occurs during the request process.
> Caught exceptions, such as those caught with a `try/catch` will not trigger Exception Filters to fire.
> As soon as an uncaught exception is encountered, the rest of the lifecycle is ignored and the request skips straight to the filter.

#### 总结

通常，请求的生命周期看起来如下所示:

1.  传入请求
2.  在全局范围内绑定的中间件
3.  模块绑定中间件
4.  全局警卫
5.  控制器警卫
6.  警卫路由
7.  全局拦截器(零部件)
8.  控制器拦截器(零部件)
9.  路由拦截器(零部件)
10. 全局管道
11. 控制器的管道
12. 路由管道
13. 路由参数管道
14. 控制器(方法处理程序)
15. 服务(如果存在)
16. 路由拦截器(post 请求)
17. 控制器拦截器(post 请求)
18. 全局拦截器(post 请求)
19. 异常过滤器(路由，然后是控制器，然后是全局)
20. 服务器响应
