# 队列

队列是一种功能强大的设计模式，可以帮助您处理常见的应用程序扩展和性能挑战。
队列可以帮助你解决的一些问题示例如下:

- 平滑处理峰。
  例如，如果用户可以在任意时间启动资源密集型任务，则可以将这些任务添加到队列中，而不是同步执行它们。
  然后，你可以让工作进程以受控的方式从队列中拉出任务。
  您可以轻松地添加新的队列使用者，以便随着应用程序的扩展而扩展后端任务处理。
- 分解可能会阻塞 Node.js 事件循环的单块任务。
  例如，如果用户请求需要像音频转码这样的 CPU 密集型工作，您可以将此任务委托给其他进程，从而释放面向用户的进程以保持响应。
- 在各种服务之间提供可靠的通信通道。
  例如，您可以在一个进程或服务中对任务(作业)排队，然后在另一个进程或服务中使用它们。
  您可以在作业生命周期中的任何流程或服务完成、错误或其他状态更改时收到通知(通过侦听状态事件)。
  当队列的生产者或消费者失败时，它们的状态被保留，任务处理可以在节点重启时自动重启。

Nest 提供了`@nestjs/bull`包，作为[Bull](https://github.com/OptimalBits/bull)的抽象/包装，这是一个流行的、支持良好的、基于 Node.js 的高性能队列系统实现。
这个包可以很容易地将 Bull Queues 以一种 nest 友好的方式集成到你的应用程序中。

Bull 使用[Redis](https://redis.io/)来保存作业数据，所以你需要在你的系统上安装 Redis。
因为它是 Redis-backed，所以您的 Queue 体系结构可以是完全分布式的和平台无关的。
例如，你可以让一些 Queue[生产者](techniques/queues#producers)、[消费者](techniques/queues#consumers)和[监听器](techniques/queues#event-listeners)运行在一个(或多个)节点的 Nest 中，而其他生产者、消费者和监听器运行在其他网络节点的其他 Node.js 平台上。

本章介绍了`@nestjs/bull`包。
我们还建议阅读[Bull 文档](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md)以获得更多背景和具体的实现细节。

## 安装

要开始使用它，我们首先安装所需的依赖项。

```bash
$ npm install --save @nestjs/bull bull
$ npm install --save-dev @types/bull
```

一旦安装过程完成，我们就可以将`BullModule`导入到根目录`AppModule`中。

=== "app.module.ts"

    ```ts
    import { Module } from '@nestjs/common';
    import { BullModule } from '@nestjs/bull';

    @Module({
      imports: [
        BullModule.forRoot({
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
      ],
    })
    export class AppModule {}
    ```

`forRoot()`方法用于注册一个`bull`包配置对象，该对象将被应用程序中注册的所有队列使用(除非另有说明)。配置对象由以下属性组成:

- `limiter: RateLimiter` - 用于控制队列作业的处理速度的选项。更多信息请参见[RateLimiter](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)。 可选的。
- `redis: RedisOpts` - 配置 Redis 连接的选项。更多信息请参见[RedisOpts](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)。 可选的。
- `prefix: string` - 所有队列键的前缀。可选的。
- `defaultJobOptions: JobOpts` - 用于控制新作业的默认设置的选项。更多信息请参见[JobOpts](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueadd)。 可选的。
- `settings: AdvancedSettings` - 高级队列配置设置。 这些通常不应更改。更多信息请参见[AdvancedSettings](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)。 可选的。

所有选项都是可选的，提供了对队列行为的详细控制。这些被直接传递给 Bull `Queue`构造函数。 有关这些选项的更多信息[在这里](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)。

要注册一个队列，请导入`BullModule#registerQueue()`动态模块，如下所示:

```typescript
BullModule.registerQueue({
  name: 'audio',
});
```

!!! info "**Hint**"

    通过将多个以逗号分隔的配置对象传递给`registerQueue()`方法来创建多个队列。

`registerQueue()`方法用于实例化和/或注册队列。
队列是跨模块和进程共享的，连接到相同的基础 Redis 数据库具有相同的凭据。
每个队列的 name 属性都是唯一的。
队列名既可以用作注入令牌(用于将队列注入到控制器/提供器中)，也可以用作装饰器的参数，用于将消费者类和侦听器与队列关联起来。

你也可以覆盖特定队列的一些预先配置的选项，如下所示:

```typescript
BullModule.registerQueue({
  name: 'audio',
  redis: {
    port: 6380,
  },
});
```

由于任务被持久化在 Redis 中，每次实例化一个特定的命名队列(例如，当一个应用程序启动/重启)，它试图处理任何旧的任务，可能存在于前一个未完成的会话。

每个队列可以有一个或多个生产者、消费者和侦听器。消费者按照特定的顺序从队列中检索作业:FIFO(默认)、LIFO 或根据优先级。[这里](techniques/queues#consumer)讨论了控制队列处理顺序。

## 命名配置

如果你的队列连接到多个不同的 Redis 实例，你可以使用一种叫做 **named configurations** 的技术。
这个特性允许您在指定的键下注册几个配置，然后您可以在队列选项中引用它们。

例如，假设你有一个额外的 Redis 实例(除了默认的)，被你的应用程序中注册的几个队列使用，你可以按如下方式注册它的配置:

```typescript
BullModule.forRoot('alternative-config', {
  redis: {
    port: 6381,
  },
});
```

在上面的例子中，`'alternative-config'`只是一个配置键(它可以是任意字符串)。

有了这个，你现在可以在`registerQueue()`选项对象中指向这个配置:

```typescript
BullModule.registerQueue({
  configKey: 'alternative-queue'
  name: 'video',
});
```

## 生产者

作业生成器将作业添加到队列中。
生产者通常是应用服务(Nest [providers](/providers))。要将作业添加到队列中，首先要将队列注入到服务中，如下所示:

```typescript
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class AudioService {
  constructor(@InjectQueue('audio') private audioQueue: Queue) {}
}
```

!!! info "**Hint**"

    `@InjectQueue()`装饰器通过它的名字来标识队列，就像在`registerQueue()`方法调用中提供的(例如，`audio`)。

现在，通过调用队列的`add()`方法添加一个作业，并传递一个用户定义的作业对象。
作业被表示为可序列化的 JavaScript 对象(因为这是它们存储在 Redis 数据库中的方式)。
你通过的任务的形状是任意的;使用它来表示作业对象的语义。

```typescript
const job = await this.audioQueue.add({
  foo: 'bar',
});
```

## 指定的工作

Jobs 可能有独特的名字。这允许您创建专门的[consumer](techniques/queues#consumers)，它将只处理具有给定名称的作业。

```typescript
const job = await this.audioQueue.add('transcode', {
  foo: 'bar',
});
```

!!! warning

    在使用命名作业时，必须为添加到队列中的每个惟一名称创建处理器，否则队列将抱怨您缺少给定作业的处理器。有关使用命名作业的更多信息，请参见[here](techniques/queues#consumer)。

## 作业选项

作业可以有与之关联的其他选项。在`Queue.add()`方法的`job`参数后传递一个 options 对象。作业选项属性如下:

- `priority`: `number` - 可选的优先级值。取值范围为 1(最高优先级)到 MAX_INT(最低优先级)。注意，使用优先级对性能有轻微的影响，所以要谨慎使用。
- `delay`: `number` - 等待该作业被处理之前的时间(毫秒)。请注意，为了获得准确的延迟，服务器和客户机的时钟都应该同步。
- `attempts`: `number` - 在任务完成之前尝试执行该任务的总次数。
- `repeat`: `RepeatOpts` - 根据 cron 规范重复作业。查看[RepeatOpts](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueadd).
- `backoff`: `number | BackoffOpts` - 任务失败时自动重试的后退设置。查看[BackoffOpts](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueadd).
- `lifo`: `boolean` - 如果为 true，则将作业添加到队列的右端而不是左端(默认为 false)。
- `timeout`: `number` - 作业失败并出现超时错误的毫秒数。
- `jobId`: `number` | `string` - 覆盖作业 ID - 在默认情况下，作业 ID 是唯一的整数，但您可以使用此设置来覆盖它。如果使用此选项，则由您来确保 jobId 是唯一的。如果尝试添加 id 已经存在的作业，则不会添加该作业。
- `removeOnComplete`: `boolean | number` - 如果为 true，则在作业成功完成时移除作业。一个数字指定要保留的作业数量。默认行为是将作业保存在已完成的集中。
- `removeOnFail`: `boolean | number` - 如果为 true，则在所有尝试都失败后删除作业。一个数字指定要保留的作业数量。默认行为是将作业保留在失败集中。
- `stackTraceLimit`: `number` - 限制将在堆栈跟踪中记录的堆栈跟踪行数。

下面是一些使用工作选项定制工作的例子。

若要延迟作业的启动，请使用`delay`配置属性。

```typescript
const job = await this.audioQueue.add(
  {
    foo: 'bar',
  },
  { delay: 3000 }, // 3 seconds delayed
);
```

要将一个作业添加到队列的右端(将作业处理为 **LIFO** (后进先出))，请将配置对象的`lifo`属性设置为`true`。

```typescript
const job = await this.audioQueue.add(
  {
    foo: 'bar',
  },
  { lifo: true },
);
```

要对工作进行优先级排序，请使用`priority`属性。

```typescript
const job = await this.audioQueue.add(
  {
    foo: 'bar',
  },
  { priority: 2 },
);
```

## 消费者

consumer 是一个定义方法的 **类** ，用来处理添加到队列中的任务，或者监听队列上的事件，或者两者兼有。使用`@Processor()`装饰器来声明一个消费者类，如下所示:

```typescript
import { Processor } from '@nestjs/bull';

@Processor('audio')
export class AudioConsumer {}
```

!!! info "**Hint**"

    消费者必须注册为`providers`，这样`@nestjs/bull`包才能把他们取走。

其中，装饰器的字符串参数(e.g., `'audio'`)是要与类方法关联的队列的名称。

在消费者类中，通过使用`@Process()`装饰器装饰处理程序方法来声明作业处理程序。

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('audio')
export class AudioConsumer {
  @Process()
  async transcode(job: Job<unknown>) {
    let progress = 0;
    for (i = 0; i < 100; i++) {
      await doSomething(job.data);
      progress += 10;
      await job.progress(progress);
    }
    return {};
  }
}
```

每当 worker 空闲且队列中有作业需要处理时，就会调用这个装饰方法(例如, `transcode()`)。
这个处理程序方法接收`job`对象作为它的唯一参数。
处理程序方法返回的值存储在作业对象中，以后可以访问，例如在已完成事件的侦听器中访问。

`Job`对象有多个方法，允许你与它们的状态进行交互。
例如，上面的代码使用`progress()`方法来更新作业的进度。
请参阅[这里](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#job)获得完整的`Job`对象 API 参考。

你可以指定一个作业处理方法将只处理特定类型的作业(带有特定`name`的作业)，方法是将这个`name`传递给`@Process()`装饰器，如下所示。
在一个给定的消费者类中，可以有多个`@Process()`处理程序，对应于每个作业类型(`name`)。
在使用命名作业时，请确保每个名称对应一个处理程序。

```typescript
@Process('transcode')
async transcode(job: Job<unknown>) { ... }
```

## 请求范围内消费者

当一个消费者被标记为请求作用域(了解更多关于注入作用域的信息[这里](/fundamentals/injection-scopes#provider-scope))时，类的一个新实例将专门为每个作业创建。
该实例将在任务完成后被垃圾回收。

```typescript
@Processor({
  name: 'audio',
  scope: Scope.REQUEST,
})
```

由于请求作用域的消费者类是动态实例化的，并且作用域为单个作业，所以您可以使用标准方法通过构造函数注入`JOB_REF`。

```typescript
constructor(@Inject(JOB_REF) jobRef: Job) {
  console.log(jobRef);
}
```

!!! info "**Hint**"

    令牌`JOB_REF`是从`@nestjs/bull`包中导入的。

## 事件监听器

当队列和/或作业状态发生变化时，Bull 会生成一组有用的事件。Nest 提供了一组装饰器，允许订阅一组核心标准事件。这些都是从`@nestjs/bull`包中导出的。

事件监听器必须在[consumer](techniques/queues#consumers)类中声明(例如，在一个用`@Processor()`装饰器装饰的类中)。
要监听一个事件，请使用下表中的一个装饰器来声明该事件的处理程序。
例如，要监听当作业进入`audio`队列中的活动状态时发出的事件，可以使用以下构造:

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('audio')
export class AudioConsumer {

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }
  ...
```

由于 Bull 是在分布式(多节点)环境中运行的，因此它定义了事件局部性的概念。
这个概念认识到，事件可以完全在单个进程中触发，也可以在来自不同进程的共享队列上触发。
**局部** 事件是在本地进程中的队列上触发动作或状态改变时产生的事件。
换句话说，当事件的生产者和消费者是单个进程的本地时，队列上发生的所有事件也是本地的。

当一个队列在多个进程之间共享时，我们可能会遇到 **全局** 事件。
为了让一个进程中的侦听器接收由另一个进程触发的事件通知，它必须注册一个全局事件。

事件处理程序在触发相应事件时被调用。
使用下表所示的签名调用处理程序，提供对与事件相关的信息的访问。
下面我们将讨论局部事件处理程序签名和全局事件处理程序签名之间的一个关键区别。

<table>
  <tr>
    <th>本地事件监听器</th>
    <th>全球事件监听器</th>
    <th>Handler方法签名/何时触发</th>
  </tr>
  <tr>
    <td><code>@OnQueueError()</code></td><td><code>@OnGlobalQueueError()</code></td><td><code>handler(error: Error)</code> - 一个错误发生。<code>error</code>包含触发错误。</td>
  </tr>
  <tr>
    <td><code>@OnQueueWaiting()</code></td><td><code>@OnGlobalQueueWaiting()</code></td><td><code>handler(jobId: number | string)</code> - 当一个工人空闲时，一个Job正在等待被处理。<code>jobId</code>包含已进入该状态的作业的id。</td>
  </tr>
  <tr>
    <td><code>@OnQueueActive()</code></td><td><code>@OnGlobalQueueActive()</code></td><td><code>handler(job: Job)</code> - Job <code>job</code>已经开始。 </td>
  </tr>
  <tr>
    <td><code>@OnQueueStalled()</code></td><td><code>@OnGlobalQueueStalled()</code></td><td><code>handler(job: Job)</code> - Job <code>job</code> 已被标记为停滞。 这对于调试崩溃或暂停事件循环的作业操作者非常有用。</td>
  </tr>
  <tr>
    <td><code>@OnQueueProgress()</code></td><td><code>@OnGlobalQueueProgress()</code></td><td><code>handler(job: Job, progress: number)</code> - Job <code>job</code>的进度被更新为值<code>progress</code>.</td>
  </tr>
  <tr>
    <td><code>@OnQueueCompleted()</code></td><td><code>@OnGlobalQueueCompleted()</code></td><td><code>handler(job: Job, result: any)</code> Job <code>job</code>成功完成，结果<code>result</code>。</td>
  </tr>
  <tr>
    <td><code>@OnQueueFailed()</code></td><td><code>@OnGlobalQueueFailed()</code></td><td><code>handler(job: Job, err: Error)</code> Job <code>job</code> 失败，原因<code>err</code>。</td>
  </tr>
  <tr>
    <td><code>@OnQueuePaused()</code></td><td><code>@OnGlobalQueuePaused()</code></td><td><code>handler()</code> 队列已暂停。</td>
  </tr>
  <tr>
    <td><code>@OnQueueResumed()</code></td><td><code>@OnGlobalQueueResumed()</code></td><td><code>handler(job: Job)</code> 队列已恢复。</td>
  </tr>
  <tr>
    <td><code>@OnQueueCleaned()</code></td><td><code>@OnGlobalQueueCleaned()</code></td><td><code>handler(jobs: Job[], type: string)</code> 以前的工作已经从队列中清除了。 <code>jobs</code>是清理后的job的数组，<code>type</code>是清理后的job的类型。</td>
  </tr>
  <tr>
    <td><code>@OnQueueDrained()</code></td><td><code>@OnGlobalQueueDrained()</code></td><td><code>handler()</code> 当队列处理完所有等待的作业时触发(即使可能有一些延迟的作业尚未处理)。</td>
  </tr>
  <tr>
    <td><code>@OnQueueRemoved()</code></td><td><code>@OnGlobalQueueRemoved()</code></td><td><code>handler(job: Job)</code> Job <code>job</code> 已成功删除。</td>
  </tr>
</table>

当监听全局事件时，方法签名可能与它们的本地对等物略有不同。
具体来说，任何在本地版本中接收`job`对象的方法签名，都会在全局版本中接收到一个`jobId`(`number`)。
在这种情况下，要获取对实际`job`对象的引用，请使用`Queue#getJob`方法。这个调用应该被等待，因此处理程序应该被声明为`async`。
例如:

```typescript
@OnGlobalQueueCompleted()
async onGlobalCompleted(jobId: number, result: any) {
  const job = await this.immediateQueue.getJob(jobId);
  console.log('(Global) on completed: job ', job.id, ' -> result: ', result);
}
```

!!! info "**Hint**"

    要访问`Queue`对象(调用`getJob()`)，你当然必须注入它。此外，Queue 必须在注入它的模块中注册。

除了特定的事件监听器装饰器，你还可以使用通用的`@OnQueueEvent()`装饰器结合`BullQueueEvents`或`BullQueueGlobalEvents`枚举。
阅读更多关于事件的信息[这里](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#events).

## 队列管理

Queue 的 API 允许您执行管理功能，比如暂停和恢复，检索处于不同状态的作业的计数，等等。
你可以在[这里](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)找到完整的队列 API.
直接在`Queue`对象上调用这些方法，如下面的 pause/resume 示例所示。

使用`Pause()`方法调用暂停队列。暂停的队列在恢复之前不会处理新作业，但正在处理的当前作业将继续处理，直到它们完成为止。

```typescript
await audioQueue.pause();
```

要恢复暂停的队列，请使用`resume()`方法，如下所示:

```typescript
await audioQueue.resume();
```

## 独立的进程

作业处理程序也可以在单独的(分叉的)进程中运行 ([source](https://github.com/OptimalBits/bull#separate-processes)).
这有几个优点:

- 这个进程是沙箱化的，所以即使它崩溃了，也不会影响工作进程。
- 您可以在不影响队列的情况下运行阻塞代码(作业不会停止)。
- 更好地利用多核 cpu。
- 减少与 redis 的连接。

```ts
@@filename(app.module)
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { join } from 'path';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audio',
      processors: [join(__dirname, 'processor.js')],
    }),
  ],
})
export class AppModule {}
```

请注意，因为你的函数是在一个分叉的进程中执行的，所以依赖注入(和 IoC 容器)将不可用。
这意味着您的处理器函数将需要包含(或创建)它需要的所有外部依赖项实例。

```ts
@@filename(processor)
import { Job, DoneCallback } from 'bull';

export default function (job: Job, cb: DoneCallback) {
  console.log(`[${process.pid}] ${JSON.stringify(job.data)}`);
  cb(null, 'It works');
}
```

## 异步的配置

你可能想异步传递`bull`选项，而不是静态传递。
在这种情况下，使用`forRootAsync()`方法，它提供了几种处理异步配置的方法。
同样，如果你想异步传递队列选项，请使用`registerQueueAsync()`方法。

一种方法是使用工厂函数:

```typescript
BullModule.forRootAsync({
  useFactory: () => ({
    redis: {
      host: 'localhost',
      port: 6379,
    },
  }),
});
```

我们的工厂行为类似于任何其他的[异步提供程序](https://docs.nestjs.com/fundamentals/async-providers) (例如，它可以是`async`，并且可以通过`inject`注入依赖项。).

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    redis: {
      host: configService.get('QUEUE_HOST'),
      port: +configService.get('QUEUE_PORT'),
    },
  }),
  inject: [ConfigService],
});
```

或者，你可以使用`useClass`语法:

```typescript
BullModule.forRootAsync({
  useClass: BullConfigService,
});
```

上面的构造将在`BullModule`中实例化`BullConfigService`，并通过调用`createSharedConfiguration()`来提供一个选项对象。
注意，这意味着`BullConfigService`必须实现`SharedBullConfigurationFactory`接口，如下所示:

```typescript
@Injectable()
class BullConfigService implements SharedBullConfigurationFactory {
  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: {
        host: 'localhost',
        port: 6379,
      },
    };
  }
}
```

为了防止在`BullModule`中创建`BullConfigService`，并使用从不同模块导入的提供器，你可以使用`useExisting`语法。

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

这个构造的工作原理与`useClass`相同，但有一个关键的区别 -- `BullModule`将查找导入的模块来重用现有的`ConfigService`，而不是实例化一个新的。

## 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/26-queues).
