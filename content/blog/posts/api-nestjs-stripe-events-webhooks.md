---
title: "用webhook对Stripe事件做出反应"
linkTitle: "Stripe事件"
weight: 39
---

> https://wanago.io/2021/07/05/api-nestjs-stripe-events-webhooks/

到目前为止，在本系列中，我们已经通过发送请求与 Stripe 进行了交互。
它要么是直接在前端请求 Stripe API，要么是在后端请求。
有了网钩，Stripe 可以用另一种方式与我们交流。

Webhook 是我们 API 中的一个 URL, Stripe 可以请求它向我们发送各种事件，如付款信息或客户更新信息。
在本文中，我们将探讨 webhook 的思想，并将其实现到我们的应用程序中，以避免向 Stripe 询问用户订阅状态。
通过这样做，我们旨在提高应用程序的性能并避免超过速率限制。

## 在 NestJS 中使用 Stripe webhook

We aim to develop with Stripe webhooks while running the application on localhost.
When working with webhooks, we expect Stripe to make requests to our API.
By default, our app can’t be accessed from outside while running locally.
Because of that, we need an additional step to test webhooks.
To perform it, we need Stripe CLI.
We can download it here.

We need to forward received events to our local API.
To do it, we need to run the following:

stripe listen --forward-to localhost:3000/webhook

### 处理 webhook 签名秘密

In response, we receive the webhook signing secret.
We will need it in our API to validate requests made to our /webhook endpoint.

A valid approach is to keep the webhook secret in our environment variables.

app.module.ts

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "@hapi/joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        STRIPE_WEBHOOK_SECRET: Joi.string(),
        // ...
      }),
    }),
    // ...
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

.env

```ts
STRIPE_WEBHOOK_SECRET=whsec_...
# ...
```

### 访问请求的原始主体

NestJS 使用 body-parser 库来解析传入的请求体。
正因为如此，我们不能直接访问原始的主体。
不过，我们需要使用的处理 webhook 的 Stripe 包需要它。

为了处理上述问题，我们可以创建一个中间件，将原始主体附加到请求中。

rawBody.middleware.ts

```ts
import { Response } from "express";
import { json } from "body-parser";
import RequestWithRawBody from "../stripeWebhook/requestWithRawBody.interface";

function rawBodyMiddleware() {
  return json({
    verify: (request: RequestWithRawBody, response: Response, buffer: Buffer) => {
      if (request.url === "/webhook" && Buffer.isBuffer(buffer)) {
        request.rawBody = Buffer.from(buffer);
      }
      return true;
    },
  });
}

export default rawBodyMiddleware;
```

如果你想了解更多关于中间件的知识，请查看 TypeScript Express 教程#1。
中间件、路由和控制器

上面，我们使用了 RequestWithRawBody 接口。
我们需要定义它。

requestWithRawBody.interface.ts

```ts
import { Request } from "express";

interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

export default RequestWithRawBody;
```

为了让中间件工作，我们需要在 bootstrap 函数中使用它。

main.ts

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import rawBodyMiddleware from "./utils/rawBody.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(rawBodyMiddleware());

  // ...

  await app.listen(3000);
}
bootstrap();
```

### 解析 webhook 请求

当 Stripe 请求我们的 webhook 路由时，我们需要解析请求。
要成功做到这一点，我们需要三件事:

webhook 的密钥，原始的请求负载，Stripe 签名的请求头。
通过 Stripe 签名头，我们可以验证事件是由 Stripe 发送的，而不是由第三方发送的。

当我们拥有了上述所有内容时，我们可以使用 Stripe 库来构造事件数据。

stripe.service.ts

```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export default class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(configService.get("STRIPE_SECRET_KEY"), {
      apiVersion: "2020-08-27",
    });
  }

  public async constructEventFromPayload(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get("STRIPE_WEBHOOK_SECRET");

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  // ...
}
```

使用 NestJS 管理 Stripe webhook 的最后一步是用`/webhook`路由创建一个控制器。

stripeWebhook.controller.ts

```ts
import { Controller, Post, Headers, Req, BadRequestException } from "@nestjs/common";
import StripeService from "../stripe/stripe.service";
import RequestWithRawBody from "./requestWithRawBody.interface";

@Controller("webhook")
export default class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleIncomingEvents(@Headers("stripe-signature") signature: string, @Req() request: RequestWithRawBody) {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    const event = await this.stripeService.constructEventFromPayload(signature, request.rawBody);

    // ...
  }
}
```

## 跟踪订阅的状态

我们可以用 webhook 做的一件事就是跟踪订阅的状态。
为此，让我们展开 User 实体。

user.entity.ts

```ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
class User {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ unique: true })
  public email: string;

  @Column({ nullable: true })
  public monthlySubscriptionStatus?: string;

  // ...
}

export default User;
```

We also need a way to set the monthlySubscriptionStatus property.
To do that, we need a new method in our UsersService:

users.service.ts

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Connection, In } from "typeorm";
import User from "./user.entity";
import { FilesService } from "../files/files.service";
import StripeService from "../stripe/stripe.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async updateMonthlySubscriptionStatus(stripeCustomerId: string, monthlySubscriptionStatus: string) {
    return this.usersRepository.update({ stripeCustomerId }, { monthlySubscriptionStatus });
  }

  // ...
}
```

