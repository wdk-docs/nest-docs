---
title: "bull"
linkTitle: "bull"
weight: 1
description: 最快、最可靠、基于redis的Node队列。 仔细写的岩石固体的稳定性和原子性。
---

> https://github.com/OptimalBits/bull

请在[📻Twitter](http://twitter.com/manast)上关注我，了解重要的新闻和更新。
你可以在这个博客中找到教程和新闻: [🛠 教程](https://blog.taskforce.sh/)

### Bull 特性

- [x] 最小的 CPU 使用率，由于无轮询设计。
- [x] 基于 Redis 的稳健设计。
- [x] 延迟的工作。
- [x] 根据 cron 规范安排和重复作业。
- [x] 对工作的率限制。
- [x] 重试。
- [x] 优先级。
- [x] 并发性。
- [x] 暂停/恢复-全局或本地。
- [x] 每个队列有多个作业类型。
- [x] 线程(沙盒)处理函数。
- [x] 从进程崩溃中自动恢复。

接下来是路线图…

- [ ] 作业完成确认(同时可以使用消息队列[pattern](https://github.com/OptimalBits/bull/blob/develop/PATTERNS.md#returning-job-completions))。
- [ ] 父子的工作关系。

---

### UIs

你可以使用一些第三方 ui 来进行监控:

**BullMQ**

- [Taskforce](https://taskforce.sh)

**Bull v3**

- [Taskforce](https://taskforce.sh)
- [bull-board](https://github.com/vcapretz/bull-board)
- [bull-repl](https://github.com/darky/bull-repl)
- [bull-monitor](https://github.com/s-r-x/bull-monitor)
- [Monitoro](https://github.com/AbhilashJN/monitoro)

**Bull <= v2**

- [Matador](https://github.com/ShaneK/Matador)
- [react-bull](https://github.com/kfatehi/react-bull)
- [Toureiro](https://github.com/Epharmix/Toureiro)

---

### 监测和报警

- 使用 Prometheus [Bull Queue Exporter](https://github.com/UpHabit/bull_exporter)

---

### 特征比较

由于有一些作业队列解决方案，这里有一个表比较它们:

| Feature       |   Bullmq-Pro    |     Bullmq      |      Bull       |  Kue  | Bee      | Agenda |
| :------------ | :-------------: | :-------------: | :-------------: | :---: | -------- | ------ |
| 后端          |      redis      |      redis      |      redis      | redis | redis    | mongo  |
| 观察          |        ✓        |                 |                 |       |          |        |
| 组速率限制    |        ✓        |                 |                 |       |          |        |
| 集群支持      |        ✓        |                 |                 |       |          |        |
| 父/子依赖关系 |        ✓        |        ✓        |                 |       |          |        |
| 优先级        |        ✓        |        ✓        |        ✓        |   ✓   |          | ✓      |
| 并发性        |        ✓        |        ✓        |        ✓        |   ✓   | ✓        | ✓      |
| 演示工作      |        ✓        |        ✓        |        ✓        |   ✓   |          | ✓      |
| 全局事件      |        ✓        |        ✓        |        ✓        |   ✓   |          |        |
| 速度限制器    |        ✓        |        ✓        |        ✓        |       |          |        |
| 暂停/恢复     |        ✓        |        ✓        |        ✓        |   ✓   |          |        |
| 沙箱工人      |        ✓        |        ✓        |        ✓        |       |          |        |
| 可重复的工作  |        ✓        |        ✓        |        ✓        |       |          | ✓      |
| 原子操作      |        ✓        |        ✓        |        ✓        |       | ✓        |        |
| 持久性        |        ✓        |        ✓        |        ✓        |   ✓   | ✓        | ✓      |
| 用户界面      |        ✓        |        ✓        |        ✓        |   ✓   |          | ✓      |
| 优化了        | Jobs / Messages | Jobs / Messages | Jobs / Messages | Jobs  | Messages | Jobs   |

### 安装

```bash
npm install bull --save
```

或者

```bash
yarn add bull
```

_**要求:** Bull 需要大于或等于`2.8.18`的 Redis 版本。_

### Typescript 定义

```bash
npm install @types/bull --save-dev
```

```bash
yarn add --dev @types/bull
```

定义目前维护在[DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/bull) repo 中。

### 快速指南

#### 基本用法

```js
const Queue = require("bull");

const videoQueue = new Queue("video transcoding", "redis://127.0.0.1:6379");
const audioQueue = new Queue("audio transcoding", {
  redis: { port: 6379, host: "127.0.0.1", password: "foobared" },
}); // Specify Redis connection using object
const imageQueue = new Queue("image transcoding");
const pdfQueue = new Queue("pdf transcoding");

videoQueue.process(function (job, done) {
  // job.data contains the custom data passed when the job was created
  // job.id contains id of this job.

  // transcode video asynchronously and report progress
  job.progress(42);

  // call done when finished
  done();

  // or give a error if error
  done(new Error("error transcoding"));

  // or pass it a result
  done(null, {
    framerate: 29.5,
    /* etc...
     */
  });

  // If the job throws an unhandled exception it is also handled correctly
  throw new Error("some unexpected error");
});

audioQueue.process(function (job, done) {
  // transcode audio asynchronously and report progress
  job.progress(42);

  // call done when finished
  done();

  // or give a error if error
  done(new Error("error transcoding"));

  // or pass it a result
  done(null, {
    samplerate: 48000,
    /* etc...
     */
  });

  // If the job throws an unhandled exception it is also handled correctly
  throw new Error("some unexpected error");
});

imageQueue.process(function (job, done) {
  // transcode image asynchronously and report progress
  job.progress(42);

  // call done when finished
  done();

  // or give a error if error
  done(new Error("error transcoding"));

  // or pass it a result
  done(null, {
    width: 1280,
    height: 720,
    /* etc...
     */
  });

  // If the job throws an unhandled exception it is also handled correctly
  throw new Error("some unexpected error");
});

pdfQueue.process(function (job) {
  // Processors can also return promises instead of using the done callback
  return pdfAsyncProcessor();
});

videoQueue.add({ video: "http://example.com/video1.mov" });
audioQueue.add({ audio: "http://example.com/audio1.mp3" });
imageQueue.add({ image: "http://example.com/image1.tiff" });
```

#### 使用承诺

或者，你可以使用 return promises 来代替`done`回调:

```javascript
videoQueue.process(function (job) {
  // 不要忘记删除done回调!
  // 简单地回报一个承诺
  return fetchVideo(job.data.url).then(transcodeVideo);

  // 处理承诺拒绝
  return Promise.reject(new Error("error transcoding"));

  // 将承诺解析的值传递给“completed”事件
  return Promise.resolve({
    framerate: 29.5,
    /* etc...
     */
  });

  // 如果作业抛出一个未处理的异常，它也会得到正确的处理
  throw new Error("some unexpected error");
  // 一样
  return Promise.reject(new Error("some unexpected error"));
});
```

#### 独立的进程

进程函数也可以在单独的进程中运行。这有几个好处:

- 这个进程是沙箱化的，所以即使它崩溃了，也不会影响工作进程。
- 您可以在不影响队列的情况下运行阻塞代码(作业不会停止)。
- 更好地利用多核 cpu。
- 减少与 redis 的连接。

为了使用这个特性，只需创建一个单独的处理器文件:

```js
// processor.js
module.exports = function (job) {
  // 做一些繁重的工作
  return Promise.resolve(result);
};
```

然后像这样定义处理器:

```js
// 单流程:
queue.process("/path/to/my/processor.js");

// 你也可以使用并发:
queue.process(5, "/path/to/my/processor.js");

// 和指定的处理器:
queue.process("my processor", 5, "/path/to/my/processor.js");
```

#### 重复的工作

作业可以被添加到队列中，并根据 cron 规范重复处理:

```js
paymentsQueue.process(function (job) {
  // Check payments
});

// Repeat payment job once every day at 3:15 (am)
paymentsQueue.add(paymentsData, { repeat: { cron: "15 3 * * *" } });
```

作为提示，请检查这里的表达式，以验证它们是正确的:[cron 表达式生成器](https://crontab.cronhub.io)

#### 暂停/恢复

一个队列可以被全局暂停和恢复(传递 `true` 来暂停这个 worker 的处理):

```js
queue.pause().then(function () {
  // queue is paused now
});

queue.resume().then(function () {
  // queue is resumed now
});
```

#### 事件

队列会发出一些有用的事件，例如…

```js
.on('completed', function (job, result) {
  // Job completed with output result!
})
```

有关事件的更多信息，包括所触发事件的完整列表，请参阅[事件参考资料](./REFERENCE.md#events)

#### 队列性能

队列很便宜，所以如果你需要很多队列，只需创建新的不同名称的队列:

```javascript
const userJohn = new Queue('john');
const userLisa = new Queue('lisa');
.
.
.
```

然而，每个队列实例将需要新的 redis 连接，检查如何[重用连接](https://github.com/OptimalBits/bull/blob/master/PATTERNS.md#reusing-redis-connections)，或者你也可以使用[命名处理器](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queueprocess)来实现类似的结果。

#### 集群的支持

> NOTE: 从 3.2.0 及以上版本开始，建议使用线程处理器。

队列是健壮的，可以在几个线程或进程中并行运行，没有任何危险或队列损坏的风险。
检查这个简单的例子，使用 cluster 跨进程并行化任务:

```js
const Queue = require("bull");
const cluster = require("cluster");

const numWorkers = 8;
const queue = new Queue("test concurrent queue");

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("online", function (worker) {
    // Let's create a few jobs for the queue workers
    for (let i = 0; i < 500; i++) {
      queue.add({ foo: "bar" });
    }
  });

  cluster.on("exit", function (worker, code, signal) {
    console.log("worker " + worker.process.pid + " died");
  });
} else {
  queue.process(function (job, jobDone) {
    console.log("Job done by worker", cluster.worker.id, job.id);
    jobDone();
  });
}
```

---

### 文档

要获取完整的文档，请查看参考和常用模式:

- [指南](https://optimalbits.github.io/bull/) - 你使用 Bull 开发的起点。
- [参考](./REFERENCE.md) - 包含所有可用对象和方法的引用文档。
- [模式](./PATTERNS.md) - 一组常见模式的示例。
- [许可证](./LICENSE.md) - Bull 许可证-麻省理工学院。

如果你看到任何可以使用更多文档的东西，请提交一个 pull request!

---

### 重要的笔记

队列的目标是“至少一次”的工作策略。
这意味着在某些情况下，一个作业可能会被多次处理。
这种情况通常发生在一个 worker 在整个处理过程中没有为给定的作业保持锁的时候。

当一个工人正在处理一项工作时，它将使该工作保持“锁定”，以便其他工人不能处理它。

理解锁定是如何工作的，以防止您的作业失去锁- becoming _stalled_ - 并因此重新启动，这一点很重要。
锁是通过在 `lockRenewTime` (通常是 `lockDuration` 的一半)上为 `lockDuration` 创建一个锁来实现的。
如果 `lockDuration` 在锁被更新之前过期，则该作业将被视为暂停并自动重启;它将被**二次加工**。

这种情况可能发生在:

1. 运行作业处理器的 Node 进程意外终止。
2. 您的作业处理器 cpu 过于密集，导致 Node 事件循环停顿，结果，Bull 无法更新作业锁(请参阅[#488](https://github.com/OptimalBits/bull/issues/488)了解如何更好地检测此问题)。
   您可以通过将作业处理器分解为更小的部分来解决这个问题，这样单个部分就不会阻塞 Node 事件循环。
   或者，您可以为 `lockDuration` 设置传递一个更大的值(代价是它将花费更长的时间来识别真正的暂停作业)。

因此，您应该始终侦听 `stopped` 事件并将其记录到错误监视系统中，因为这意味着您的作业可能会被重复处理。

作为一种安全措施，有问题的作业不会被无限期重启(例如，如果作业处理器总是崩溃它的 Node 进程)，作业将从停止状态恢复，最大次数为 `maxStalledCount` (默认为 `1`)。

### 谁在使用

Bull 在大大小小的组织中都很受欢迎，比如以下这些组织:

<table cellspacing="0" cellpadding="0">
  <tr>
    <td valign="center">
      <a href="https://github.com/atlassian/github-for-jira">
        <img
          src="https://876297641-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LUuDmt_xXMfG66Rn1GA%2Fuploads%2FevsJCF6F1tx1ScZwDQOd%2FAtlassian-horizontal-blue-rgb.webp?alt=media&token=2fcd0528-e8bb-4bdd-af35-9d20e313d1a8"
          width="150"
          alt="Atlassian"
      /></a>
    </td>
    <td valign="center">
      <a href="https://github.com/Autodesk">
        <img
          src="https://876297641-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LUuDmt_xXMfG66Rn1GA%2Fuploads%2FvpTe02RdOhUJBA8TdHEE%2Fautodesk-logo-white.png?alt=media&token=326961b4-ea4f-4ded-89a4-e05692eec8ee"
          width="150"
          alt="Autodesk"
      /></a>
    </td>
    <td valign="center">
      <a href="https://github.com/common-voice/common-voice">
        <img
          src="https://876297641-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LUuDmt_xXMfG66Rn1GA%2Fuploads%2F4zPSrubNJKViAzUIftIy%2Fmozilla-logo-bw-rgb.png?alt=media&token=9f93aae2-833f-4cc4-8df9-b7fea0ad5cb5"
          width="150"
          alt="Mozilla"
      /></a>
    </td>
    <td valign="center">
      <a href="https://github.com/nestjs/bull">
        <img
          src="https://876297641-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LUuDmt_xXMfG66Rn1GA%2Fuploads%2FfAcGye182utFUtPKdLqJ%2FScreenshot%202022-02-15%20at%2011.32.39.png?alt=media&token=29feb550-f0bc-467d-a290-f700701d7d15"
          width="150"
          alt="Nest"
      /></a>
    </td>
    <td valign="center">
      <a href="https://github.com/salesforce/refocus">
        <img
          src="https://876297641-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LUuDmt_xXMfG66Rn1GA%2Fuploads%2FZNnYNuL5qJ6ZoBh7JJEW%2Fsalesforce-logo.png?alt=media&token=ddcae63b-08c0-4dd4-8496-3b29a9bf977d"
          width="100"
          alt="Salesforce"
      /></a>
    </td>

  </tr>
</table>

---

### BullMQ

如果你想开始使用完全用 Typescript 编写的下一个主要版本的 Bull，欢迎使用新的 repo[这里](https://github.com/taskforcesh/bullmq).
否则，我们非常欢迎你仍然使用 Bull，这是一个安全的、经过战斗测试的代码库。
