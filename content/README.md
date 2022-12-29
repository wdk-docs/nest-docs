# 介绍

[`Nest (NestJS)`](https://github.com/nestjs/nest) ![](https://img.shields.io/github/stars/nestjs/nest.svg?style=flat-square) 是一个构建高效、可扩展的[Node.js](https://nodejs.org/)服务器端应用程序的框架。
它使用了渐进 JavaScript，使用并完全支持[TypeScript](http://www.typescriptlang.org/)构建(但仍然允许开发者使用纯 JavaScript 编写代码)，并结合了 OOP(面向对象编程)、FP(函数式编程)和 FRP(函数式反应式编程)的元素。

在内部，Nest 利用了健壮的 HTTP 服务器框架，如[Express](https://expressjs.com/)(默认)，也可以配置为使用[Fastify](https://github.com/fastify/fastify) !

Nest 在这些常见的 Node.js 框架(Express/Fastify)之上提供了一个抽象级别，但也直接向开发人员公开了它们的 api。
这使得开发人员可以自由地使用可用于底层平台的无数第三方模块。

## 哲学

近年来，由于 Node.js 的出现，JavaScript 已经成为 web 前端和后端应用的“通用语”。
这也催生了一些令人惊叹的项目，比如[Angular](https://angular.io/)、[React](https://github.com/facebook/react)和[Vue](https://github.com/vuejs/vue)，它们提高了开发人员的工作效率，并支持创建快速、可测试和可扩展的前端应用程序。
然而，虽然有很多优秀的库、助手和工具可以用于 Node(和服务器端 JavaScript)，但它们都不能有效地解决 **Architecture** 的主要问题。

Nest 提供了一种开箱即用的应用程序架构，允许开发人员和团队创建高度可测试、可伸缩、松散耦合和易于维护的应用程序。
该架构深受 Angular 的启发。

## 安装

开始时，你可以使用[Nest CLI](/cli/overview)构建项目，或者克隆一个启动项目(两者都会产生相同的结果)。

要使用 Nest CLI 构建项目，运行以下命令。
这将创建一个新的项目目录，并使用初始核心 Nest 文件和支持模块填充该目录，为您的项目创建一个常规的基本结构。
对于第一次使用的用户，建议使用 **Nest CLI** 创建一个新项目。
我们将在[第一步](first-steps)中继续使用这种方法。

```bash
$ npm i -g @nestjs/cli
$ nest new project-name
```

## 选择

或者，用 **Git** 安装 TypeScript 启动器项目:

```bash
$ git clone https://github.com/nestjs/typescript-starter.git project
$ cd project
$ npm install
$ npm run start
```

!!! info " **Hint** "

    如果你想在没有 git 历史记录的情况下克隆仓库，你可以使用[degit](https://github.com/Rich-Harris/degit)。

打开浏览器并导航到[`http://localhost:3000/`](http://localhost:3000/)。

要安装 JavaScript 风格的 starter 项目，请使用`javascript-starter.git`。
在上面的命令序列中使用 Git。

你也可以用 **npm** (或 **yarn** )安装核心文件和支持文件，从头开始手动创建一个新项目。
当然，在这种情况下，您将负责自己创建项目样板文件。

```bash
$ npm i --save @nestjs/core @nestjs/common rxjs reflect-metadata
```
