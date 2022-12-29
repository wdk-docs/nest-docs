---
title: "提示和技巧"
linkTitle: ""
weight: 13
---

- [样式的文档](#样式的文档)
- [每个组件、模块、指令等的文档](#每个组件模块指令等的文档)
- [附加的文档](#附加的文档)
- [单存储库中几个应用程序的文档](#单存储库中几个应用程序的文档)
- [标记文件中的语法高亮显示](#标记文件中的语法高亮显示)
- [不包括文件](#不包括文件)
- [包括文件](#包括文件)

<a id="styling-the-documentation"></a>

## 样式的文档

```
compodoc -p tsconfig.doc.json -y your_theme_styles/
```

在你的文件夹中，你至少需要提供一个 style.css 文件，其中包含以下 7 个导入文件。

```
@import "./reset.css";
@import "./bootstrap.min.css";
@import "./bootstrap-card.css";
@import "./prism.css";
@import "./ionicons.min.css";
@import "./compodoc.css";
@import "./tablesort.css";
```

Compodoc 使用[bootstrap](http://getbootstrap.com/) 3.3.7。您可以轻松定制 Compodoc。

[bootswatch.com](http://bootswatch.com/)可以是一个很好的起点。如果你想覆盖默认的主题，只需提供一个 bootstrap.min.css 文件，它就会覆盖默认的主题。

```
└── your_theme_styles/
    ├── style.css // the main css file with default imports
    └── bootstrap.min.css // your bootstrap theme
```

<a id="documentation-of-each-components"></a>

## 每个组件、模块、指令等的文档

在 JSDoc 注释之间的**xxx.component.ts**文件中的注释描述可能有点短。

Compodoc 在每个组件的根文件夹中搜索一个默认的**xxx.component.md**文件，并将其添加到组件页面的一个选项卡中。对于类、模块等也是如此。

```
└── my-component/
    ├── my.component.ts
    ├── my.component.spec.ts
    ├── my.component.scss|css
    ├── my.component.html
    └── my.component.md
```

<a id="additional-documentation"></a>

## 附加的文档

Compodoc 支持添加外部 markdown 文件，以扩展应用程序的代码注释和主 README 文件。

创建一个包含 markdown 文件的文件夹，并使用`--includes` 标志来扩展文档。
你的文件夹应该包含一个**summary.json**文件解释结构和文件:

```
summary.json

[
    {
        "title": "A TITLE",
        "file": "a-file.md"
    },
    {
        "title": "A TITLE",
        "file": "a-file.md",
        "children": [
            {
                "title": "A TITLE",
                "file": "a-sub-folder/a-file.md"
            }
        ]
    }
]
```

链接像常规的标记链接一样受支持。

<a id="documentation-of-several-apps-in-a-monorepository"></a>

## 单存储库中几个应用程序的文档

[Nx](https://github.com/nrwl/nx)是一个开源、智能、快速和可扩展的构建系统。
它遵循的方法是，多个应用程序和库可以生活在同一个工作空间(又名“monorepo”)。

一个包含多个应用程序的单存储库可以很容易地被 Compodoc 记录下来。
你只需要在每个应用程序中单独运行 Compodoc。
下面是一个使用[nx-examples](https://github.com/nrwl/nx-examples)的例子:

```
.
├── apps
│   ├── demo
│   │   └── src
│   │       └── tsconfig.doc.json
│   ├── profile
│   ├── school
│   └── teach
└── README.md
```

像这样运行 Compodoc:

```bash
cd apps/demo/src
compodoc -p tsconfig.doc.json -s

// or

compodoc -p apps/demo/src/tsconfig.doc.json -s
```

<a id="syntax-highlighting-in-markdown-files"></a>

## 标记文件中的语法高亮显示

Compodoc 使用[Marked](https://github.com/chjj/marked)进行标记解析并编译成 html。
添加了[prismjs.js](http://prismjs.com/)以支持语法高亮显示。

只需使用一个正常的代码块在您的标记与正确的语言:[Github 帮助](https://help.github.com/articles/creating-and-highlighting-code-blocks/)

集成语言包括: **json, bash, javascript, markdown, html, scss, typescript**

<a id="excluding-files"></a>

## 不包括文件

要从文档中排除文件，只需使用[**tsconfig.json**](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)文件的**exclude**属性。

你可以排除名称为`app/myfile.ts`或 glob 模式`**/*.spec.ts`的特定文件。

<a id="including-files"></a>

## 包括文件

要包含文档中的文件，只需使用[**tsconfig.json**](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)文件的**include**属性。

你可以包含特定的文件名`app/myfile.ts`或 glob 模式`**/*.ts`的文件。
