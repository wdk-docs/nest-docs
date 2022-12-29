---
title: "路由"
linkTitle: ""
weight: 11
---

参考[样式指南](https://angular.io/docs/ts/latest/guide/router.html#!#routing-module)，提供一个类型为 **'Routes'** 的 const 对象，具有**唯一的**名称:

```js
const APP_ROUTES: Routes = [
    { path: 'about', component: AboutComponent },
    { path: '', component: HomeComponent}
];

...

RouterModule.forRoot(APP_ROUTES)
```

![screenshot](/assets/img/screenshots/routing.png)
