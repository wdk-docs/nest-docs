# 任务调度

任务调度允许您安排任意代码(方法/函数)在固定的日期/时间、重复的间隔或在指定间隔后执行一次。
在 Linux 世界中，这通常是由像[cron](https://en.wikipedia.org/wiki/Cron)这样的包在操作系统级别上处理的。
对于 Node.js 应用程序，有几个包模拟了类似 cron 的功能。
Nest 提供了`@nestjs/schedule`包，它集成了流行的 Node.js [node-cron](https://github.com/kelektiv/node-cron)包。
我们将在本章中讨论这个包。

## 安装

要开始使用它，我们首先安装所需的依赖项。

```bash
$ npm install --save @nestjs/schedule
$ npm install --save-dev @types/cron
```

要激活作业调度，请将`ScheduleModule`导入到根模块`AppModule`中，并运行`forRoot()`静态方法，如下所示:

=== "app.module"

```ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
})
export class AppModule {}
```

`.forroot()`调用初始化调度器，并注册应用程序中存在的任何声明性[cron job](techniques/task-scheduling#declarative-cron-jobs)、[timeout](techniques/task-scheduling#declarative-timeout)和[interval](techniques/task-scheduling#declarative-interval)。
当`onApplicationBootstrap`生命周期钩子发生时，就会发生注册，以确保所有模块都已加载并声明了任何调度的作业。

## 声明式 cron jobs

cron 作业调度任意函数(方法调用)以自动运行。Cron 作业可以运行:

- 一次，在指定的日期/时间。
- 经常性地;循环作业可以在指定的时间间隔内(例如，每小时运行一次、每周运行一次、每 5 分钟运行一次)。

用`@Cron()`装饰器在包含要执行的代码的方法定义之前声明一个 cron 作业，如下所示:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('45 * * * * *')
  handleCron() {
    this.logger.debug('Called when the current second is 45');
  }
}
```

在这个例子中，`handleCron()`方法将在当前秒为`45`时被调用。
换句话说，该方法将在每分钟 45 秒时运行一次。

`@Cron()`装饰器支持所有标准的[cron 模式](http://crontab.org/):

- 星号 (e.g. `*`)
- 范围 (e.g. `1-3,5`)
- 步频 (e.g. `*/2`)

在上面的例子中，我们将`45 * * * * *`传递给装饰器。
下面的键显示了如何解释 cron 模式字符串中的每个位置:

<pre class="language-javascript"><code class="language-javascript">
* * * * * *
| | | | | |
| | | | | day of week
| | | | month
| | | day of month
| | hour
| minute
second (optional)
</code></pre>

一些样本 cron 模式是:

<table>
  <tbody>
    <tr>
      <td><code>* * * * * *</code></td>
      <td>每一秒</td>
    </tr>
    <tr>
      <td><code>45 * * * * *</code></td>
      <td>每一分钟，45秒</td>
    </tr>
    <tr>
      <td><code>0 10 * * * *</code></td>
      <td>每小时，第十分钟开始</td>
    </tr>
    <tr>
      <td><code>0 */30 9-17 * * *</code></td>
      <td>早上9点到下午5点每隔30分钟一次</td>
    </tr>
   <tr>
      <td><code>0 30 11 * * 1-5</code></td>
      <td>星期一至五上午11时30分</td>
    </tr>
  </tbody>
</table>

`@nestjs/schedule`包提供了一个方便的枚举，其中包含常用的 cron 模式。您可以按如下方式使用这个 enum:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron(CronExpression.EVERY_30_SECONDS)
  handleCron() {
    this.logger.debug('Called every 30 seconds');
  }
}
```

在这个例子中，`handleCron()`方法将每`30`秒被调用一次。

或者，你可以为`@Cron()`装饰器提供一个 JavaScript 的`Date`对象。
这样做会导致作业在指定日期只执行一次。

!!! info **提示** 使用 JavaScript 日期算法来安排相对于当前日期的作业。 例如，`@Cron(new Date(Date.now() + 10 * 1000))`来调度一个作业在应用程序启动 10 秒后运行。

此外，你可以提供额外的选项作为`@Cron()`装饰器的第二个参数。

<table>
  <tbody>
    <tr>
      <td><code>name</code></td>
      <td>
        在声明cron作业之后，访问和控制cron作业很有用。
      </td>
    </tr>
    <tr>
      <td><code>timeZone</code></td>
      <td>
        指定执行的时区。这将修改相对于您的时区的实际时间。如果时区无效，则抛出一个错误。您可以在[Moment Timezone](http://momentjs.com/timezone/)网站上查看所有可用的时区。
      </td>
    </tr>
    <tr>
      <td><code>utcOffset</code></td>
      <td>
        这允许您指定时区的偏移量，而不是使用<code>timezone</code>参数。
      </td>
    </tr>
  </tbody>
</table>

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationService {
  @Cron('* * 0 * * *', {
    name: 'notifications',
    timeZone: 'Europe/Paris',
  })
  triggerNotifications() {}
}
```

你可以在 cron 作业声明之后访问和控制它，或者使用[Dynamic API](/techniques/task-scheduling#dynamic-schedule-module-api)动态创建一个 cron 作业(在运行时定义它的 cron 模式)。
要通过 API 访问一个声明性的 cron 作业，你必须将`name`属性作为装饰器的第二个参数传递到一个可选的 options 对象中，从而将作业与一个名称关联起来。

## 声明式 interval

要声明一个方法应该以指定的(重复)时间间隔运行，请在方法定义前加上`@Interval()`装饰器。
将 interval 值以毫秒为单位传递给装饰器，如下所示:

```typescript
@Interval(10000)
handleInterval() {
  this.logger.debug('Called every 10 seconds');
}
```

!!! info **提示** 这个机制在底层使用了 JavaScript 的`setInterval()`函数。您还可以利用 cron 作业来调度循环作业。

如果你想通过[Dynamic API](/techniques/task-scheduling#dynamic-schedule-module-api)从外部控制你的声明性间隔，请使用以下构造将间隔与一个名称关联起来:

```typescript
@Interval('notifications', 2500)
handleInterval() {}
```

[Dynamic API](techniques/task-scheduling#dynamic-intervals)还支持 **创建**动态间隔，其中间隔的属性在运行时定义，并**列出和删除** 它们。

## 声明式 timeout

要声明一个方法应该在指定的超时时间运行(一次)，请在方法定义前加上`@Timeout()`装饰器。
将应用程序启动时的相对时间偏移(以毫秒为单位)传递给装饰器，如下所示:

```typescript
@Timeout(5000)
handleTimeout() {
  this.logger.debug('Called once after 5 seconds');
}
```

!!! info **提示** 这个机制在底层使用了 JavaScript 的`setTimeout()`函数。

如果你想通过[Dynamic API](/techniques/task-scheduling#dynamic-schedule-module-api)从外部控制你的声明性超时，请使用以下构造将超时与一个名称关联起来:

```typescript
@Timeout('notifications', 2500)
handleTimeout() {}
```

[Dynamic API](techniques/task-scheduling#dynamic-timeouts)还支持 **创建**动态超时，其中超时的属性在运行时定义，并**列出和删除** 它们。

## 动态调度模块 API

`@nestjs/schedule`模块提供了一个动态 API，支持管理声明式的[cron jobs](techniques/task-scheduling#declarative-cron-jobs)、[timeout](techniques/task-scheduling#declarative-timeout)和[interval](techniques/task-scheduling#declarative-interval)。
该 API 还支持创建和管理 **动态** cron jobs、timeout 和 interval，其中的属性是在运行时定义的。

## 动态 cron jobs

使用 `SchedulerRegistry` API，从你的代码中任何地方获取一个`CronJob`实例的名称引用。
首先，使用标准构造函数注入`SchedulerRegistry`:

```typescript
constructor(private schedulerRegistry: SchedulerRegistry) {}
```

!!! info "**Hint**"

    从`@nestjs/schedule`包中导入`SchedulerRegistry`。

然后像下面这样在类中使用它。假设一个 cron 作业是通过以下声明创建的:

```typescript
@Cron('* * 8 * * *', {
  name: 'notifications',
})
triggerNotifications() {}
```

使用以下方法访问此作业:

```typescript
const job = this.schedulerRegistry.getCronJob('notifications');

job.stop();
console.log(job.lastDate());
```

`getCronJob()`方法返回指定的 cron 作业。返回的`CronJob`对象有以下方法:

- `stop()` - 停止计划运行的作业。
- `start()` - 重新启动已停止的作业。
- `setTime(time: CronTime)` - 停止一个作业，为它设置一个新的时间，然后开始它
- `lastDate()` - 返回作业最近执行日期的字符串表示形式
- `nextDates(count: number)` - 返回一个表示即将到来的作业执行日期的`moment`对象的数组(大小为`count`)。

!!! info "**Hint**"

    在`moment`对象上使用`toDate()`将其呈现为人类可读的形式。

使用`SchedulerRegistry.addCronJob()`方法动态 **创建** 一个新的 cron job，如下所示:

```typescript
addCronJob(name: string, seconds: string) {
  const job = new CronJob(`${seconds} * * * * *`, () => {
    this.logger.warn(`time (${seconds}) for job ${name} to run!`);
  });

  this.schedulerRegistry.addCronJob(name, job);
  job.start();

  this.logger.warn(
    `job ${name} added for each minute at ${seconds} seconds!`,
  );
}
```

在这段代码中，我们使用`cron`包中的`CronJob`对象来创建 cron 作业。
`CronJob` 构造函数的第一个参数是 cron 模式(就像 `@Cron()` [decorator](techniques/task-scheduling#declarative-cron-jobs))，第二个参数是 cron 计时器触发时执行的回调。
`SchedulerRegistry.addCronJob()`方法有两个参数:`CronJob`的名称和`CronJob`对象本身。

!!! warning

    记得在访问之前注入`SchedulerRegistry`。从`cron`包中导入`CronJob`。

使用`SchedulerRegistry.deleteCronJob()`方法 **删除** 一个名为`cron`的任务，如下所示:

```typescript
deleteCron(name: string) {
  this.schedulerRegistry.deleteCronJob(name);
  this.logger.warn(`job ${name} deleted!`);
}
```

使用`SchedulerRegistry.getCronJobs()`方法 **列出** 所有`cron`任务，如下所示:

```typescript
getCrons() {
  const jobs = this.schedulerRegistry.getCronJobs();
  jobs.forEach((value, key, map) => {
    let next;
    try {
      next = value.nextDates().toDate();
    } catch (e) {
      next = '错误:下一个点火日期已经过去!';
    }
    this.logger.log(`job: ${key} -> next: ${next}`);
  });
}
```

`getCronJobs()`方法返回一个`map`。
在这段代码中，我们对映射进行迭代，并尝试访问每个`CronJob`的`nextDates()`方法。
在`CronJob` API 中，如果一个任务已经被触发，并且没有未来的触发日期，它会抛出一个异常。

## 动态 intervals

Obtain a reference to an interval with the `SchedulerRegistry.getInterval()` method. As above, inject `SchedulerRegistry` using standard constructor injection:

```typescript
constructor(private schedulerRegistry: SchedulerRegistry) {}
```

And use it as follows:

```typescript
const interval = this.schedulerRegistry.getInterval('notifications');
clearInterval(interval);
```

**Create** a new interval dynamically using the `SchedulerRegistry.addInterval()` method, as follows:

```typescript
addInterval(name: string, milliseconds: number) {
  const callback = () => {
    this.logger.warn(`Interval ${name} executing at time (${milliseconds})!`);
  };

  const interval = setInterval(callback, milliseconds);
  this.schedulerRegistry.addInterval(name, interval);
}
```

In this code, we create a standard JavaScript interval, then pass it to the `ScheduleRegistry.addInterval()` method.
That method takes two arguments: a name for the interval, and the interval itself.

**Delete** a named interval using the `SchedulerRegistry.deleteInterval()` method, as follows:

```typescript
deleteInterval(name: string) {
  this.schedulerRegistry.deleteInterval(name);
  this.logger.warn(`Interval ${name} deleted!`);
}
```

**List** all intervals using the `SchedulerRegistry.getIntervals()` method as follows:

```typescript
getIntervals() {
  const intervals = this.schedulerRegistry.getIntervals();
  intervals.forEach(key => this.logger.log(`Interval: ${key}`));
}
```

## 动态 timeouts

Obtain a reference to a timeout with the `SchedulerRegistry.getTimeout()` method. As above, inject `SchedulerRegistry` using standard constructor injection:

```typescript
constructor(private schedulerRegistry: SchedulerRegistry) {}
```

And use it as follows:

```typescript
const timeout = this.schedulerRegistry.getTimeout('notifications');
clearTimeout(timeout);
```

**Create** a new timeout dynamically using the `SchedulerRegistry.addTimeout()` method, as follows:

```typescript
addTimeout(name: string, milliseconds: number) {
  const callback = () => {
    this.logger.warn(`Timeout ${name} executing after (${milliseconds})!`);
  };

  const timeout = setTimeout(callback, milliseconds);
  this.schedulerRegistry.addTimeout(name, timeout);
}
```

In this code, we create a standard JavaScript timeout, then pass it to the `ScheduleRegistry.addTimeout()` method.
That method takes two arguments: a name for the timeout, and the timeout itself.

**Delete** a named timeout using the `SchedulerRegistry.deleteTimeout()` method, as follows:

```typescript
deleteTimeout(name: string) {
  this.schedulerRegistry.deleteTimeout(name);
  this.logger.warn(`Timeout ${name} deleted!`);
}
```

**List** all timeouts using the `SchedulerRegistry.getTimeouts()` method as follows:

```typescript
getTimeouts() {
  const timeouts = this.schedulerRegistry.getTimeouts();
  timeouts.forEach(key => this.logger.log(`Timeout: ${key}`));
}
```

## 例子

一个可用的例子[在这里](https://github.com/nestjs/nest/tree/master/sample/27-scheduling).
