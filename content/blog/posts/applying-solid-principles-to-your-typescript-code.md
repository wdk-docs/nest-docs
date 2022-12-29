---
title: "对typescript代码应用可靠的原则"
linkTitle: "可靠原则"
date: "2022-02-03"
author: "wanago.io"
description: >
---

SOLID 原则在相当长的一段时间以前就被定义了，现在仍然适用。
他们的目标是使我们的软件更容易理解、阅读和扩展。
我们把这个概念归功于罗伯特·C。
马丁 2000 年的论文。
不过，SOLID 的首字母缩略词是后来定义的。
在本文中，我们将介绍 SOLID 的所有原理，并在 TypeScript 的例子中体现出来。

## 单一职责原则

单一职责原则声明一个类应该只负责单一功能。
以上也涉及到模块和功能。

```ts
class Statistics {
  public computeSalesStatistics() {
    // ...
  }
  public generateReport() {
    // ...
  }
}
```

我们应该把上面的类分成两个单独的类。
SOLID 将责任的概念定义为改变的理由。

Robert C.Martin 在他的博客文章中讨论了我们如何定义改变的理由。
他强调，不应该在代码方面进行审议。
例如，根据单一责任原则，重构不是更改的原因。

要定义更改的原因，我们需要调查我们的程序的责任是什么。

Statistics 类可能会因为两个不同的原因而改变:

- 销售统计计算逻辑发生变化，
- 报告的格式发生变化

单一职责原则强调了上述两个方面给 Statistics 类增加了两种不同的职责。

```ts
class Statistics {
  public computeSalesStatistics() {
    // ...
  }
}
class ReportGenerator {
  public generateReport() {
    // ...
  }
}
```

现在我们必须分开类，每个类都有一个改变的原因，因此只有一个责任。
应用上述原则使我们的代码更容易解释和理解。

## 开闭原则

根据开放-封闭原则，软件实体对扩展是开放的，对修改是封闭的。

上述原则的核心思想是，我们应该能够在不改变现有代码的情况下添加新功能。

```ts
class Rectangle {
  public width: number;
  public height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
class Circle {
  public radius: number;
  constructor(radius: number) {
    this.radius = radius;
  }
}
```

假设我们想要创建一个函数来计算形状数组的面积。
在我们当前的设计中，它可能是这样的:

```ts
function calculateAreasOfMultipleShapes(shapes: Array<Rectangle | Circle>) {
  return shapes.reduce((calculatedArea, shape) => {
    if (shape instanceof Rectangle) {
      return calculatedArea + shape.width * shape.height;
    }
    if (shape instanceof Circle) {
      return calculatedArea + shape.radius * Math.PI;
    }
  }, 0);
}
```

多亏了基于控制流的收缩，TypeScript 知道我们的形状有哪些属性。
我们在《理解 TypeScript 中的任意和未知》中讨论过这个主题。

### never 和 void 之间的区别

上述方法的问题是，当我们引入一个新形状时，我们需要修改 calculateAreasOfMultipleShapes 函数。
这使得它可以修改，打破了开闭原则。

我们可以通过强制我们的形状拥有一个返回区域的方法来解决这个问题。

```ts
interface Shape {
  getArea(): number;
}
class Rectangle implements Shape {
  public width: number;
  public height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  public getArea() {
    return this.width * this.height;
  }
}
class Circle implements Shape {
  public radius: number;
  constructor(radius: number) {
    this.radius = radius;
  }
  public getArea() {
    return this.radius * Math.PI;
  }
}
```

现在我们确信所有的形状都有 getArea 函数，我们可以进一步使用它。

```ts
function calculateAreasOfMultipleShapes(shapes: Shape[]) {
  return shapes.reduce((calculatedArea, shape) => {
    return calculatedArea + shape.getArea();
  }, 0);
}
```

现在，当我们引入一个新形状时，我们不需要修改 calculateAreasOfMultipleShapes 函数。
我们对延期开放，对修改关闭。

我们也可以通过使用抽象类而不是接口来实现上述功能

## Liskov 替换原则

上述规则，由 Barbara Liskov 介绍，也帮助我们确保更改系统的一个区域不会破坏其他部分。
为了使这一原则不那么令人困惑，我们将把它分成多个部分。

用子类替换类的实例不会产生任何负面影响

在上述原则中，我们注意到的第一件事是，它的主要焦点是类继承。

让我们来实现一个简单而生动的例子来说明如何打破上述原则。

```ts
class Employee {
  protected permissions: any = new Set<string>();

  public hasPermission(permissionName: string) {
    return this.permissions.has(permissionName);
  }
  public addPermission(permissionName: string) {
    return this.permissions.add(permissionName);
  }
}
class Cashier extends Employee {
  protected permissions: string[] = [];

  public addPermission(permissionName: string) {
    this.permissions.push(permissionName);
  }
}
function isPersonAllowedToDeleteProducts(person: Employee) {
  return person.hasPermission("deleteProducts");
}
```

上面的代码问题很大，因为出纳和用户的权限实现是不同的。

```ts
const employee = new Employee();
employee.addPermission("deleteProducts");
isPersonAllowedToDeleteProducts(employee);
```

