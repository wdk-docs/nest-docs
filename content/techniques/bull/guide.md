---
title: "指南"
linkTitle: "指南"
weight: 2
---

![](https://raw.githubusercontent.com/OptimalBits/bull/master/support/logo%402x.png)

## Bull 是什么?

Bull 是一个 Node 库，它实现了一个快速、健壮的基于[redis](https://redis.io)的队列系统。

虽然可以直接使用 Redis 命令来实现队列，但这个库提供了一个 API 来处理所有底层细节，并丰富了 Redis 的基本功能，这样更复杂的用例就可以轻松处理。

如果你不熟悉排队，你可能会想为什么需要排队。
队列可以以一种优雅的方式解决许多不同的问题，从平滑处理高峰到在微服务之间创建健壮的通信通道，或将繁重的工作从一台服务器转移到许多较小的 worker，等等。

## 开始

Bull 是一个公共的 npm 包，可以使用 npm 或 yarn 来安装:

```bash
$ npm install bull --save
# 或者
$ yarn add bull
```

为了使用 Bull，你还需要有一个运行的 Redis 服务器。
对于本地开发，您可以使用[docker](https://hub.docker.com/_/redis/)轻松安装它。

Bull 将默认尝试连接到运行在`localhost:6379`上的 Redis 服务器

## 简单的队列

一个队列可以通过实例化一个 Bull 实例来创建:

```js
const myFirstQueue = new Bull("my-first-queue");
```

一个队列实例通常有 3 个不同的主要角色:作业生产者、作业使用者或/和事件侦听器。

虽然一个给定的实例可以用于这 3 个角色，但通常生产者和消费者被划分为几个实例。
一个给定的队列，总是通过它的实例化名称(在上面的示例中是`my-first-queue`)引用，可以有许多生产者、许多消费者和许多侦听器。
一个重要的方面是，生产者可以将作业添加到队列中，即使此时没有可用的消费者:队列提供异步通信，这是使它们如此强大的特性之一。

相反，您可以让一个或多个 worker 从队列中消耗作业，它将按照给定的顺序消耗作业:FIFO(默认)、LIFO 或根据优先级。

说到 worker，它们可以运行在相同或不同的进程中，在同一台机器或集群中。
Redis 将充当一个公共点，只要消费者或生产商能够连接到 Redis，他们就能够协同处理工作。

### 生产者

作业生成器是一个简单的 Node 程序，它将作业添加到队列中，像这样:

```js
const myFirstQueue = new Bull("my-first-queue");

const job = await myFirstQueue.add({
  foo: "bar",
});
```

正如您所看到的，作业只是一个 javascript 对象。
这个对象需要是可序列化的，更具体的是，它应该可以 JSON 字符串化，因为这是它将如何存储在 Redis。

也可以在作业数据之后提供一个 options 对象，但我们将在后面讨论这个问题。

### 消费者

消费者或工作者(我们将在本指南中交替使用这两个术语)只不过是一个 Node 程序
它定义了像这样的进程函数:

```js
const myFirstQueue = new Bull("my-first-queue");

myFirstQueue.process(async (job) => {
  return doSomething(job.data);
});
```

每当工作线程处于空闲状态且队列中有作业需要处理时，`process`函数就会被调用。
由于在添加作业时，消费者不需要在线，因此队列中可能已经有许多作业在等待，因此进程将保持忙碌，一个接一个地处理作业，直到所有作业都完成。

在上面的例子中，我们将进程函数定义为`async`，这是强烈推荐的定义它们的方式。
如果你的 Node 运行时不支持 async/await，那么你可以在进程结束时返回一个 promise
函数，以得到类似的结果。

进程函数返回的值将存储在 jobs 对象中，稍后可以访问，例如在“completed”事件的监听器中。

有时你需要向外部监听器提供 job 的*progress*信息，这可以通过在 job 对象上使用`progress`方法轻松完成:

```js
myFirstQueue.process(async (job) => {
  let progress = 0;
  for (i = 0; i < 100; i++) {
    await doSomething(job.data);
    progress += 10;
    job.progress(progress);
  }
});
```

### 侦听器

最后，您可以只侦听队列中发生的事件。
侦听器可以是本地的，这意味着它们只接收在*给定队列实例*中产生的通知，也可以是全局的，这意味着它们侦听给定队列的*所有*事件。
因此，您可以将侦听器附加到任何实例，甚至充当消费者或生产者的实例。
但是请注意，如果队列不是消费者或生产者，本地事件将永远不会触发，在这种情况下，您将需要使用全局事件。

```js
const myFirstQueue = new Bull("my-first-queue");

// Define a local completed event
myFirstQueue.on("completed", (job, result) => {
  console.log(`Job completed with result ${result}`);
});
```

### 一份工作的生命周期

为了充分利用 Bull 队列的潜力，理解作业的生命周期是很重要的。
从生产者对队列实例调用“add”方法的那一刻起，作业就进入了它需要的生命周期
处于不同的状态，直到它完成或失败(尽管技术上失败的作业可以重试并获得新的生命周期)。

显示作业状态的示意图(job-lifecycle.png)

当一个作业被添加到一个队列时，它可以处于两种状态之一，它可以处于“等待”状态，这实际上是一个等待列表，所有的作业都必须进入这个列表才能被处理，或者它可以处于“延迟”状态:延迟状态意味着该作业正在等待超时或等待被提升处理，但是，延迟的作业不会直接被处理，而是被放置在等待列表的开头，当一个 worker 空闲时就会被处理。

作业的下一个状态是“活动”状态。
活动状态由一个集合表示，是当前正在处理的作业，即。
它们运行在上一章解释过的“process”函数中。
作业可以无限长时间处于活动状态，直到流程完成，或者抛出异常，以便作业以“完成”或“失败”状态结束。

### 停滞不前的工作

在 Bull 中，我们定义了停滞的工作的概念。
停滞的作业是正在处理的作业，但 Bull 怀疑该作业的流程功能已经挂起。
这种情况发生在进程函数正在处理一个任务，并且使 CPU 一直处于繁忙状态，以至于 worker 无法告诉队列它仍然在处理这个任务。

当一个作业停止时，根据作业设置，该作业可以由另一个空闲的作业重试，也可以转移到失败状态。

可以通过确保进程函数不会让 Node 事件循环太长时间处于繁忙状态(Bull 的默认选项是几秒钟)，或者使用单独的[sandbox -processors](#sandbox -processors)来避免陷入停顿的作业。

## 事件

Bull 中的队列生成一些事件，这些事件在许多用例中都很有用。
对于给定的队列实例(一个 worker)，事件可以是本地的，例如，如果一个任务在一个给定的 worker 中完成了，则只会针对该实例发出本地事件。
但是，可以通过在本地事件名称前加上`global:`来侦听所有事件。
然后，我们可以侦听给定队列中所有工人产生的所有事件。

本地完整事件:

```js
queue.on("completed", (job) => {
  console.log(`Job with id ${job.id} has been completed`);
});
```

而事件的全球版本可以通过以下方式来收听:

```js
queue.on("global:completed", (jobId) => {
  console.log(`Job with id ${jobId} has been completed`);
});
```

请注意，全局事件的签名与本地事件的签名略有不同，在上面的示例中，它只发送作业 id，而不是作业本身的完整实例，这样做是出于性能原因。

可用事件的列表可以在[reference](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#eventsk)中找到。

## 队列的选项

一个队列可以实例化一些有用的选项，例如，你可以指定你的 Redis 服务器的位置和密码，以及其他一些有用的设置。
所有这些设置在 Bull 的[参考文献](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)中都有描述，我们在这里不重复它们，但是，我们将讨论一些用例。

### 速度限制器

可以创建限制单位时间内处理的作业数量的队列。
限制器是在每个队列中定义的，与 worker 的数量无关，所以你可以水平扩展，并且仍然可以轻松地限制处理速率:

```js
// Limit queue to max 1000 jobs per 5000 milliseconds.
const myRateLimitedQueue = new Queue("rateLimited", {
  limiter: {
    max: 1000,
    duration: 5000,
  },
});
```

当队列达到速率限制时，请求的作业将加入“延迟”队列。

### 命名工作

给工作起名字是可能的。
这不会改变队列的任何机制，但可以在 UI 工具中用于更清晰的代码和更好的可视化:

```js
// Jobs producer
const myJob = await transcoderQueue.add("image", { input: "myimagefile" });
const myJob = await transcoderQueue.add("audio", { input: "myaudiofile" });
const myJob = await transcoderQueue.add("video", { input: "myvideofile" });
```

```js
// Worker
transcoderQueue.process("image", processImage);
transcoderQueue.process("audio", processAudio);
transcoderQueue.process("video", processVideo);
```

请记住，每个队列实例都需要为每个*指定*作业提供一个处理器，否则将会出现异常。

### 沙箱处理器

如上所述，在定义流程功能时，还可以提供并发设置。
此设置允许工作者并行处理多个作业。
这些作业仍然在同一个 Node 进程中处理，如果作业的 IO 密集，它们将得到很好的处理。

有时，作业的 CPU 占用更大，这可能会锁定 Node 事件循环太长时间，Bull 可能会认为作业已经暂停。
为了避免这种情况，可以在单独的 Node 进程中运行进程函数。
在这种情况下，并发性参数将决定允许运行的最大并发进程数。

我们称这种进程为“沙箱”进程，它们也有这样的属性:如果崩溃，它们不会影响任何其他进程，并且会自动生成一个新进程来替换它。

## 作业类型

Bull 中的默认作业类型是“FIFO”(先进先出)，这意味着作业的处理顺序与进入队列的顺序相同。
有时，以不同的顺序处理作业是有用的。

### LIFO

后进先出(LIFO)意味着作业被添加到队列的开头，因此当 worker 空闲时就会被处理。

```js
const myJob = await myqueue.add({ foo: "bar" }, { lifo: true });
```

### 延迟

还可以将作业添加到队列中，这些作业在被处理之前会延迟一定的时间。
注意，delay 参数表示作业在被处理之前等待的最小时间。
当延迟时间过去后，作业将被移动到队列的开头，并在一个 worker 空闲时立即处理。

```js
// Delayed 5 seconds
const myJob = await myqueue.add({ foo: "bar" }, { delay: 5000 });
```

### 优先

可以将作业添加到具有优先级值的队列中。
优先级高的作业将比优先级低的作业优先处理。
最高优先级为 1，并降低所使用的较大整数。
请记住，优先级队列比标准队列稍慢(当前插入时间为 O(n)， n 是当前在队列中等待的作业数量，而标准队列为 O(1))。

```js
const myJob = await myqueue.add({ foo: "bar" }, { priority: 3 });
```

### 可重复的

可重复作业是一种特殊作业，可以根据 cron 规范或时间间隔无限期地重复自己，或者直到达到一个给定的最大日期或重复次数为止。

```js
// Repeat every 10 seconds for 100 times.
const myJob = await myqueue.add(
  { foo: "bar" },
  {
    repeat: {
      every: 10000,
      limit: 100,
    },
  }
);

// Repeat payment job once every day at 3:15 (am)
paymentsQueue.add(paymentsData, { repeat: { cron: "15 3 * * *" } });
```

关于可重复工作有一些重要的考虑:

- 如果重复选项相同，Bull 足够聪明，不会添加相同的可重复作业。
  (注意:作业 id 是重复选项的一部分，因为:https://github.com/OptimalBits/bull/pull/603，因此传递作业id将允许在队列中插入具有相同cron的作业)
- 如果没有工人在运行，那么下一次工人在线时，可重复的工作将不会累积。
- 可以使用[removeRepeatable](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueremoverepeatable)方法删除可重复的作业。
