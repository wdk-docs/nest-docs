---
title: "模式"
linkTitle: "模式"
weight: 4
description: 下面是一些常用的用Bull实现的模式的例子
---

- [消息队列](#消息队列)
- [返回工作完成](#返回工作完成)
- [重用 Redis 连接](#重用-redis-连接)
- [Redis 集群](#redis-集群)
- [调试](#调试)
- [自定义补偿策略](#自定义补偿策略)
- [手动抓取工作](#手动抓取工作)

如果你有任何其他你想要添加的常见模式，拉请求它们!

## 消息队列

Bull 也可以用于持久消息队列。
在某些用例中，这是一个非常有用的特性。
例如，您可以有两个需要相互通信的服务器。
通过使用队列，服务器不需要同时在线，因此这创建了一个非常健壮的通信通道。
你可以把' add '当作*send*，把' process '当作*receive*:

服务器:

```js
const Queue = require("bull");

const sendQueue = new Queue("Server B");
const receiveQueue = new Queue("Server A");

receiveQueue.process(function (job, done) {
  console.log("Received message", job.data.msg);
  done();
});

sendQueue.add({ msg: "Hello" });
```

Server B:

```js
const Queue = require("bull");

const sendQueue = new Queue("Server A");
const receiveQueue = new Queue("Server B");

receiveQueue.process(function (job, done) {
  console.log("Received message", job.data.msg);
  done();
});

sendQueue.add({ msg: "World" });
```

## 返回工作完成

一种常见的模式是，您有一个队列处理器集群，以尽可能快的速度处理作业，而其他一些服务需要获取该处理器的结果并对其进行处理，可能会将结果存储在数据库中。

实现这一目标的最健壮和可伸缩的方法是将标准作业队列与消息队列模式结合起来:服务只需打开作业队列并向其添加作业，就可以将作业发送到集群，集群将以尽可能快的速度开始处理。
每当在集群中完成一个作业时，一条消息就会连同结果数据发送到一个结果消息队列，这个队列由一些存储结果到数据库中的其他服务进行侦听。

## 重用 Redis 连接

一个标准的队列需要 3 个连接到 Redis 服务器。
在某些情况下，您可能希望重用连接—例如在 Heroku 中，连接数是受限制的。
你可以通过' Queue '构造函数中的' createClient '选项来做到这一点。

注:

- bclient 连接[不能被重用](https://github.com/OptimalBits/bull/issues/880)，所以你应该返回一个新的连接每次调用。
- 客户端和订阅者连接可以共享，当队列关闭时不会关闭。
  当您关闭进程时，首先关闭队列，然后关闭共享连接(如果它们是共享的)。
- 如果你不共享连接,但仍使用“createClient”做一些定制的连接逻辑,你可能仍然需要您创建的所有连接的列表,这样你就可以手动关闭后,队列关闭,如果你需要优雅的关闭过程
- 不要在你创建的连接上设置一个“keyPrefix”，如果你需要一个键前缀，使用 bull 的内置前缀特性

```js
const { REDIS_URL } = process.env;

const Redis = require("ioredis");
let client;
let subscriber;

const opts = {
  // redisOpts here will contain at least a property of connectionName which will identify the queue based on its name
  createClient: function (type, redisOpts) {
    switch (type) {
      case "client":
        if (!client) {
          client = new Redis(REDIS_URL, redisOpts);
        }
        return client;
      case "subscriber":
        if (!subscriber) {
          subscriber = new Redis(REDIS_URL, redisOpts);
        }
        return subscriber;
      case "bclient":
        return new Redis(REDIS_URL, redisOpts);
      default:
        throw new Error("Unexpected connection type: ", type);
    }
  },
};

const queueFoo = new Queue("foobar", opts);
const queueQux = new Queue("quxbaz", opts);
```

## Redis 集群

Bull 内部函数需要跨不同键的原子操作。
这种行为打破了 Redis 的集群配置规则。
但是，仍然可以通过使用适当的 Bull 前缀选项作为集群“散列标签”来使用集群环境。
哈希标签是用来保证某些键被放置在相同的哈希槽，阅读更多关于哈希标签在[redis 集群教程](https://redis.io/topics/cluster-tutorial)。
散列标记用括号定义。
例如，一个键在括号内有一个子字符串，将使用该子字符串来确定该键将被放置在哪个哈希槽中。

总之，为了使 Bull 与 Redis 集群兼容，在括号内使用队列前缀。

例如:

```js
const queue = new Queue("cluster", {
  prefix: "{myprefix}",
});
```

如果在同一个集群中使用多个队列，则应该使用不同的前缀，以便将这些队列均匀地放置在集群节点中。

## 调试

要查看调试语句，设置或添加' bull '到' NODE_DEBUG '环境变量:

```bash
export NODE_DEBUG=bull
```

```bash
NODE_DEBUG=bull node ./your-script.js
```

## 自定义补偿策略

当重试时内置的回退策略不够用时，可以定义自定义策略。
自定义回退策略由队列上的函数定义。
已尝试处理作业的次数作为第一个参数传递给该函数，作业失败的错误作为第二个参数传递给该函数。
该函数返回延迟重试的时间，0 表示立即重试，-1 表示立即失败。

```js
const Queue = require("bull");

const myQueue = new Queue("Server B", {
  settings: {
    backoffStrategies: {
      jitter: function (attemptsMade, err) {
        return 5000 + Math.random() * 500;
      },
    },
  },
});
```

然后，可以使用上面定义的名称在作业中指定新的回退策略:

```js
myQueue.add(
  { foo: "bar" },
  {
    attempts: 3,
    backoff: {
      type: "jitter",
    },
  }
);
```

你可以为你的策略指定选项:

```js
const Queue = require("bull");

const myQueue = new Queue("Server B", {
  settings: {
    backoffStrategies: {
      // truncated binary exponential backoff
      binaryExponential: function (attemptsMade, err, options) {
        // Options can be undefined, you need to handle it by yourself
        if (!options) {
          options = {};
        }
        const delay = options.delay || 1000;
        const truncate = options.truncate || 1000;
        console.error({ attemptsMade, err, options });
        return Math.round(Math.random() * (Math.pow(2, Math.max(attemptsMade, truncate)) - 1) * delay);
      },
    },
  },
});

myQueue.add(
  { foo: "bar" },
  {
    attempts: 10,
    backoff: {
      type: "binaryExponential",
      options: {
        delay: 500,
        truncate: 5,
      },
    },
  }
);
```

你可以根据工作中出现的错误来制定退步策略:

```js
const Queue = require("bull");

function MySpecificError() {}

const myQueue = new Queue("Server C", {
  settings: {
    backoffStrategies: {
      foo: function (attemptsMade, err) {
        if (err instanceof MySpecificError) {
          return 10000;
        }
        return 1000;
      },
    },
  },
});

myQueue.process(function (job, done) {
  if (job.data.msg === "Specific Error") {
    throw new MySpecificError();
  } else {
    throw new Error();
  }
});

myQueue.add(
  { msg: "Hello" },
  {
    attempts: 3,
    backoff: {
      type: "foo",
    },
  }
);

myQueue.add(
  { msg: "Specific Error" },
  {
    attempts: 3,
    backoff: {
      type: "foo",
    },
  }
);
```

## 手动抓取工作

如果您希望实际的作业处理在一个单独的 repo/服务中完成，而不是在运行' bull '的地方，这个模式可能适合您。

可以使用几个简单的方法来手动转换作业的状态。

1.  向'waiting'队列添加作业。获取队列并调用' add '。

    ```typescript
    import Queue from "bull";

    const queue = new Queue({
      limiter: {
        max: 5,
        duration: 5000,
        bounceBack: true, // important
      },
      ...queueOptions,
    });
    queue.add({ random_attr: "random_value" });
    ```

2.  将任务从'waiting'中拉出并移动到'active'中。

    ```typescript
    const job: Job = await queue.getNextJob();
    ```

3.  如果出现错误，将作业移动到'failed'队列。

    ```typescript
    const (nextJobData, nextJobId) = await job.moveToFailed({ message: 'Call to external service failed!' }, true);
    ```

4.  将作业移动到'completed'队列。

    ```typescript
    const (nextJobData, nextJobId) = await job.moveToCompleted('succeeded', true);
    ```

5.  如果有任务返回，则返回下一个任务。

    ```typescript
    if (nextJobdata) {
      return Job.fromJSON(queue, nextJobData, nextJobId);
    }
    ```

**注意**

默认情况下，由' getNextJob '或' moveToCompleted '返回的作业的锁持续时间是 30 秒，如果它花费的时间超过 30 秒，作业将自动返回
标记为暂停，并根据最大暂停选项将移动回等待状态或标记为失败。
为了避免这种情况，您必须使用' job.extendLock(duration) '，以便在锁过期前给您更多的时间。
建议在锁时间过了一半后延长锁。