上面的代码工作得很好，但是当我们用子类替换父类的实例时，就会遇到问题。

```ts
const cashier = new Cashier();
cashier.addPermission("deleteProducts");
isPersonAllowedToDeleteProducts(cashier);
```

> TypeError: this.permissions.has is not a function

这种情况非常明显，不应该出现在正确键入的 TypeScript 代码中。
我们必须使用 `permissions: any` 来允许出纳不恰当地扩展用户。

### 验证条件

一个更完善的示例是前置条件和验证。

```ts
class Employee {
  protected permissions = new Set<string>();

  public addPermission(permissionName: string) {
    return this.permissions.add(permissionName);
  }
}
class Cashier extends Employee {
  public addPermission(permissionName: string) {
    if (permissionName === "deleteProducts") {
      throw new Error("Cashier should not be able to delete products!");
    }
    return this.permissions.add(permissionName);
  }
}
```

另一方面，上面的示例在类型方面很好。
不幸的是，它也打破了利斯科夫替换原则。

```ts
const employee = new Employee();
employee.addPermission("deleteProducts");
const employee = new Cashier();
employee.addPermission("deleteProducts");
```

> Error: Cashier should not be able to delete products!

同样的事情也适用于输出条件。
如果我们覆盖的函数返回一个值，那么子类不应该对输出进行额外的验证。

## 接口隔离原则

接口隔离原则强调创建更小、更具体的接口。
让我们想象一下下面的情况。

```ts
interface Bird {
  fly(): void;
  walk(): void;
}
```

上图中，我们有一个鸟的接口。
我们假设鸟能走能飞。
创建这样一只鸟的例子很简单:

```ts
class Nightingale implements Bird {
  public fly() {
    /// ...
  }
  public walk() {
    /// ...
  }
}
```

不过，上述情况并不总是如此。
上述假设可能是错误的。

```ts
class Kiwi implements Bird {
  public fly() {
    throw new Error("Unfortunately, Kiwi can not fly!");
  }
  public walk() {
    /// ...
  }
}
```

接口隔离原则指出，不应该强迫客户端依赖于它不使用的方法。
在接口中放入太多属性，可能会破坏上述规则。

我们可能要做的是实现更小的接口，有时称为角色接口。

```ts
interface CanWalk {
  walk(): void;
}
interface CanFly {
  fly(): void;
}
class Nightingale implements CanFly, CanWalk {
  public fly() {
    /// ...
  }
  public walk() {
    /// ...
  }
}
class Kiwi implements CanWalk {
  public walk() {
    /// ...
  }
}
```

通过改变接口的方法，我们避免了接口的膨胀，并使我们的软件更容易维护。

## 依赖性倒置原则

依赖倒置原则的核心是高层模块不应该依赖低层模块。
相反，它们都应该依赖于抽象。

让我们创建一个示例来进一步研究上述问题。

```ts
interface Person {
  introduceSelf(): void;
}
class Engineer implements Person {
  public introduceSelf() {
    console.log("I am an engineer");
  }
}
class Musician implements Person {
  public introduceSelf() {
    console.log("I am a musician");
  }
}
```

上述行为是基本的和学术性的，但并不总是这样。
如果介绍更复杂，我们可能需要为此创建单独的类。

```ts
interface IntroductionService {
  introduce(): void;
}
class EngineerIntroductionService implements IntroductionService {
  public introduce() {
    console.log("I am an engineer");
  }
}
class Engineer implements Person {
  private introductionService = new EngineerIntroductionService();
  public introduceSelf() {
    this.introductionService.introduce();
  }
}
```

不幸的是，上面的代码打破了依赖倒置原则。
它说我们应该颠倒工程师和工程师介绍所的依赖关系。

```ts
class Engineer implements Person {
  public introductionService: EngineerIntroductionService;

  constructor(introductionService: IntroductionService) {
    this.introductionService = introductionService;
  }

  public introduceSelf() {
    this.introductionService.introduce();
  }
}
const engineer = new Engineer(new EngineerIntroductionService());
```

上面的好处是我们不需要工程师和音乐家的子类。

```ts
class Person {
  public introductionService: IntroductionService;

  constructor(introductionService: IntroductionService) {
    this.introductionService = introductionService;
  }
  public introduceSelf() {
    this.introductionService.introduce();
  }
}
const engineer = new Person(new EngineerIntroductionService());
const musician = new Person(new MusicianIntroductionService());
```

上面的方法是一个使用组合而不是继承的例子。

此外，这使我们的类更容易进行单元测试，因为我们可以毫不费力地在构造函数中提供模拟服务。

## 总结

在本文中，我们已经讨论了所有 SOLID 原则:

- S: 单一职责原则
- O: 开闭原则
- L: Liskov 替换原则
- I: 接口隔离原则
- D: 依赖性倒置原则

通过将它们应用到我们的代码中，我们可以使其更具可读性和可维护性。
此外，这些都是很好的实践，可以使我们的代码库更容易扩展，同时不影响应用程序的其他部分。

尽管 SOLID 的定义已经有一段时间了，但它表明它仍然是可关联的，并且我们可以从理解它们中获得一些真正的好处。
