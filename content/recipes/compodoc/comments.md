---
title: "注释"
linkTitle: ""
weight: 9
---

Compodoc 使用 Typescript 的 AST 解析器和它的内部 api，所以注释必须是 JSDoc 注释:

```js
/**
 * 支持注视
 */
```

这些是不支持的:

```js
/*
 * 不支持的注视
 */

/*
  不支持的注视
 */

// 不支持的注视
```

在注释中创建新行，两行之间有一个空行。

```js
/**
 * First line
 *
 * Second line
 */
```

下面的示例将在输出的文档中只生成一行。

```js
/**
 * First line
 * Second line
 */
```
