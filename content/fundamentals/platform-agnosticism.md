### 平台无关性

Nest 是一个平台无关的框架。
这意味着你可以开发可以跨不同类型应用程序使用的可重用逻辑部分。
例如，大多数组件可以在不改变的情况下跨不同的底层 HTTP 服务器框架(如 Express 和 Fastify)重用，甚至跨不同类型的应用程序(如 HTTP 服务器框架、具有不同传输层的微服务和 Web Sockets)重用。

#### 一次性构建，随处使用

文档的**概述**部分主要展示了使用 HTTP 服务器框架的编码技术(例如，提供 REST API 的应用程序或提供 mvc 风格的服务器端渲染应用程序)。
然而，所有这些构建块都可以在不同的传输层([microservices](/microservices/basics)或[websockets](/websockets/gateways)之上使用。

此外，Nest 还提供了一个专门的[GraphQL](/graphql/quick-start)模块。
您可以将 GraphQL 作为 API 层与提供 REST API 交换使用。

此外，[application context](/application-context)特性有助于在 Nest 之上创建任何类型的 Node.js 应用，包括 CRON 作业和 CLI 应用。

Nest 希望成为一个成熟的 Node.js 应用平台，为你的应用带来更高层次的模块化和可重用性。
一次构建，随处使用!
