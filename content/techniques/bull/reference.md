---
title: "参考"
linkTitle: ""
weight: 3
---

## 队列

```ts
Queue(queueName: string, url?: string, opts?: QueueOptions): Queue
```

这是 Queue 构造函数。
它创建了一个新的 Queue 持久化在 Redis 中。
每次实例化同一个队列时，它都会尝试处理以前未完成会话中可能存在的所有旧作业。

可选的 `url` 参数，允许指定一个 redis 连接字符串，例如: `redis://mypassword@myredis.server.com:1234`

```typescript
interface QueueOptions {
  createClient?(type: "client" | "subscriber" | "bclient", config?: Redis.RedisOptions): Redis.Redis | Redis.Cluster;
  limiter?: RateLimiter;
  redis?: RedisOpts;
  prefix?: string = "bull"; // prefix for all queue keys.
  metrics?: MetricsOpts; // Configure metrics
  defaultJobOptions?: JobOpts;
  settings?: AdvancedSettings;
}
```

```typescript
interface MetricsOpts {
  maxDataPoints?: number; //  Max number of data points to collect, granularity is fixed at one minute.
}
```

```typescript
interface RateLimiter {
  max: number; // Max number of jobs processed
  duration: number; // per duration in milliseconds
  bounceBack?: boolean = false; // When jobs get rate limited, they stay in the waiting queue and are not moved to the delayed queue
  groupKey?: string; // allows grouping of jobs with the specified key from the data object passed to the Queue#add (ex.
"network.handle")
}
```

