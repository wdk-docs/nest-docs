---
title: "使用"
linkTitle: ""
weight: 7
---

## 配置文件

您可以在项目文件夹的根目录中提供配置文件。

Compodoc 将搜索如下文件: .compodocrc, .compodocrc.json, .compodocrc.yaml 或 package.json 中的 Compodoc 属性

这里有一个 JSON 模式: `./node_modules/@compodoc/compodoc/src/config/schema.json`

## 选项、引号和 Windows 使用

记住，使用多个单词的选项需要在句子周围加引号。

```bash
compodoc -p tsconfig.doc.json -n 'My app documentation'
```

使用 npm 脚本，命令被托管在 package.json 文件中。
不要忘记在 Windows 系统中使用双引号转义。(npm 6. x)

```bash
{
   ...
   "doc": "npx compodoc -p tsconfig.doc.json -n \"My app documentation\""
   ...
}
```

## 渲染文档

文档在默认输出文件夹中生成，然后在该文件夹中运行 HTTP 服务器。

```bash
compodoc -p tsconfig.doc.json
```

## 提供源文件夹时呈现文档

```bash
compodoc src -p tsconfig.doc.json
```

## 使用 compodoc 提供生成的文档

文档在默认输出文件夹或特定文件夹中生成，本地 HTTP 服务器在 http://localhost:8080 上启动

```bash
compodoc -s
# 或者
compodoc -s -d ./doc
```

## 渲染文档，并用 compodoc 提供它

文档生成在默认输出文件夹中，本地 HTTP 服务器可以在 http://localhost:8080 上找到

```bash
compodoc -p tsconfig.doc.json -s
```
