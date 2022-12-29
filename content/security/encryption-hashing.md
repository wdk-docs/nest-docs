# 加密和散列

**加密** 是对信息进行编码的过程。
这个过程将信息的原始表示形式(即明文)转换为另一种形式(即密文)。
理想情况下，只有授权方才能将密文解密为明文并访问原始信息。
加密本身并不能防止干扰，但会拒绝向潜在的拦截者提供可理解的内容。
加密是一种双向功能;被加密的东西可以用合适的密钥解密。

哈希是将一个给定的键转换成另一个值的过程。
哈希函数用于根据数学算法生成新值。
一旦哈希操作完成，从输出到输入应该是不可能的。

## 加密

Node.js 提供了一个内置的[crypto 模块](https://nodejs.org/api/crypto.html)，你可以使用它来加密和解密字符串、数字、缓冲区、流等。
Nest 本身并没有在这个模块上提供任何额外的包，以避免引入不必要的抽象。

例如，我们使用 AES(高级加密系统) `'aes-256-ctr'` 算法 CTR 加密模式。

```typescript
import { createCipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const iv = randomBytes(16);
const password = 'Password used to generate key';

// The key length is dependent on the algorithm.
// In this case for aes256, it is 32 bytes.
const key = (await promisify(scrypt)(password, 'salt', 32)) as Buffer;
const cipher = createCipheriv('aes-256-ctr', key, iv);

const textToEncrypt = 'Nest';
const encryptedText = Buffer.concat([
  cipher.update(textToEncrypt),
  cipher.final(),
]);
```

现在要解密`encryptedText`值:

```typescript
import { createDecipheriv } from 'crypto';

const decipher = createDecipheriv('aes-256-ctr', key, iv);
const decryptedText = Buffer.concat([
  decipher.update(encryptedText),
  decipher.final(),
]);
```

## 哈希

对于哈希，我们建议使用[bcrypt](https://www.npmjs.com/package/bcrypt)或[argon2](https://www.npmjs.com/package/argon2)包。
Nest 本身没有在这些模块上提供任何额外的包装器，以避免引入不必要的抽象(使学习曲线变短)。

例如，让我们使用`bcrypt`来哈希一个随机密码。

首先安装所需的软件包:

```shell
$ npm i bcrypt
$ npm i -D @types/bcrypt
```

安装完成后，您可以使用`hash`函数，如下所示:

```typescript
import * as bcrypt from 'bcrypt';

const saltOrRounds = 10;
const password = 'random_password';
const hash = await bcrypt.hash(password, saltOrRounds);
```

要生成 salt，使用`genSalt`函数:

```typescript
const salt = await bcrypt.genSalt();
```

要比较/检查密码，使用`compare`函数:

```typescript
const isMatch = await bcrypt.compare(password, hash);
```

你可以阅读更多关于可用函数的信息[这里](https://www.npmjs.com/package/bcrypt).
