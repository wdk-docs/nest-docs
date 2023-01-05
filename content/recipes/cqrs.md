# CQRS

简单的[CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)(创建、读取、更新和删除)应用程序的流程可以使用以下步骤描述:

1. The **controllers** layer handles HTTP requests and delegates tasks to the services layer.
2. The **services layer** is where most of the business logic lives.
3. Services use **repositories / DAOs** to change / persist entities.
4. Entities act as containers for the values, with setters and getters.

在大多数情况下，对于小型和中型应用程序，这种模式就足够了。
然而，当我们的需求变得更加复杂时，**CQRS** 模型可能更加合适和可扩展。
为了促进这个模型，Nest 提供了一个轻量级的[CQRS 模块](https://github.com/nestjs/cqrs)。
本章介绍如何使用。

## 安装

首先安装所需的包：

```bash
$ npm install --save @nestjs/cqrs
```

## Commands

在此模型中，每个操作称为 **命令**。
当一个命令被分派时，应用程序对它作出反应。
命令可以从服务层分派，也可以直接从控制器/网关分派。
命令由 **命令处理程序** 使用。

=== "heroes-game.service.ts"

    ```ts
    @Injectable()
    export class HeroesGameService {
      constructor(private commandBus: CommandBus) {}

      async killDragon(heroId: string, killDragonDto: KillDragonDto) {
        return this.commandBus.execute(
          new KillDragonCommand(heroId, killDragonDto.dragonId),
        );
      }
    }
    ```

=== "heroes-game.service.js"

    ```js
    @Injectable()
    @Dependencies(CommandBus)
    export class HeroesGameService {
      constructor(commandBus) {
        this.commandBus = commandBus;
      }

      async killDragon(heroId, killDragonDto) {
        return this.commandBus.execute(
          new KillDragonCommand(heroId, killDragonDto.dragonId),
        );
      }
    }
    ```

Here's a sample service that dispatches `KillDragonCommand`. Let's see how the command looks:

=== "kill-dragon.command.ts"

    ```ts
    export class KillDragonCommand {
      constructor(
        public readonly heroId: string,
        public readonly dragonId: string,
      ) {}
    }
    ```

=== "kill-dragon.command.js"

    ```js
    export class KillDragonCommand {
      constructor(heroId, dragonId) {
        this.heroId = heroId;
        this.dragonId = dragonId;
      }
    }
    ```

The `CommandBus` is a **stream** of commands. It delegates commands to the equivalent handlers. Each command must have a corresponding **Command Handler** :

=== "kill-dragon.handler.ts"

    ```ts
    @CommandHandler(KillDragonCommand)
    export class KillDragonHandler implements ICommandHandler<KillDragonCommand> {
      constructor(private repository: HeroRepository) {}

      async execute(command: KillDragonCommand) {
        const { heroId, dragonId } = command;
        const hero = this.repository.findOneById(+heroId);

        hero.killEnemy(dragonId);
        await this.repository.persist(hero);
      }
    }
    ```

=== "kill-dragon.handler.js"

    ```js
    @CommandHandler(KillDragonCommand)
    @Dependencies(HeroRepository)
    export class KillDragonHandler {
      constructor(repository) {
        this.repository = repository;
      }

      async execute(command) {
        const { heroId, dragonId } = command;
        const hero = this.repository.findOneById(+heroId);

        hero.killEnemy(dragonId);
        await this.repository.persist(hero);
      }
    }
    ```

With this approach, every application state change is driven by the occurrence of a **Command** . The logic is encapsulated in handlers. With this approach, we can simply add behavior like logging or persisting commands in the database (e.g., for diagnostics purposes).

## Events

Command handlers neatly encapsulate logic. While beneficial, the application structure is still not flexible enough, not **reactive**. To remedy this, we also introduce **events** .

=== "hero-killed-dragon.event.ts"

    ```ts
    export class HeroKilledDragonEvent {
      constructor(
        public readonly heroId: string,
        public readonly dragonId: string,
      ) {}
    }
    ```

=== "hero-killed-dragon.event.js"

    ```js
    export class HeroKilledDragonEvent {
      constructor(heroId, dragonId) {
        this.heroId = heroId;
        this.dragonId = dragonId;
      }
    }
    ```

Events are asynchronous. They are dispatched either by **models** or directly using `EventBus`. In order to dispatch events, models have to extend the `AggregateRoot` class.

=== "hero.model.ts"

    ```ts
    export class Hero extends AggregateRoot {
      constructor(private id: string) {
        super();
      }

      killEnemy(enemyId: string) {
        // logic
        this.apply(new HeroKilledDragonEvent(this.id, enemyId));
      }
    }
    ```

=== "hero.model.js"

    ```js
    export class Hero extends AggregateRoot {
      constructor(id) {
        super();
        this.id = id;
      }

      killEnemy(enemyId) {
        // logic
        this.apply(new HeroKilledDragonEvent(this.id, enemyId));
      }
    }
    ```

The `apply()` method does not dispatch events yet because there's no relationship between the model and the `EventPublisher` class. How do we associate the model and the publisher? By using a publisher `mergeObjectContext()` method inside our command handler.

=== "kill-dragon.handler.ts"

    ```ts
    @CommandHandler(KillDragonCommand)
    export class KillDragonHandler implements ICommandHandler<KillDragonCommand> {
      constructor(
        private repository: HeroRepository,
        private publisher: EventPublisher,
      ) {}

      async execute(command: KillDragonCommand) {
        const { heroId, dragonId } = command;
        const hero = this.publisher.mergeObjectContext(
          await this.repository.findOneById(+heroId),
        );
        hero.killEnemy(dragonId);
        hero.commit();
      }
    }
    ```

=== "kill-dragon.handler.js"

    ```js
    @CommandHandler(KillDragonCommand)
    @Dependencies(HeroRepository, EventPublisher)
    export class KillDragonHandler {
      constructor(repository, publisher) {
        this.repository = repository;
        this.publisher = publisher;
      }

      async execute(command) {
        const { heroId, dragonId } = command;
        const hero = this.publisher.mergeObjectContext(
          await this.repository.findOneById(+heroId),
        );
        hero.killEnemy(dragonId);
        hero.commit();
      }
    }
    ```

Now everything works as expected. Notice that we need to `commit()` events since they're not being dispatched immediately. Obviously, an object doesn't have to exist up front. We can easily merge type context as well:

```typescript
const HeroModel = this.publisher.mergeClassContext(Hero);
new HeroModel('id');
```

Now the model has the ability to publish events. Additionally, we can emit events manually using `EventBus`:

```typescript
this.eventBus.publish(new HeroKilledDragonEvent());
```

!!! info "**Hint**"

    The `EventBus` is an injectable class.

Each event can have multiple **Event Handlers** .

=== "hero-killed-dragon.handler.ts"

    ```ts
    @EventsHandler(HeroKilledDragonEvent)
    export class HeroKilledDragonHandler
      implements IEventHandler<HeroKilledDragonEvent>
    {
      constructor(private repository: HeroRepository) {}

      handle(event: HeroKilledDragonEvent) {
        // logic
      }
    }
    ```

Now we can move the **write logic** into the event handlers.

## Sagas

This type of **Event-Driven Architecture** improves application **reactiveness and scalability**. Now, when we have events, we can simply react to them in various ways. **Sagas** are the final building block from an architectural point of view.

Sagas are an extremely powerful feature. A single saga may listen for 1..\* events. Using the [RxJS](https://github.com/ReactiveX/rxjs) library, it can combine, merge, filter or apply other `RxJS` operators on the event stream. Each saga returns an Observable which contains a command. This command is dispatched **asynchronously** .

=== "heroes-game.saga.ts"

    ```ts
    @Injectable()
    export class HeroesGameSagas {
      @Saga()
      dragonKilled = (events$: Observable<any>): Observable<ICommand> => {
        return events$.pipe(
          ofType(HeroKilledDragonEvent),
          map((event) => new DropAncientItemCommand(event.heroId, fakeItemID)),
        );
      };
    }
    ```

=== "heroes-game.saga.js"

    ```js
    @Injectable()
    export class HeroesGameSagas {
      @Saga()
      dragonKilled = (events$) => {
        return events$.pipe(
          ofType(HeroKilledDragonEvent),
          map((event) => new DropAncientItemCommand(event.heroId, fakeItemID)),
        );
      };
    }
    ```

!!! info "**Hint**"

    The `ofType` operator is exported from the `@nestjs/cqrs` package.

We declared a rule - when any hero kills the dragon, the ancient item should be dropped. With this in place, `DropAncientItemCommand` will be dispatched and processed by the appropriate handler.

## Queries

The `CqrsModule` can also be used for handling queries. The `QueryBus` follows the same pattern as the `CommandsBus`. Query handlers should implement the `IQueryHandler` interface and be marked with the `@QueryHandler()` decorator.

## Setup

Finally, let's look at how to set up the whole CQRS mechanism.

=== "heroes-game.module.ts"

    ```ts
    export const CommandHandlers = [KillDragonHandler, DropAncientItemHandler];
    export const EventHandlers = [HeroKilledDragonHandler, HeroFoundItemHandler];

    @Module({
      imports: [CqrsModule],
      controllers: [HeroesGameController],
      providers: [
        HeroesGameService,
        HeroesGameSagas,
        ...CommandHandlers,
        ...EventHandlers,
        HeroRepository,
      ],
    })
    export class HeroesGameModule {}
    ```

## Summary

`CommandBus`, `QueryBus` and `EventBus` are **Observables**. This means that you can easily subscribe to the whole stream and enrich your application with **Event Sourcing** .

## Example

A working example is available [here](https://github.com/kamilmysliwiec/nest-cqrs-example).