To use the above logic, we need to expand our StripeWebhookController:

stripeWebhook.controller.ts

```ts
import { Controller, Post, Headers, Req, BadRequestException } from "@nestjs/common";
import StripeService from "../stripe/stripe.service";
import RequestWithRawBody from "./requestWithRawBody.interface";
import { UsersService } from "../users/users.service";
import Stripe from "stripe";

@Controller("webhook")
export default class StripeWebhookController {
  constructor(private readonly stripeService: StripeService, private readonly usersService: UsersService) {}

  @Post()
  async handleIncomingEvents(@Headers("stripe-signature") signature: string, @Req() request: RequestWithRawBody) {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    const event = await this.stripeService.constructEventFromPayload(signature, request.rawBody);

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const data = event.data.object as Stripe.Subscription;

      const customerId: string = data.customer as string;
      const subscriptionStatus = data.status;

      await this.usersService.updateMonthlySubscriptionStatus(customerId, subscriptionStatus);
    }
  }
}
```

Above, we had to sort out some TypeScript issues.
Currently, Stripe recommends casting to deal with them.

In our flow, Stripe calls our /webhook endpoint and sends us events.
We check if they are connected to subscriptions by checking the event.type property.
If that’s the case, we can assume that the event.data.object property is a subscription.
With that knowledge, we can update the monthlySubscriptionStatus property of a user.

## Webhook 幂等性

According to the Stripe documentation, Stripe might occasionally send the same event more than once.
They advise us to create a mechanism to guard the application against processing the same event multiple times and making our event processing idempotent.

One way of doing so would be to keep the id of every processed event in the database.

stripeEvent.entity.ts

```ts
import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
class StripeEvent {
  @PrimaryColumn()
  public id: string;
}

export default StripeEvent;
Please notice that above we define a primary column that is not auto-generated.
We aim to use the event id from Stripe to populate this column.

stripeWebhook.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import StripeEvent from './StripeEvent.entity';
import { Repository } from 'typeorm';

@Injectable()
export default class StripeWebhookService {
  constructor(
    @InjectRepository(StripeEvent)
    private eventsRepository: Repository<StripeEvent>
  ) {}

  createEvent(id: string) {
    return this.eventsRepository.insert({ id });
  }
}
A crucial thing to notice is that the createEvent throws an error when we try to use an id that already exists in the database.
We can use it to improve our StripeWebhookController.

stripeWebhook.controller.ts
import { Controller, Post, Headers, Req, BadRequestException } from '@nestjs/common';
import StripeService from '../stripe/stripe.service';
import RequestWithRawBody from './requestWithRawBody.interface';
import { UsersService } from '../users/users.service';
import StripeWebhookService from './stripeWebhook.service';

@Controller('webhook')
export default class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly usersService: UsersService,
    private readonly stripeWebhookService: StripeWebhookService
  ) {}

  @Post()
  async handleIncomingEvents(
    @Headers('stripe-signature') signature: string,
    @Req() request: RequestWithRawBody
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const event = await this.stripeService.constructEventFromPayload(signature, request.rawBody);

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      return this.stripeWebhookService.processSubscriptionUpdate(event);
    }
  }
}
```

Since our controller keeps growing, let’s move part of the logic to our StripeWebhookService.

stripeWebhook.service.ts

```ts
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import StripeEvent from "./StripeEvent.entity";
import { Repository } from "typeorm";
import Stripe from "stripe";
import PostgresErrorCode from "../database/postgresErrorCode.enum";
import { UsersService } from "../users/users.service";

@Injectable()
export default class StripeWebhookService {
  constructor(
    @InjectRepository(StripeEvent)
    private eventsRepository: Repository<StripeEvent>,
    private readonly usersService: UsersService
  ) {}

  createEvent(id: string) {
    return this.eventsRepository.insert({ id });
  }

  async processSubscriptionUpdate(event: Stripe.Event) {
    try {
      await this.createEvent(event.id);
    } catch (error) {
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new BadRequestException("This event was already processed");
      }
    }

    const data = event.data.object as Stripe.Subscription;

    const customerId: string = data.customer as string;
    const subscriptionStatus = data.status;

    await this.usersService.updateMonthlySubscriptionStatus(customerId, subscriptionStatus);
  }
}
```

With the above code, our endpoint throws an error when Stripe sends the same event again.

Deleting old events with cron might be a good idea.
If you want to do that, check out API with NestJS #25.
Sending scheduled emails with cron and Nodemailer

## 总结

在本文中，我们了解了更多关于 Stripe 的知识，并通过响应 Stripe 事件改进了应用程序。
为了做到这一点，我们必须实现一个接受来自 Stripe 请求的 webhook。
这样做时，我们已经开始跟踪订阅状态的变化。
我们还确保不会对同一个事件进行多次解析。
