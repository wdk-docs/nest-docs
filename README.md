## 描述

This project is built on top of the [Angular CLI](https://github.com/angular/angular-cli). 
It uses the [Dgeni documentation generator](https://github.com/angular/dgeni) to compile source documentation in markdown format into the published format. 
The Repository contains [docs.nestjs.com](https://docs.nestjs.com) source code, the official Nest documentation.

## 安装

Install project dependencies and start a local server with the following terminal commands:

```bash
$ npm install
$ npm run start
```

Navigate to [`http://localhost:4200/`](http://localhost:4200/).

All pages are written in [markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) and located in the `content` directory.

## 构建

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

To run build in _watch mode_, run `npm run build:watch`. Any content changes will be recompiled and rebuilt, and the content served at [`http://localhost:4200/`](http://localhost:4200/).

Use `npm run build:prod` for a production build.

## 支持

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://opencollective.com/nest).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
