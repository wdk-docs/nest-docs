---
title: "node-cache-manager - 灵活的NodeJS缓存模块"
linkTitle: "缓存管理"
weight: 4
---

> https://github.com/BryanDonovan/node-cache-manager

[![build status](https://secure.travis-ci.org/BryanDonovan/node-cache-manager.svg)](http://travis-ci.org/BryanDonovan/node-cache-manager)
[![Coverage Status](https://coveralls.io/repos/BryanDonovan/node-cache-manager/badge.svg?branch=master)](https://coveralls.io/r/BryanDonovan/node-cache-manager?branch=master)

一个用于 nodejs 的缓存模块，允许在缓存、分级缓存和一致的接口中轻松包装函数。

## 特性

- 在缓存中包装任何函数的简单方法。
- 分级缓存——数据存储在每个缓存中，并首先从最高优先级的缓存中获取。
- 使用任何你想要的缓存，只要它有相同的 API。
- 通过[mocha](https://github.com/visionmedia/mocha)， [istanbul](https://github.com/yahoo/istanbul)和[sinon](http://sinonjs.org)实现 100%的测试覆盖率。

## Express.js 例子

参见[Express.js cache-manager 示例应用](https://github.com/BryanDonovan/node-cache-manager-express-example)了解如何在你的应用中使用 `node-cache-manager`。

## 安装

```sh
npm install cache-manager
```

## 存储引擎

- [node-cache-manager-redis](https://github.com/dial-once/node-cache-manager-redis) (uses [sol-redis-pool](https://github.com/joshuah/sol-redis-pool))

- [node-cache-manager-redis-store](https://github.com/dabroek/node-cache-manager-redis-store) (uses [node_redis](https://github.com/NodeRedis/node_redis))

- [node-cache-manager-ioredis](https://github.com/dabroek/node-cache-manager-ioredis) (uses [ioredis](https://github.com/luin/ioredis))

- [node-cache-manager-mongodb](https://github.com/v4l3r10/node-cache-manager-mongodb)

- [node-cache-manager-mongoose](https://github.com/disjunction/node-cache-manager-mongoose)

- [node-cache-manager-fs-binary](https://github.com/sheershoff/node-cache-manager-fs-binary)

- [node-cache-manager-fs-hash](https://github.com/rolandstarke/node-cache-manager-fs-hash)

- [node-cache-manager-hazelcast](https://github.com/marudor/node-cache-manager-hazelcast)

- [node-cache-manager-memcached-store](https://github.com/theogravity/node-cache-manager-memcached-store)

- [node-cache-manager-memory-store](https://github.com/theogravity/node-cache-manager-memory-store)

- [node-cache-manager-couchbase](https://github.com/davidepellegatta/node-cache-manager-couchbase)

## 概述

### `wrap` 函数

**首先**，它包含一个 `wrap` 函数，可以让你在缓存中包装任何函数。
(注意，这是受到[node-caching](https://github.com/mape/node-caching)的启发。)
这可能就是您正在寻找的功能。举个例子，你可能需要这样做:

```javascript
function getCachedUser(id, cb) {
  memoryCache.get(id, function (err, result) {
    if (err) {
      return cb(err);
    }

    if (result) {
      return cb(null, result);
    }

    getUser(id, function (err, result) {
      if (err) {
        return cb(err);
      }
      memoryCache.set(id, result);
      cb(null, result);
    });
  });
}
```

... 你可以使用`wrap`函数:

```javascript
function getCachedUser(id, cb) {
  memoryCache.wrap(
    id,
    function (cacheCallback) {
      getUser(id, cacheCallback);
    },
    { ttl: ttl },
    cb
  );
}
```

### 内存缓存

**第二**，`node-cache-manager` 具有内置的内存缓存(使用[node-lru-cache](https://github.com/isaacs/node-lru-cache))，与你期望在大多数缓存中的标准函数:

```lua
    set(key, val, {ttl: ttl}, cb) // * see note below
    get(key, cb)
    del(key, cb)
    mset(key1, val1, key2, val2, {ttl: ttl}, cb) // set several keys at once
    mget(key1, key2, key3, cb) // get several keys at once
    // * Note that depending on the underlying store, you may be able to pass the
    // ttl as the third param, like this:
    set(key, val, ttl, cb)
    // ... or pass no ttl at all:
    set(key, val, cb)
```

### 分级缓存

**第三**，`node-cache-manager` 允许你设置分级缓存策略。
在大多数情况下，这可能是有限的使用，但想象一下这样一个场景:你期望大量的流量，并不想每次请求都冲击你的主缓存(如 Redis)。
您决定将最常见的请求数据存储在内存缓存中，可能具有非常短的超时时间和/或较小的数据大小限制。
但你还是想把数据存储在 Redis 中，以备备份，以及处理那些不像你想存储在内存中的请求那样常见的请求。
这是 `node-cache-manager` 可以轻松且透明地处理的。

### 设置多个键

**第四**，它允许你获得和设置多个键，一次为缓存存储，支持它。
这意味着当获得多个键时，它将从最高优先级的开始通过不同的缓存(见下面的多存储)，并合并它在每个级别上找到的值。

## 用法示例

参见下面的示例和示例目录中的示例。
参见 `examples/redis_example` ，了解如何使用连接池实现 Redis 缓存存储。

### 单一的存储

```javascript
var cacheManager = require("cache-manager");
var memoryCache = cacheManager.caching({ store: "memory", max: 100, ttl: 10 /*seconds*/ });
var ttl = 5;
// Note: callback is optional in set() and del().
// Note: memory cache clones values before setting them unless `shouldCloneBeforeSet` is set to false

memoryCache.set("foo", "bar", { ttl: ttl }, function (err) {
  if (err) {
    throw err;
  }

  memoryCache.get("foo", function (err, result) {
    console.log(result);
    // >> 'bar'
    memoryCache.del("foo", function (err) {});
  });
});

function getUser(id, cb) {
  setTimeout(function () {
    console.log("Returning user from slow database.");
    cb(null, { id: id, name: "Bob" });
  }, 100);
}

var userId = 123;
var key = "user_" + userId;

// Note: ttl is optional in wrap()
memoryCache.wrap(
  key,
  function (cb) {
    getUser(userId, cb);
  },
  { ttl: ttl },
  function (err, user) {
    console.log(user);

    // Second time fetches user from memoryCache
    memoryCache.wrap(
      key,
      function (cb) {
        getUser(userId, cb);
      },
      function (err, user) {
        console.log(user);
      }
    );
  }
);

// Outputs:
// Returning user from slow database.
// { id: 123, name: 'Bob' }
// { id: 123, name: 'Bob' }
```

`ttl` 也可以通过传入一个函数来动态计算。例如,

```javascript
var opts = {
    ttl: function(user) {
        if (user.id === 1) {
            return 0.1;
        } else {
            return 0.5;
        }
    }
};

memoryCache.wrap(key, function(cb) {
    getUser(userId, cb);
}, opts, function(err, user) {
    console.log(user);
}
```

你可以一次拿几个键。
请注意，这将返回它在缓存中找到的任何记录，由用户根据所提供的键检查结果，并调用底层数据存储来填充缺失的记录。
在实践中，如果你只是使用`wrap`函数在缓存中设置这些记录，这应该不是一个大问题。

> 附注: 理想情况下， `wrap` 函数将从缓存中获得它所能得到的，并从数据存储中填充缺失的记录，但我无法想到一种适用于所有情况的方法来做到这一点。
> 另一种选择是，如果找到了所有记录，则只返回缓存中的数据，但这将破坏多缓存。

更多信息请参见`caching.unit.js`中的单元测试。

例子:

```js
var key1 = "user_1";
var key2 = "user_1";

memoryCache.wrap(
  key1,
  key2,
  function (cb) {
    getManyUser([key1, key2], cb);
  },
  function (err, users) {
    console.log(users[0]);
    console.log(users[1]);
  }
);
```

#### 使用 mset()和 mget()设置/获取几个键的示例

```js
memoryCache.mset("foo", "bar", "foo2", "bar2", { ttl: ttl }, function (err) {
  if (err) {
    throw err;
  }

  memoryCache.mget("foo", "foo2", function (err, result) {
    console.log(result);
    // >> ['bar', 'bar2']

    // Delete keys with del() passing arguments...
    memoryCache.del("foo", "foo2", function (err) {});

    // ...passing an Array of keys
    memoryCache.del(["foo", "foo2"], function (err) {});
  });
});
```

#### 例子中使用的承诺

```javascript
memoryCache
  .wrap(key, function () {
    return getUserPromise(userId);
  })
  .then(function (user) {
    console.log("User:", user);
  });
```

如果您使用的 Node 版本不包括本机承诺，您可以在传递给缓存模块的选项中指定承诺依赖项。例如,

```javascript
var Promise = require("es6-promise").Promise;
cache = caching({ store: store, promiseDependency: Promise });
```

#### 使用异步/等待示例

```javascript
try {
  let user = await memoryCache.wrap(key, function () {
    return getUserPromise(userId);
  });
} catch (err) {
  // error handling
}
```

> 提示:应该用`try` - `catch`封装`await`调用来处理`promise`错误。

#### Express 应用使用示例

(参见[Express.js 缓存管理器示例应用](https://github.com/BryanDonovan/node-cache-manager-express-example)).

```javascript
function respond(res, err, data) {
  if (err) {
    res.json(500, err);
  } else {
    res.json(200, data);
  }
}

app.get("/foo/bar", function (req, res) {
  var cacheKey = "foo-bar:" + JSON.stringify(req.query);
  var ttl = 10;
  memoryCache.wrap(
    cacheKey,
    function (cacheCallback) {
      DB.find(req.query, cacheCallback);
    },
    { ttl: ttl },
    function (err, result) {
      respond(res, err, result);
    }
  );
});
```

#### 定制店

你可以通过创建一个与内置内存存储相同的 API(如 redis 或 memcached 存储)来使用自己的自定义存储。
要使用自己的存储，只需传入它的一个实例。

E.g.,

```javascript
var myStore = require("your-homemade-store");
var cache = cacheManager.caching({ store: myStore });
```

### Multi-Store

```javascript
var multiCache = cacheManager.multiCaching([memoryCache, someOtherCache]);
userId2 = 456;
key2 = "user_" + userId;
ttl = 5;

// Sets in all caches.
// The "ttl" option can also be a function (see example below)
multiCache.set("foo2", "bar2", { ttl: ttl }, function (err) {
  if (err) {
    throw err;
  }

  // Fetches from highest priority cache that has the key.
  multiCache.get("foo2", function (err, result) {
    console.log(result);
    // >> 'bar2'

    // Delete from all caches
    multiCache.del("foo2");
  });
});

// Set the ttl value by context depending on the store.
function getTTL(data, store) {
  if (store === "redis") {
    return 6000;
  }
  return 3000;
}

// Sets multiple keys in all caches.
// You can pass as many key,value pair as you want
multiCache.mset("key", "value", "key2", "value2", { ttl: getTTL }, function (err) {
  if (err) {
    throw err;
  }

  // mget() fetches from highest priority cache.
  // If the first cache does not return all the keys,
  // the next cache is fetched with the keys that were not found.
  // This is done recursively until either:
  // - all have been found
  // - all caches has been fetched
  multiCache.mget("key", "key2", function (err, result) {
    console.log(result[0]);
    console.log(result[1]);
    // >> 'bar2'
    // >> 'bar3'

    // Delete from all caches
    multiCache.del("key", "key2");
    // ...or with an Array
    multiCache.del(["key", "key2"]);
  });
});

// Note: options with ttl are optional in wrap()
multiCache.wrap(
  key2,
  function (cb) {
    getUser(userId2, cb);
  },
  { ttl: ttl },
  function (err, user) {
    console.log(user);

    // Second time fetches user from memoryCache, since it's highest priority.
    // If the data expires in the memory cache, the next fetch would pull it from
    // the 'someOtherCache', and set the data in memory again.
    multiCache.wrap(
      key2,
      function (cb) {
        getUser(userId2, cb);
      },
      function (err, user) {
        console.log(user);
      }
    );
  }
);

// Multiple keys
multiCache.wrap(
  "key1",
  "key2",
  function (cb) {
    getManyUser(["key1", "key2"], cb);
  },
  { ttl: ttl },
  function (err, users) {
    console.log(users[0]);
    console.log(users[1]);
  }
);
```

### 指定在`wrap`函数中缓存什么

`caching`和`multicaching`模块都允许你传入一个名为`isCacheableValue`的回调函数，`wrap`函数会根据从缓存或包装函数返回的每个值来调用这个回调函数。
这让你可以通过`wrap`来指定哪些值应该缓存，哪些值不应该缓存。
如果函数返回 `true` ，它将被存储在缓存中。
默认情况下，缓存会缓存除`undefined`之外的所有内容。

> 注意:`caching`和`multicaching`中的`set`函数不使用`isCacheableValue`。

例如，如果你不想缓存`false`和`null`，你可以像这样传入一个函数:

```javascript
var isCacheableValue = function (value) {
  return value !== null && value !== false && value !== undefined;
};
```

然后像这样将它传递给' caching ':

```javascript
var memoryCache = cacheManager.caching({ store: "memory", isCacheableValue: isCacheableValue });
```

然后像这样将它传递给“multicaching”:

```javascript
var multiCache = cacheManager.multiCaching([memoryCache, someOtherCache], {
  isCacheableValue: isCacheableValue,
});
```

### 在后台刷新缓存键

`caching`和`multicaching`模块都支持在使用`wrap`函数时在后台刷新过期缓存键的机制。
这可以通过在创建缓存存储时添加“refreshThreshold”属性来实现。

如果设置了`refreshThreshold`并且`ttl`方法对已用存储区可用，则从缓存中获取一个值后将检查 `ttl` 。
如果剩余的 `TTL` 小于`refreshThreshold`，系统将生成一个后台 worker 来更新该值，遵循与标准抓取相同的规则。
同时，系统将返回旧值，直到过期。

在多缓存的情况下，用于刷新的存储区是首先找到键的存储区(优先级最高)。
然后将在所有存储中设置该值。

NOTES:

- 在多缓存的情况下，将被检查刷新的存储是一个键将被首先找到(最高优先级)。
- 如果阈值很低，工作函数很慢，键可能会过期，你可能会遇到一个更新值的竞赛条件。
- 后台刷新机制目前不支持提供多键 `wrap` 功能。
- 缓存存储需要提供`ttl`方法。

例如，像这样将 `refreshThreshold` 传递给`caching`:

```javascript
var redisStore = require("cache-manager-ioredis");

var redisCache = cacheManager.caching({ store: redisStore, refreshThreshold: 3, isCacheableValue: isCacheableValue });
```

当从 Redis 中检索到一个剩余 TTL < 3sec 的值时，该值将在后台更新。

### 开发环境

你可以禁用真正的缓存，但仍然可以通过设置“none”存储来实现所有的回调功能。

## 文档

生成 JSDOC 3 文档:

```sh
make docs
```

## 测试

要运行测试，请首先运行:

```sh
npm install -d
```

运行测试和 JShint:

```sh
make
```

## 贡献

如果你想为项目做出贡献，请分叉它，并向我们发送一个拉请求。
请为任何新功能或 bug 修复添加测试。
同样在提交 pull 请求之前运行' make '。

## 许可证

`node-cache-manager` 是在 `MIT` 许可证下授权的。