`RedisOpts` 直接传递给 ioredis 构造函数，请查看[ioredis](https://github.com/luin/ioredis/blob/master/API.md)了解详细信息。
我们在这里只记录最重要的。

```typescript
interface RedisOpts {
  port?: number = 6379;
  host?: string = localhost;
  db?: number = 0;
  password?: string;
}
```

```typescript
interface AdvancedSettings {
  lockDuration: number = 30000; // Key expiration time for job locks.
  lockRenewTime: number = 15000; // Interval on which to acquire the job lock
  stalledInterval: number = 30000; // How often check for stalled jobs (use 0 for never checking).
  maxStalledCount: number = 1; // Max amount of times a stalled job will be re-processed.
  guardInterval: number = 5000; // Poll interval for delayed jobs and added jobs.
  retryProcessDelay: number = 5000; // delay before processing next job in case of internal error.
  backoffStrategies: {}; // A set of custom backoff strategies keyed by name.
  drainDelay: number = 5; // A timeout for when the queue is in drained state (empty waiting for jobs).
  isSharedChildPool: boolean = false; // enables multiple queues on the same instance of child pool to share the same instance.
}
```

#### 自定义或共享 IORedis 连接

`createClient` 被传递一个 `type` 来指定 Bull 试图创建的连接的类型，以及 `Bull` 想要为该连接设置的一些选项。

您可以将提供的选项与您自己的一些选项合并，并创建一个 `ioredis` 连接。

当 type 为 `client` 或 `subscriber` 时，你可以为多个队列返回相同的连接，这可以减少你打开到 redis 服务器的连接数。
当队列关闭时，Bull 不会关闭或断开这些连接，所以如果你需要让你的应用程序做一个优雅的关闭，你需要保留对这些连接的引用
Redis 在某个地方连接，并在关闭所有队列后断开连接。

然而， `bclient` 连接是一个 `阻塞客户端` ，用于每次等待单个队列上的新作业。
因此，它不能被共享，每次都应该返回一个新的连接。

#### 高级设置

**警告:** 不要覆盖这些高级设置，除非你了解队列的内部。

`lockDuration` :获取作业锁的时间，以毫秒为单位。
如果您发现您的作业因为您的作业处理器是 cpu 密集型的并且阻塞了事件循环而被暂停，那么将这个值设置为一个更高的值(请参阅下面关于暂停作业的说明)。
如果您的作业对时间非常敏感，则将此值设置为较低的值，并且如果它们被重复处理(因为它们被错误地认为是暂停的)，则此值可能是可以的。

`lockRenewTime` :以毫秒为单位的获取作业锁的时间间隔。
默认设置为 `lockDuration / 2` ，以便在每次作业锁到期前提供足够的缓冲区来更新锁。
它不应该设置大于 `lockDuration` 的值。
如果发现作业由于 cpu 密集型作业处理器功能而陷入停顿，则将此值设置为较低的值。
不过一般来说，你不应该改变这个。

`stalledInterval` :以毫秒为单位的时间间隔，每个 worker 将在此时间间隔内检查暂停的作业(例如:
处于 `活动` 状态的未锁定作业)。
见下面关于停滞的工作的说明。
如果您的作业对时间非常敏感，请将此值设置为较低的值。
如果你的 Redis CPU 使用率很高，设置一个更高的值，因为这个检查可能会很昂贵。
请注意，因为每个 worker 都在自己的时间间隔内运行它，并检查整个队列，所以被暂停的作业实际运行的频率要比这个值所暗示的高得多。

`maxStalledCount` :在出现 `作业停止超过允许限制` 错误而导致作业永久失败之前，作业可以重新启动的最大次数。
这被设置为默认值 `1` ，假设暂停的作业非常罕见(只由于进程崩溃)，并且您希望更安全一点，不要重新启动作业。
如果作业经常宕机(例如进程经常崩溃)，则设置更高的值，这样就可以将处理作业加倍。

`guardInterval` :延迟作业 watchdog 运行的时间间隔(以毫秒为单位)。
当运行多个具有延迟任务的并发 worker 时， `guardInterval` 的默认值会导致网络带宽、cpu 占用率和内存占用率出现峰值。
每个并发的工人将运行延迟的工作监督程序。
在本例中，将该值设置为更高的值。 `guardInterval = numberOfWorkers * 5000` 。
设置一个较低的值，如果你的 Redis 连接不稳定，延迟的工作没有被及时处理。

`retryProcessDelay` :在遇到 Redis 错误时，在尝试处理任务之前等待的时间(以毫秒为单位)。
在不稳定的 Redis 连接上设置一个较低的值。

`backoffStrategies` :一个包含自定义 backoffStrategies 的对象。
对象中的键是策略的名称，值是应该返回以毫秒为单位的延迟的函数。
完整的例子参见[Patterns](./ Patterns .md#custom-backoff-strategy)。

`drainDelay` :队列处于 `drain` 状态(空等待作业)时的超时。
它在调用 `queue.getNextJob()` 时使用，它将把它传递给`。brpoplpush` 在 Redis 客户端。

```js
backoffStrategies: {
  jitter: function () {
    return 5000 + Math.random() * 500;
  }
}
```

---

### Queue#process

```ts
/**
 * 可以将这些函数视为重载函数。
 * 由于方法重载不存在于文本中，公牛通过检查参数的类型来识别所需的函数调用。
 * 确保您符合以下定义的模式之一。
 *
 * 注意:如果未指定，默认为1。
 */
process(processor: ((job, done?) => Promise<any>) | string)
process(concurrency: number, processor: ((job, done?) => Promise<any>) | string)
process(name: string, processor: ((job, done?) => Promise<any>) | string)
process(name: string, concurrency: number, processor: ((job, done?) => Promise<any>) | string)
```

定义给定队列中的作业的处理函数。

每次将作业放入队列时，都会调用回调。
将作业的一个实例作为第一个参数传递给它。

如果回调签名包含第二个可选的 `done` 参数，则回调将被传递一个 `done` 回调，以便在作业完成后调用。
`done` 回调函数可以与 Error 实例一起调用，表示作业没有成功完成，或者当作业成功时，将结果作为第二个参数(例如: `done(null, result);` )。
错误将作为第二个参数传递给 `failed` 事件;结果将作为第二个参数传递给 `completed` 事件。

但是，如果回调签名不包含 `done` 参数，则必须返回一个 promise 来表示作业完成。
如果 promise 被拒绝，则错误将作为第二个参数传递给 `failed` 事件。
如果它被解析，它的值将是 `完成` 事件的第二个参数。

你可以指定一个`并发`参数。
然后，Bull 将根据这个最大值并行调用处理程序。

流程功能也可以声明为单独的流程。
这将更好地利用可用的 CPU 内核，并并行运行作业。
这是运行阻塞代码的完美方式。
只需指定到处理器模块的绝对路径。
例如，一个像这样导出 process 函数的文件:

```js
// my-processor.js
module.exports = function (job) {
  // do some job

  return value;
};
```

您可以返回一个值或承诺来表示作业已经完成。

可以提供一个 `name` 参数，以便每个队列可以定义多个进程函数。
命名进程将只处理与给定名称匹配的作业。
但是，如果在一个 Queue 中定义了多个命名进程函数，则每个进程函数定义的并发性将堆叠到 Queue 中。
请看下面的例子:

```js
/***
 * 对于每个命名的处理器，并发性叠加在一起，因此这三个进程函数中的任何一个都可以以125并发性运行。
 * 为了避免这种行为，您需要为每个进程函数创建一个自己的队列。
 */
const loadBalancerQueue = new Queue("loadbalancer");
loadBalancerQueue.process("requestProfile", 100, requestProfile);
loadBalancerQueue.process("sendEmail", 25, sendEmail);
loadBalancerQueue.process("sendInvitation", 0, sendInvite);

const profileQueue = new Queue("profile");
// Max concurrency for requestProfile is 100
profileQueue.process("requestProfile", 100, requestProfile);

const emailQueue = new Queue("email");
// Max concurrency for sendEmail is 25
emailQueue.process("sendEmail", 25, sendEmail);
```

指定 `*` 作为进程名将使其成为所有已命名作业的默认处理器。
它经常用于从一个进程函数中处理所有已命名的作业:

```js
const differentJobsQueue = new Queue("differentJobsQueue");
differentJobsQueue.process("*", processFunction);
differentJobsQueue.add("jobA", data, opts);
differentJobsQueue.add("jobB", data, opts);
```

**注意:** 为了确定是否通过返回 promise 或调用 `done` 回调来通知任务完成，Bull 会查看你传递给它的回调的长度属性。

所以要小心，因为下面的方法是行不通的:

```js
// THIS WON'T WORK!!
queue.process(function (job, done) {
  // Oops! done callback here!
  return Promise.resolve();
});
```

This, however, will:

```js
queue.process(function (job) {
  // No done callback here :)
  return Promise.resolve();
});
```

---

### Queue#add

```ts
add(name?: string, data: object, opts?: JobOpts): Promise<Job>
```

创建一个新作业并将其添加到队列中。
如果队列为空，则直接执行作业，否则将被放入队列并尽快执行。

可以添加一个可选名称，以便只有为该名称(也称为作业类型)定义的流程函数将处理该作业。

**注意:** 您需要为添加到队列中的所有已命名作业定义*processors*，否则队列将报错给定作业缺少一个处理器，除非您在定义处理器时使用 `*` 作为作业名称。

```typescript
interface JobOpts {
  priority: number; // Optional priority value.ranges from 1 (highest priority) to MAX_INT  (lowest priority).
  // Note that using priorities has a slight impact on performance, so do not use it if not required.

  delay: number; // An amount of milliseconds to wait until this job can be processed.
  // Note that for accurate delays, both server and clients should have their clocks synchronized.[optional].

  attempts: number; // The total number of attempts to try the job until it completes.

  repeat: RepeatOpts; // Repeat job according to a cron specification, see below for details.

  backoff: number | BackoffOpts; // Backoff setting for automatic retries if the job fails, default strategy: `fixed`.
  // Needs `attempts` to be set.

  lifo: boolean; // if true, adds the job to the right of the queue instead of the left (default false)
  timeout: number; // The number of milliseconds after which the job should fail with a timeout error [optional]

  jobId: number | string; // Override the job ID - by default, the job ID is a unique integer, but you can use this setting to override it.
  // If you use this option, it is up to you to ensure the jobId is unique.
  // If you attempt to add a job with an id that already exists, it will not be added (see caveat below about repeatable jobs).

  removeOnComplete: boolean | number | KeepJobs; // If true, removes the job when it successfully completes.
  // A number specified the amount of jobs to keep.
  // Default behavior is to keep the job in the completed set.
  // See KeepJobs if using that interface instead.

  removeOnFail: boolean | number | KeepJobs; // If true, removes the job when it fails after all attempts.
  // A number specified the amount of jobs to keep, see KeepJobs if using that interface instead.
  // Default behavior is to keep the job in the failed set.
  stackTraceLimit: number; // Limits the amount of stack trace lines that will be recorded in the stacktrace.
}
```

#### KeepJobs 选项

```typescript
/**
 * KeepJobs
 *
 * Specify which jobs to keep after finishing.
 * If both age and count are  * specified, then the jobs kept will be the ones that satisfies both properties.
 */
export interface KeepJobs {
  /**
   * Maximum age in *seconds* for job to be kept.
   */
  age?: number;

  /**
   * Maximum count of jobs to be kept.
   */
  count?: number;
}
```

---

#### 超时的实现

务必注意，在给定的 `超时` 之后，作业不会被主动停止。
作业被标记为失败，作业的承诺被拒绝，但是 Bull 没有办法从外部停止处理器功能。

如果您需要一个作业在超时后停止处理，这里有一些建议:

- 让作业本身定期检查 `job. getstatus()` ，如果状态变为 `failed` 则退出。
- 将作业实现为一个可取消承诺\_。
  如果处理器 promise 有一个 `cancel()` 方法，它将在作业超时时被调用，作业可以相应地响应。
  (注:目前这只适用于原生承诺，参见[#2203](https://github.com/OptimalBits/bull/issues/2203)
- 如果您有一种从外部停止作业的方法，那么为 `failed` 事件添加一个侦听器，并在那里执行该操作。

#### 重复的工作细节

```typescript
interface RepeatOpts {
  cron?: string; // Cron string
  tz?: string; // Timezone
  startDate?: Date | string | number; // Start date when the repeat job should start repeating (only with cron).
  endDate?: Date | string | number; // End date when the repeat job should stop repeating.
  limit?: number; // Number of times the job should repeat at max.
  every?: number; // Repeat every millis (cron setting cannot be used together with this setting.)
  count?: number; // The start value for the repeat iteration count.
  readonly key: string; // The key for the repeatable job metadata in Redis.
}
```

添加带有 `repeat` 选项集的作业实际上会立即完成两件事情:创建一个 Repeatable job 配置，以及在作业第一次运行时调度一个常规的延迟作业。
第一次运行将被安排为 `按小时` 运行，也就是说，如果您创建了一个在 4:07 每 15 分钟重复一次的作业，那么该作业将首先在 4:15 运行，然后是 4:30，依此类推。
如果设置了 `startDate` ，作业将不会在 `startDate` 之前运行，但仍然会按小时运行。
在前面的示例中，如果将 `startDate` 设置为某一天的 6:05，即当天，第一个作业将在 6:15 运行。

cron 表达式使用[cron-parser](https://github.com/harrisiirak/cron-parser)库，请参阅它们的文档以了解更多细节。

可重复作业配置不是作业，因此它不会出现在 `getJobs()` 等方法中。
要管理可重复作业配置，请使用[`getRepeatableJobs()`](#queuegetrepeatablejobs)或类似的方法。
这也意味着重复作业不参与评估 `jobId` 的唯一性——也就是说，一个不可重复作业可以具有与可重复作业配置相同的 `jobId` ，而两个可重复作业配置可以具有相同的 `jobId` ，只要它们具有不同的重复选项。

也就是说，以下代码将导致创建三个任务(一个是立即的，两个是延迟的):

```ts
await queue.add({}, { jobId: "example", repeat: { every: 5 * 1000 } });
await queue.add({}, { jobId: "example", repeat: { every: 5 * 1000 } }); // Will not be created, same repeat configuration
await queue.add({}, { jobId: "example", repeat: { every: 10 * 1000 } }); // Will be created, different repeat configuration
await queue.add({}, { jobId: "example" }); // Will be created, no regular job with this id
await queue.add({}, { jobId: "example" }); // Will not be created, conflicts with previous regular job
```

#### 补偿选项

```typescript
interface BackoffOpts {
  type: string; // Backoff type, which can be either `fixed` or `exponential`.
  // A custom backoff strategy can also be specified in `backoffStrategies` on the queue settings.
  delay: number; // Backoff delay, in milliseconds.
}
```

---

### Queue#addBulk

```ts
addBulk(jobs: { name?: string, data: object, opts?: JobOpts }[]): Promise<Job[]>
```

创建作业数组并将它们添加到队列中。
它们的签名与[Queue#add](#queueadd)相同。

---

### Queue#pause

```ts
pause(isLocal?: boolean, doNotWaitActive?: boolean): Promise
```

返回一个在队列暂停时解析的承诺。
暂停的队列在恢复之前不会处理新作业，但正在处理的当前作业将继续，直到完成。
暂停可以是全局的，也可以是局部的。
如果是全局的，那么给定队列的所有队列实例中的所有 worker 都将被暂停。
如果是本地的，在当前锁过期后，只有这个 worker 将停止处理新作业。
这对于阻止工人在倒闭前接受新工作是很有用的。

如果 `doNotWaitActive` 为 `true` ， `pause` 将不会等待任何活动作业完成后再解析。
否则， `pause `\_将等待活动的作业完成。
更多信息请参见[Queue#whenCurrentJobsFinished](#queuewhencurrentjobsfinished)。

暂停已经暂停的队列不会做任何事情。

---

### Queue#isPaused

```ts
isPaused(isLocal?: boolean): Promise<boolean>
```

检查队列是否被暂停。
如果需要知道这个特定实例是否暂停，则传递 true。

---

### Queue#resume

```ts
resume(isLocal?: boolean): Promise
```

返回一个承诺，该承诺在暂停后恢复队列时解析。
简历可以是本地的，也可以是全球的。
如果是全局的，那么给定队列的所有队列实例中的所有 worker 都将被恢复。
如果是本地的，只有这个工人将被恢复。
注意全局恢复队列不会恢复已经在本地暂停的 worker;对于这些，必须在它们的实例上直接调用 `resume(true)` 。

恢复未暂停的队列不会执行任何操作。

---

### Queue#whenCurrentJobsFinished

```ts
whenCurrentJobsFinished(): Promise<Void>
```

返回一个承诺，该承诺在当前由该工人处理的所有作业完成时解决。

---

### Queue#count

```ts
count(): Promise<number>
```

返回一个 promise，该 promise 返回队列中等待或延迟的作业数量。
由于可能有其他进程添加或处理作业，因此该值可能只在非常短的时间内为真。

---

### Queue#removeJobs

```ts
removeJobs(pattern: string): Promise<void>
```

删除 jobId 匹配给定模式的所有作业。
模式必须遵循 redis 全局样式模式(语法)[https://redis.io/commands/keys]

例子:

```js
myQueue.removeJobs("?oo*").then(function () {
  console.log("done removing jobs");
});
```

将删除 id 为: `boo` 、 `foofighter` 等的工作。

注意:此方法不影响可重复作业配置，而是使用[`removeRepeatable()`](#queueremoverepeatable)或[`removeRepeatableByKey()`](#queueremoverepeatablebykey)

---

### Queue#empty

```ts
empty(): Promise
```

清空一个队列，删除所有*input*列表和关联的作业。

注意:此函数只删除正在等待队列处理或被延迟处理的作业。
处于其他状态(活动、失败、已完成)的作业和可重复作业配置将保持不变，可重复作业将继续按计划创建。

要删除其他作业状态，请使用[`clean()`](#queueobliterate)，要删除包括 Repeatable job 配置在内的所有配置，请使用[`obliterate()`](#queueobliterate)。

---

### Queue#close

```ts
close(doNotWaitJobs?: boolean): Promise
```

关闭底层 Redis 客户端。
使用它来执行一个优雅的关闭。

```js
const Queue = require("bull");
const queue = Queue("example");

const after100 = _.after(100, function () {
  queue.close().then(function () {
    console.log("done");
  });
});

queue.on("completed", after100);
```

`close` 可以在任何地方调用，但有一点需要注意:如果在作业处理程序内部调用，则队列直到作业处理完毕才会关闭，所以下面的语句不起作用:

```js
queue.process(function (job, jobDone) {
  handle(job);
  queue.close().then(jobDone);
});
```

相反,这样做:

```js
queue.process(function (job, jobDone) {
  handle(job);
  queue.close();
  jobDone();
});
```

Or this:

```js
queue.process(function (job) {
  queue.close();
  return handle(job).then(...);
});
```

---

### Queue#getJob

```ts
getJob(jobId: string): Promise<Job>
```

返回一个 promise，该 promise 将返回与 `jobId` 参数相关联的作业实例。
如果指定的作业无法找到，承诺将被解析为 `null` 。

注意: 此方法不返回可重复作业配置，参见[`getRepeatableJobs()`](#queuegetrepeatablejobs)

### Queue#getJobs

```ts
getJobs(types: JobStatus[], start?: number, end?: number, asc?: boolean): Promise<Job[]>
```

返回一个 promise，该 promise 将返回给定作业状态的作业实例数组。
提供了范围和顺序的可选参数。

注意: `start` 和 `end` 选项适用于每个**作业状态**。
例如，如果有 10 个作业处于`completed`状态，10 个作业处于`active`状态， `getJobs(['completed'，'active']， 0,4)` 将生成一个包含 10 个条目的数组，表示前 5 个已完成的作业(0 - 4)和前 5 个活动的作业(0 - 4)。

此方法不返回可重复作业配置，参见[`getRepeatableJobs()`](#queuegetrepeatablejobs)

---

### Queue#getJobLogs

```ts
getJobLogs(jobId: string, start?: number, end?: number): Promise<{
  logs: string[],
  count: number
}>
```

根据 start 和 end 参数返回带有日志的对象。
返回的计数值是日志的总量，这对于实现分页很有用。

---

### Queue#getRepeatableJobs

```ts
getRepeatableJobs(start?: number, end?: number, asc?: boolean): Promise<{
          key: string,
          name: string,
          id: number | string,
          endDate: Date,
          tz: string,
          cron: string,
          every: number,
          next: number
        }[]>
```

返回一个 promise，该 promise 将返回一个可重复作业配置数组。
提供了范围和顺序的可选参数。

---

### Queue#removeRepeatable

```ts
removeRepeatable(name?: string, repeat: RepeatOpts): Promise<void>
```

删除给定的可重复作业配置。
RepeatOpts 需要与添加作业时使用的相同。

---

---

### Queue#removeRepeatableByKey

```ts
removeRepeatableByKey(key: string): Promise<void>
```

通过键删除给定的可重复作业配置，以便不再为该特定配置处理任何可重复作业。

目前有两种方法可以获得可重复工作的 `关键` 。

当第一次创建作业时， `queue.add()` 将返回一个带有该作业键值的作业对象，你可以将其存储起来供以后使用:

```ts
const job = await queue.add("remove", { example: "data" }, { repeat: { every: 1000 } });
// store job.opts.repeat.key somewhere...
const repeatableKey = job.opts.repeat.key;

// ...then later...
await queue.removeRepeatableByKey(repeatableKey);
```

否则，你可以使用[`getRepeatableJobs()`](#queuegetrepeatablejobs)列出所有可重复的作业，在列表中找到你想要删除的作业，并使用那里的键来删除它:

```ts
await queue.add("remove", { example: "data" }, { jobId: "findMe", repeat: { every: 1000 } });

// ...
then later ...
const repeatableJobs = await queue.getRepeatableJobs();
const foundJob = repeatableJobs.find((job) => job.id === "findMe");
await queue.removeRepeatableByKey(foundJob.key);
```

---

### Queue#getJobCounts

```ts
getJobCounts() : Promise<JobCounts>
```

返回一个 promise，该 promise 将返回给定队列的作业计数。

```typescript{
  interface JobCounts {
    waiting: number,
    active: number,
    completed: number,
    failed: number,
    delayed: number
  }
}
```

---

### Queue#getCompletedCount

```ts
getCompletedCount() : Promise<number>
```

返回一个 promise，该 promise 将返回给定队列中已完成的作业计数。

### Queue#getFailedCount

```ts
getFailedCount() : Promise<number>
```

返回一个 promise，该 promise 将返回给定队列的失败作业计数。

### Queue#getDelayedCount

```ts
getDelayedCount() : Promise<number>
```

返回一个承诺，该承诺将返回给定队列的延迟作业计数。

### Queue#getActiveCount

```ts
getActiveCount() : Promise<number>
```

返回一个承诺，该承诺将返回给定队列的活动作业计数。

### Queue#getWaitingCount

```ts
getWaitingCount() : Promise<number>
```

返回一个 promise，该 promise 将返回给定队列的等待作业计数。

### Queue#getPausedCount

_弃用_ 因为只有队列可以暂停，所以 getWaitingCount 会给出相同的结果。

```ts
getPausedCount() : Promise<number>
```

返回一个承诺，该承诺将返回给定队列的暂停作业计数。

### Getters

下面的方法用于获取处于特定状态的作业。

GetterOpts 可以用于从 getter 中配置某些方面。

```ts
interface GetterOpts
  excludeData: boolean; // Exclude the data field of the jobs.
```

### Queue#getWaiting

```ts
getWaiting(start?: number, end?: number, opts?: GetterOpts) : Promise<Array<Job>>
```

返回一个 promise，该 promise 将返回一个数组，其中包含开始和结束之间的等待作业。

### Queue#getActive

```ts
getActive(start?: number, end?: number, opts?: GetterOpts) : Promise<Array<Job>>
```

返回一个 promise，该 promise 将返回一个数组，其中包含开始和结束之间的活动作业。

### Queue#getDelayed

```ts
getDelayed(start?: number, end?: number, opts?: GetterOpts) : Promise<Array<Job>>
```

返回一个 promise，该 promise 将返回一个数组，其中包含开始和结束之间的延迟作业。

### Queue#getCompleted

```ts
getCompleted(start?: number, end?: number, opts?: GetterOpts) : Promise<Array<Job>>
```

返回一个 promise，该 promise 将返回一个数组，其中包含开始和结束之间已完成的作业。

### Queue#getFailed

```ts
getFailed(start?: number, end?: number, opts?: GetterOpts) : Promise<Array<Job>>
```

返回一个 promise，该 promise 将返回一个数组，其中包含开始和结束之间失败的作业。

### Queue#getWorkers

```ts
getWorkers() : Promise<Array<Object>>
```

返回一个 promise，该 promise 将解析为当前正在侦听或处理作业的数组工作者。
该对象包含与[Redis CLIENT LIST](https://redis.io/commands/client-list)命令相同的字段。

---

### Queue#getMetrics

```ts
getMetrics(type: 'completed' | 'failed', start = 0, end = -1) : Promise<{
  meta: {
    count: number;
    prevTS: number;
    prevCount: number;
  };
  data: number[];
  count: number;
}>
```

返回一个解析为 Metrics 对象的承诺。

### Queue#clean

```ts
clean(grace: number, status?: string, limit?: number): Promise<number[]>
```

通知队列删除在宽限期之外创建的特定类型的作业。

#### Example

```js
queue.on("cleaned", function (jobs, type) {
  console.log("Cleaned %s %s jobs", jobs.length, type);
});

//cleans all jobs that completed over 5 seconds ago.
await queue.clean(5000);
//clean all jobs that failed over 10 seconds ago.
await queue.clean(10000, "failed");
```

### Queue#obliterate

```ts
obliterate(ops?: { force: boolean}): Promise<void>
```

完全删除一个队列及其所有数据。
为了消除队列，不能有活动作业，但可以使用 `force` 选项覆盖这种行为。

注意:由于此操作的持续时间可能相当长，这取决于队列中有多少作业，因此它不是自动执行的，而是迭代执行的。
然而，在此过程中队列总是暂停，如果队列在被另一个脚本删除期间取消暂停，则调用将失败，它设法删除的项目将被删除，直到失败。

#### 示例

```js
// Removes everything but only if there are no active jobs
await queue.obliterate();

await queue.obliterate({ force: true });
```

---

## 工作

作业包括执行作业所需的所有数据，以及更新作业进度所需的进度方法。

对于用户来说，最重要的属性是 `Job#data` ，它包括被传递给[`Queue#add`](#queueadd)的对象，通常用于执行作业。

### Job#progress

```ts
progress(progress?: number | object): Promise
```

如果使用参数调用，则更新作业进度。
如果没有参数调用，则返回一个解析当前作业进度的 promise。

#### Arguments

```js
  progress: number; Job progress number or any serializable object representing progress or similar.
```

---

### Job#log

```ts
log(row: string): Promise
```

向此作业特定的作业添加日志行。
可以使用[Queue#getJobLogs](#queuegetjoblogs)检索日志。

---

### Job#getState

```ts
getState(): Promise
```

返回一个承诺，解析当前作业的状态(完成、失败、延迟等)。
可能的返回有:完成的、失败的、延迟的、活动的、等待的、暂停的、卡住的或 null。

请注意，该方法的实现效率不是很高，也不是原子性的。
如果您的队列确实有大量作业，您可能希望避免使用此方法。

---

### Job#update

```ts
update(data: object): Promise
```

使用 give data 对象更新了作业数据字段。

### Job#remove

```ts
remove(): Promise
```

从队列和可能包含作业的任何列表中删除作业。

### Job#retry

```ts
retry(): Promise
```

重新运行失败的作业。
返回一个承诺，该承诺在作业计划重试时解决。

---

### Job#discard

```ts
discard(): Promise
```

即使 `attemptsMade` 小于 `job.attempts` ，也确保不再运行此作业。

### Job#promote

```ts
promote(): Promise
```

将当前被 `延迟` 的作业提升到 `等待` 状态，并尽快执行。

### Job#finished

```ts
finished(): Promise
```

返回一个承诺，该承诺在任务完成或失败时解析或拒绝。

### Job#moveToCompleted

```ts
moveToCompleted(returnValue: any, ignoreLock: boolean, notFetch?: boolean): Promise<string[Jobdata, JobId] | null>
```

将作业移动到 `已完成` 队列。
将一个作业从`waiting`拉到`active`，并返回一个包含下一个作业数据和 id 的元组。
如果 `等待` 队列中没有作业，则返回 null。
设置 `notFetch` 为 true 以避免预取队列中的下一个作业。

---

### Job#moveToFailed

```ts
moveToFailed(errorInfo:{ message: string; }, ignoreLock?:boolean): Promise<string[Jobdata, JobId] | null>
```

将作业移动到 `失败` 队列。
将一个作业从`waiting`拉到`active`，并返回一个包含下一个作业数据和 id 的元组。
如果 `等待` 队列中没有作业，则返回 null。

---

## 活动

队列也会发出一些有用的事件:

```js
.on('error', function (error) {
  // An error occured.
})

.on('waiting', function (jobId) {
  // A Job is waiting to be processed as soon as a worker is idling.
});

.on('active', function (job, jobPromise) {
  // A job has started.
  // You can use `jobPromise.cancel()`` to abort it.
})

.on('stalled', function (job) {
  // A job has been marked as stalled.
  // This is useful for debugging job workers that crash or pause the event loop.
})

.on('lock-extension-failed', function (job, err) {
  // A job failed to extend lock.
  // This will be useful to debug redis connection issues and jobs getting restarted because workers are not able to extend locks.
});

.on('progress', function (job, progress) {
  // A job's progress was updated!
})

.on('completed', function (job, result) {
  // A job successfully completed with a `result`.
})

.on('failed', function (job, err) {
  // A job failed with reason `err`!
})

.on('paused', function () {
  // The queue has been paused.
})

.on('resumed', function (job) {
  // The queue has been resumed.
})

.on('cleaned', function (jobs, type) {
  // Old jobs have been cleaned from the queue.
`jobs` is an array of cleaned
  // jobs, and `type` is the type of jobs cleaned.
});

.on('drained', function () {
  // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
});

.on('removed', function (job) {
  // A job successfully removed.
});

```

### 全局事件

事件在默认情况下是本地的——换句话说，它们只触发在给定 worker 上注册的侦听器。
如果你需要全局监听事件，例如来自其他服务器的事件，只需在事件前加上`global: ''`:

```js
// Will listen locally, just to this queue...
queue.on('completed', listener):

// Will listen globally, to instances of this queue...
queue.on('global:completed', listener);
```

当处理全局事件时，局部事件将一个 `Job` 实例传递给事件监听器回调，注意全局事件传递的是作业的 ID。

如果你需要在全局监听器中访问 `Job` 实例，使用[Queue#getJob](#queuegetjob)来检索它。
但是，请记住，如果在添加作业时启用了 `removeOnComplete` ，则作业在完成后将不再可用。
如果您需要访问作业并在完成后删除它，您可以使用[job #remove](#jobremove)在侦听器中删除它。

```js
// Local events pass the job instance...
queue.on("progress", function (job, progress) {
  console.log(`Job ${job.id} is ${progress * 100}% ready!`);
});

queue.on("completed", function (job, result) {
  console.log(`Job ${job.id} completed! Result: ${result}`);
  job.remove();
});

// ...whereas global events only pass the job ID:
queue.on("global:progress", function (jobId, progress) {
  console.log(`Job ${jobId} is ${progress * 100}% ready!`);
});

queue.on("global:completed", function (jobId, result) {
  console.log(`Job ${jobId} completed! Result: ${result}`);
  queue.getJob(jobId).then(function (job) {
    job.remove();
  });
});
```
