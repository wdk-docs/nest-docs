---
title: "安装"
linkTitle: ""
weight: 3
---

## Node.js 版本

Compodoc 只使用 LTS 版本进行测试: v12.x, v14.x

## Angular-CLI

Compodoc 支持最新的 Angular-CLI 版本:13.x

只需在一个新的或现有的项目中运行 Compodoc。

## 全局安装

从 npm 安装:

```bash
npm install -g @compodoc/compodoc
```

如果你在 Windows 上使用 PowerShell，请添加引号:

```bash
npm install -g "@compodoc/compodoc"
```

## 本地安装

使用 Angular CLI 安装:npm scripts + 特殊的 tsconfig.doc.json 文件将被创建。

```bash
ng add @compodoc/compodoc
```

或直接

```bash
npm install --save-dev @compodoc/compodoc
```

## 运行

创建一个名为`tsconfig.doc.json`的文件，包含一个指向`src`文件夹的键`include`，你也可以使用`exclude`键:

```
{
  "include": ["src/**/*.ts"],
  "exclude": ["src/test.ts", "src/**/*.spec.ts", "src/app/file-to-exclude.ts"]
}
```

在你的 package.json 中定义一个脚本任务(使用 npm 6.x):

```bash
"scripts": {
  "compodoc": "npx compodoc -p tsconfig.doc.json"
}
```

并像正常的 NPM 脚本一样运行它:

```bash
npm run compodoc
```

或与 npx:

```bash
npx @compodoc/compodoc ...
```

请参阅[usage](./usage.html)了解更多细节。

## tsconfig 文件在代码库中的位置

Compodoc 从`-p`选项提供的 tsconfig 文件的文件夹级别启动。

Angular CLI 项目的例子:

```
.
├── src
│ ├── app
│ │ ├── app.component.ts
│ │ └── app.module.ts
│ ├── main.ts
│ └── ...
├── tsconfig.app.json
├── tsconfig.doc.json
└── tsconfig.json
```
