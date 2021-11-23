import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements OnInit {
  @Input()
  isSidebarOpened = true;
  readonly items = [
    {
      title: '介绍',
      isOpened: false,
      path: '/',
    },
    {
      title: '概述',
      isOpened: true,
      children: [
        { title: '第一步', path: '/first-steps' },
        { title: '控制器', path: '/controllers' },
        { title: '提供器', path: '/providers' },
        { title: '模块', path: '/modules' },
        { title: '中间件', path: '/middleware' },
        { title: '异常过滤', path: '/exception-filters' },
        { title: '管道', path: '/pipes' },
        { title: '守卫', path: '/guards' },
        { title: '拦截器', path: '/interceptors' },
        { title: '自定义修饰符', path: '/custom-decorators' },
      ],
    },
    {
      title: '基本面',
      isOpened: false,
      children: [
        { title: '自定义提供器', path: '/fundamentals/custom-providers' },
        {
          title: '异步服务提供器',
          path: '/fundamentals/async-providers',
        },
        {
          title: '动态模块',
          path: '/fundamentals/dynamic-modules',
        },
        {
          title: '注入范围',
          path: '/fundamentals/injection-scopes',
        },
        {
          title: '圆形依赖',
          path: '/fundamentals/circular-dependency',
        },
        {
          title: '模块引用',
          path: '/fundamentals/module-ref',
        },
        {
          title: '延迟加载模块',
          path: '/fundamentals/lazy-loading-modules',
        },
        {
          title: '执行上下文',
          path: '/fundamentals/execution-context',
        },
        {
          title: '生命周期事件',
          path: '/fundamentals/lifecycle-events',
        },
        {
          title: '平台不可知论',
          path: '/fundamentals/platform-agnosticism',
        },
        { title: '测试', path: '/fundamentals/testing' },
      ],
    },
    {
      title: '技术',
      isOpened: false,
      children: [
        { title: '数据库', path: '/techniques/database' },
        { title: 'Mongo', path: '/techniques/mongodb' },
        { title: '配置', path: '/techniques/configuration' },
        { title: '验证', path: '/techniques/validation' },
        { title: '缓存', path: '/techniques/caching' },
        { title: '序列化', path: '/techniques/serialization' },
        { title: '版本控制', path: '/techniques/versioning' },
        { title: '任务调度', path: '/techniques/task-scheduling' },
        { title: '队列', path: '/techniques/queues' },
        { title: '日志', path: '/techniques/logger' },
        { title: 'Cookies', path: '/techniques/cookies' },
        { title: '事件', path: '/techniques/events' },
        { title: '压缩', path: '/techniques/compression' },
        { title: '文件上传', path: '/techniques/file-upload' },
        { title: '流文件', path: '/techniques/streaming-files' },
        { title: 'HTTP 模块', path: '/techniques/http-module' },
        { title: 'Session', path: '/techniques/session' },
        { title: 'Model-View-Controller', path: '/techniques/mvc' },
        { title: '性能 (Fastify)', path: '/techniques/performance' },
        { title: '服务器发送的事件', path: '/techniques/server-sent-events' },
      ],
    },
    {
      title: '安全',
      isOpened: false,
      children: [
        { title: '身份验证', path: '/security/authentication' },
        { title: '授权', path: '/security/authorization' },
        {
          title: '加密和散列',
          path: '/security/encryption-and-hashing',
        },
        { title: 'Helmet', path: '/security/helmet' },
        { title: 'CORS', path: '/security/cors' },
        { title: 'CSRF 保护', path: '/security/csrf' },
        { title: '速度限制', path: '/security/rate-limiting' },
      ],
    },
    {
      title: 'GraphQL',
      isOpened: false,
      children: [
        { title: '快速启动', path: '/graphql/quick-start' },
        { title: '解析器', path: '/graphql/resolvers' },
        { title: 'Mutations', path: '/graphql/mutations' },
        { title: 'Subscriptions', path: '/graphql/subscriptions' },
        { title: 'Scalars', path: '/graphql/scalars' },
        { title: 'Directives', path: '/graphql/directives' },
        { title: 'Plugins', path: '/graphql/plugins' },
        { title: 'Interfaces', path: '/graphql/interfaces' },
        { title: 'Unions and Enums', path: '/graphql/unions-and-enums' },
        { title: 'Field middleware', path: '/graphql/field-middleware' },
        { title: 'Mapped types', path: '/graphql/mapped-types' },
        { title: 'Complexity', path: '/graphql/complexity' },
        { title: 'Extensions', path: '/graphql/extensions' },
        { title: 'CLI Plugin', path: '/graphql/cli-plugin' },
        { title: 'Generating SDL', path: '/graphql/generating-sdl' },
        {
          title: 'Other features',
          path: '/graphql/other-features',
        },
        { title: 'Federation', path: '/graphql/federation' },
      ],
    },
    {
      title: 'WebSockets',
      isOpened: false,
      children: [
        { title: 'Gateways', path: '/websockets/gateways' },
        { title: 'Exception filters', path: '/websockets/exception-filters' },
        { title: 'Pipes', path: '/websockets/pipes' },
        { title: 'Guards', path: '/websockets/guards' },
        { title: 'Interceptors', path: '/websockets/interceptors' },
        { title: 'Adapters', path: '/websockets/adapter' },
      ],
    },
    {
      title: 'Microservices',
      isOpened: false,
      children: [
        { title: 'Overview', path: '/microservices/basics' },
        { title: 'Redis', path: '/microservices/redis' },
        { title: 'MQTT', path: '/microservices/mqtt' },
        { title: 'NATS', path: '/microservices/nats' },
        { title: 'RabbitMQ', path: '/microservices/rabbitmq' },
        { title: 'Kafka', path: '/microservices/kafka' },
        { title: 'gRPC', path: '/microservices/grpc' },
        {
          title: 'Custom transporters',
          path: '/microservices/custom-transport',
        },
        {
          title: 'Exception filters',
          path: '/microservices/exception-filters',
        },
        { title: 'Pipes', path: '/microservices/pipes' },
        { title: 'Guards', path: '/microservices/guards' },
        { title: 'Interceptors', path: '/microservices/interceptors' },
      ],
    },
    {
      title: '独立的应用程序',
      isOpened: false,
      path: '/application-context',
    },
    {
      title: 'CLI',
      isOpened: false,
      children: [
        { title: 'Overview', path: '/cli/overview' },
        { title: 'Workspaces', path: '/cli/monorepo' },
        { title: 'Libraries', path: '/cli/libraries' },
        { title: 'Usage', path: '/cli/usages' },
        { title: 'Scripts', path: '/cli/scripts' },
      ],
    },
    {
      title: 'OpenAPI',
      isOpened: false,
      children: [
        { title: 'Introduction', path: '/openapi/introduction' },
        {
          title: 'Types and Parameters',
          path: '/openapi/types-and-parameters',
        },
        { title: 'Operations', path: '/openapi/operations' },
        { title: 'Security', path: '/openapi/security' },
        { title: 'Mapped Types', path: '/openapi/mapped-types' },
        { title: 'Decorators', path: '/openapi/decorators' },
        { title: 'CLI Plugin', path: '/openapi/cli-plugin' },
        { title: 'Other features', path: '/openapi/other-features' },
        { title: 'Migration guide', path: '/openapi/migration-guide' },
      ],
    },
    {
      title: '食谱',
      isOpened: false,
      children: [
        { title: 'CRUD generator', path: '/recipes/crud-generator' },
        { title: 'Hot reload', path: '/recipes/hot-reload' },
        { title: 'MikroORM', path: '/recipes/mikroorm' },
        { title: 'TypeORM', path: '/recipes/sql-typeorm' },
        { title: 'Mongoose', path: '/recipes/mongodb' },
        { title: 'Sequelize', path: '/recipes/sql-sequelize' },
        { title: 'Router module', path: '/recipes/router-module' },
        { title: 'Swagger', path: '/recipes/swagger' },
        { title: 'Health checks', path: '/recipes/terminus' },
        { title: 'CQRS', path: '/recipes/cqrs' },
        { title: 'Compodoc', path: '/recipes/documentation' },
        { title: 'Prisma', path: '/recipes/prisma' },
        { title: 'Serve static', path: '/recipes/serve-static' },
        { title: 'Commander', path: '/recipes/nest-commander' },
      ],
    },
    {
      title: 'FAQ',
      isOpened: false,
      children: [
        { title: 'Serverless', path: '/faq/serverless' },
        { title: 'HTTP adapter', path: '/faq/http-adapter' },
        { title: 'Global path prefix', path: '/faq/global-prefix' },
        { title: 'Hybrid application', path: '/faq/hybrid-application' },
        { title: 'HTTPS & multiple servers', path: '/faq/multiple-servers' },
        { title: 'Request lifecycle', path: '/faq/request-lifecycle' },
        { title: 'Common errors', path: '/faq/common-errors' },
        {
          title: 'Examples',
          externalUrl: 'https://github.com/nestjs/nest/tree/master/sample',
        },
      ],
    },
    {
      title: '迁移向导',
      isOpened: false,
      path: '/migration-guide',
    },
    {
      title: '正式的课程',
      externalUrl: 'https://courses.nestjs.com/',
    },
    {
      title: '发现',
      isOpened: false,
      children: [{ title: '谁在使用Nest?', path: '/discover/companies' }],
    },
    {
      title: 't恤和连帽衫',
      externalUrl: 'https://nestjs.threadless.com/',
    },
    {
      title: '支持我们',
      isOpened: false,
      path: '/support',
    },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((ev) => ev instanceof NavigationEnd))
      .subscribe((event) => this.toggleCategory());

    this.toggleCategory();
  }

  toggleCategory() {
    const { firstChild } = this.route.snapshot;
    if (
      (firstChild.url && firstChild.url[1]) ||
      (firstChild.url &&
        firstChild.routeConfig &&
        firstChild.routeConfig.loadChildren)
    ) {
      const { path } = firstChild.url[0];
      const index = this.items.findIndex(
        ({ title }) => title.toLowerCase() === path,
      );
      if (index < 0) {
        return;
      }
      this.items[index].isOpened = true;
      this.items[1].isOpened = false;
    }
  }
}
