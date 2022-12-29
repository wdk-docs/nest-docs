# 如何编写一个优化生产的 NestJS Dockerfile

这是一个循序渐进的教程，教你如何为 NestJS 项目编写 Dockerfile，创建一个生产优化的映像。

有了这个 Dockerfile，你就可以进行本地开发和容器化部署，例如 Cloud Run。

准备好了吗?让我们开始吧。

附注:如果你只想复制和粘贴生产就绪的 Dockerfile，请跳过本节。

## 编写 Dockerfile

容器映像是一个隔离的软件包，包含运行代码所需的所有内容。
你可以通过编写 `Dockerfile` 来定义容器映像， `Dockerfile` 提供了如何构建映像的指令。

现在让我们添加 `Dockerfile`:

```sh
touch Dockerfile
```

然后让我们将说明添加到 `Dockerfile` 中。请参阅解释每个步骤的注释:

```dockerfile title="Dockerfile"
# Base image
FROM node:18
# Create app directory
WORKDIR /usr/src/app
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
# Install app dependencies
RUN npm install
# Bundle app source
COPY . .
# Creates a "dist" folder with the production build
RUN npm run build
# Start the server using the production build
CMD [ "node", "dist/main.js" ]
```

类似于`.gitignore`文件，我们可以添加一个`.dockerignore`文件，它将防止某些文件被包含在映像构建中。

```sh
touch .dockerignore
```

然后从映像构建中排除以下文件:

```dockerignore
.dockerignore
Dockerfile
.dockerignore
node_modules
npm-debug.log
dist
```

## 在本地测试容器

现在让我们在本地做一些测试，检查 Dockerfile 的行为是否如我们所期望的那样。

让我们首先使用位于项目根的终端中的命令构建映像(您可以用项目名称替换 nest-cloud-run)。别忘了。!

```sh
docker build -t nest-cloud-run .
```

你可以通过运行 docker images 来验证镜像是否已经创建，它会输出你本地机器上的 docker 镜像列表:

```sh
docker images
REPOSITORY TAG IMAGE ID CREATED SIZE
nest-cloud-run latest 004f7f222139 31 seconds ago 1.24GB
```

现在让我们启动容器并使用以下命令运行映像(确保与上面使用的映像名称相同):

```sh
docker run -p80:3000 nest-cloud-run
```

您现在可以通过在浏览器中访问 http://localhost 来访问 NestJS 应用程序(只有 http://localhost，没有任何端口号)。

在运行容器时，我在我的机器上遇到了几个问题，主要是由于与我运行的其他容器的端口冲突。

如果遇到类似的问题，可以尝试运行命令`docker rm -f $(docker ps -aq)`，该命令会停止并删除所有正在运行的容器。

## 为生产优化 Dockerfile

现在我们已经确认图像在本地工作，让我们尝试减小图像的大小，使其更有效地用于生产。
我们还希望确保图像尽可能安全。

在计算要收取多少费用时，Cloud Run 等部署工具会考虑映像的大小，因此尽可能减小映像的大小是个好主意。

运行`docker images`命令可以得到镜像的大小:

```sh
docker images
REPOSITORY TAG IMAGE ID CREATED SIZE
nest-cloud-run latest 004f7f222139 31 seconds ago 1.24GB
```

1.24GB 是相当大的!让我们回到`Dockerfile`中进行一些优化。

### 使用 Alpine 节点映像

在尝试优化图像大小时，建议使用 Alpine 节点图像。使用`node:18-alpine`而不是`node:18`本身将图像大小从`1.24GB`减少到`466MB`!

### 添加一个 NODE_ENV 环境变量

许多库在将`NODE_ENV`环境变量设置为生产环境时都内置了优化，因此我们可以在`Dockerfile`构建中通过在`Dockerfile`中添加以下行来设置这个环境变量:

```sh
ENV NODE_ENV production
```

另外，如果你对如何在 NestJS 的配置文件中使用环境变量感兴趣，请查看本教程。

### 使用 npm ci 代替 npm install

NPM 建议在构建映像时使用`npm ci`而不是`npm install`。以下是他们网站上的一段话:

"`npm ci`类似于`npm install`，除了它被用于自动化环境中，比如测试平台、持续集成和部署，或者任何你想要确保你对依赖项进行干净安装的情况。"

这非常适合我们正在做的事情，所以我们将在`Dockerfile`中使用`npm ci`而不是`npm install`。

```sh
RUN npm ci
```

### USER 指令

默认情况下，如果你没有在`Dockerfile`中指定`USER`指令，映像将使用根权限运行。
这是一个安全风险，所以我们将在`Dockerfile`中添加一个`USER`指令。

我们正在使用的节点图像已经为我们创建了一个名为 node 的用户，所以让我们使用它:

```dockerfile
USER node
```

无论何时使用 `COPY` 指令，添加标志以确保用户具有正确的权限也是一种良好的实践。

你可以在使用 `COPY` 指令时使用`--chown=node:node`来实现这一点，例如:

```dockerfile
COPY --chown=node:node package*.json ./
```

### 使用多级构建

在 Dockerfile 中，您可以定义多级构建，这是一种通过构建多个映像来顺序构建最优化映像的方法。

除了使用小映像之外，多阶段构建是可以进行最大优化的地方。

```dockerfile title="Dockerfile"
###################

# BUILD FOR LOCAL DEVELOPMENT

###################

FROM node:18-alpine As development

# ... your development build instructions here

###################

# BUILD FOR PRODUCTION

###################

# Base image for production

FROM node:18-alpine As build

# ... your build instructions here

###################

# PRODUCTION

###################

# Base image for production

FROM node:18-alpine As production

# ... your production instructions here
```

这个多级构建使用 3 个阶段:

- development - 这是我们为本地开发构建映像的阶段。
- build - 这是我们为生产构建映像的阶段。
- production - 我们复制相关的生产构建文件并启动服务器。

如果你对本地使用 Docker 来运行你的 NestJS 应用不感兴趣，你可以将第 1 步和第 2 步合并到一个阶段中。

然而，上面的多阶段设置的好处是，你有一个单独的 Dockerfile，可以在本地开发中使用(与 docker-compose.yml 文件结合使用)，还可以创建一个为生产优化的 Docker 映像。

如果你有兴趣使用 Dockerfile 和 Docker Compose 进行本地开发(带热重载)，请查看这篇文章。

### 把它们放在一起

使用上面描述的所有技术，下面是我们用来构建生产优化映像的 Dockerfile:

```dockerfile title="Dockerfile"
###################

# BUILD FOR LOCAL DEVELOPMENT

###################

FROM node:18-alpine As development

# Create app directory

WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.

# A wildcard is used to ensure copying both package.json AND package-lock.json (when available).

# Copying this first prevents re-running npm install on every code change.

COPY --chown=node:node package*.json ./

# Install app dependencies using the `npm ci` command instead of `npm install`

RUN npm ci

# Bundle app source

COPY --chown=node:node . .

# Use the node user from the image (instead of the root user)

USER node

###################

# BUILD FOR PRODUCTION

###################

FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

# In order to run `npm run build` we need access to the Nest CLI which is a dev dependency. In the previous development stage we ran `npm ci` which installed all dependencies, so we can copy over the node_modules directory from the development image

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

# Run the build command which creates the production bundle

RUN npm run build

# Set NODE_ENV environment variable

ENV NODE_ENV production

# Running `npm ci` removes the existing node_modules directory and passing in --only=production ensures that only the production dependencies are installed. This ensures that the node_modules directory is as optimized as possible

RUN npm ci --only=production && npm cache clean --force

USER node

###################

# PRODUCTION

###################

FROM node:18-alpine As production

# Copy the bundled code from the build stage to the production image

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Start the server using the production build

CMD [ "node", "dist/main.js" ]
```

一旦你更新了 Dockerfile，你需要重新运行命令来构建你的映像:

```sh
docker build -t nest-cloud-run .
```

然后是旋转容器的命令:

```sh
docker run -p80:3000 nest-cloud-run
```

如果你再次运行`docker images`来检查我们的图像大小，你会发现它现在明显变小了:

```sh
docker images
REPOSITORY TAG IMAGE ID CREATED SIZE
nest-cloud-run latest 004f7f222139 31 seconds ago 189MB
```

## 故障排除

你可能会遇到以下错误:

### Error: Cannot find module 'webpack'

如果你得到如下错误，很可能你在基本映像中使用了错误的节点版本:

- Error: Cannot find module 'webpack'

例如，不使用`FROM node:14-alpine`，而是使用`FROM node:18-alpine`来解决这个问题。

### Error: nest command not found

当你运行`npm run build`时，它会使用 Nest CLI 来生成构建文件。

Nest CLI 是一个开发依赖，所以如果你得到的错误 nest 命令没有找到，你需要:

- (推荐选项):在多阶段 Dockerfile 设置中运行 `npm run build`，其中您已经安装了生产和开发依赖项(使用 npm ci)
- 更新 `package.json` 文件，在生产依赖项中包含 Nest CLI 包。
  这种方法的唯一缺点是它增加了 node_modules 的大小，导致映像更大

推荐的选项是在本教程中提到的 `Dockerfile` 中实现的，如果你想要一个如何工作的示例。

## Dockerfile 与 pnpm 包管理器

如果你在你的 NestJS 项目中使用 pnpm 作为包管理器， `Dockerfile` 将需要如下:

```dockerfile title="Dockerfile"
###################

# BUILD FOR LOCAL DEVELOPMENT

###################

FROM node:18 As development
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

WORKDIR /usr/src/app

COPY --chown=node:node pnpm-lock.yaml ./

RUN pnpm fetch --prod

COPY --chown=node:node . .
RUN pnpm install

USER node

###################

# BUILD FOR PRODUCTION

###################

FROM node:18 As build
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

WORKDIR /usr/src/app

COPY --chown=node:node pnpm-lock.yaml ./

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

RUN pnpm build

ENV NODE_ENV production

RUN pnpm install --prod

USER node

###################

# PRODUCTION

###################

FROM node:18-alpine As production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

CMD [ "node", "dist/main.js" ]
```

## 带有 Fastify 的 NestJS Dockerfile

如果在 NestJS 中使用 `Fastify` 作为服务器，而不是默认的 `express` 服务器，则需要将服务器修改为 `0.0.0.0`。

例如，下面是如何编辑 `main.ts` 文件中的 `bootstrap()`函数:

```ts
main.ts;
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.listen(process.env.PORT || 3000, "0.0.0.0");
}
bootstrap();
```

这在 `Fastify` 文档中有说明，如果你想了解更多的话。

## 结论

总之，这里是我们为一个 NestJS 项目优化的 Docker 图像(没有所有的解释器注释):

```dockerfile title="Dockerfile"
###################

# BUILD FOR LOCAL DEVELOPMENT

###################

FROM node:18-alpine As development

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

USER node

###################

# BUILD FOR PRODUCTION

###################

FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

RUN npm run build

ENV NODE_ENV production

RUN npm ci --only=production && npm cache clean --force

USER node

###################

# PRODUCTION

###################

FROM node:18-alpine As production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

CMD [ "node", "dist/main.js" ]
```

以下是一些与部署到生产环境相关的额外资源，可能会有所帮助:

- 使用NestJS Logger
- 添加带有一些自动化单元测试的CI管道
- 将NestJS应用程序部署到Cloud Run
  
