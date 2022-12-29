# 映射类型

当你构建出像 **CRUD** (创建/读取/更新/删除)这样的特性时，在基本实体类型上构造变体通常是有用的。
Nest 提供了几个执行类型转换的实用函数，使这项任务更加方便。

## 部分

当构建输入验证类型(也称为 dto)时，在同一类型上构建 **create**和**update** 变体通常是有用的。
例如， **create**可能要求所有字段，而**update** 可能使所有字段都是可选的。

Nest 提供了`PartialType()`实用函数来简化这个任务并减少样板文件。

`PartialType()`函数返回一个类型(类)，将输入类型的所有属性设置为 **可选** 。
例如，假设我们有一个 **create** 类型，如下:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

默认情况下，所有这些字段都是必需的。
要创建具有相同字段的类型，但每个字段都是可选的，使用`PartialType()`传递类引用(`CreateCatDto`)作为参数:

```typescript
export class UpdateCatDto extends PartialType(CreateCatDto) {}
```

!!! info "**Hint**"

    `PartialType()`函数是从`@nestjs/swagger`包中导入的。

## 选择

`PickType()`函数通过从输入类型中选择一组属性来构造一个新的类型(类)。
例如，假设我们以这样的类型开始:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

我们可以使用`PickType()`实用函数从这个类中选取一组属性:

```typescript
export class UpdateCatAgeDto extends PickType(CreateCatDto, ['age'] as const) {}
```

!!! info "**Hint**"

    `PickType()`函数是从`@nestjs/swagger`包中导入的。

## 省略

`OmitType()`函数从输入类型中选择所有属性，然后删除特定的键集，从而构造一个类型。
例如，假设我们以这样的类型开始:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  age: number;

  @ApiProperty()
  breed: string;
}
```

我们可以生成一个派生类型，它拥有 **除** `name`之外的所有属性，如下所示。
在这个结构中，“OmitType”的第二个参数是一个属性名数组。

```typescript
export class UpdateCatDto extends OmitType(CreateCatDto, ['name'] as const) {}
```

!!! info "**Hint**"

    `OmitType()`函数是从`@nestjs/swagger`包中导入的。

## 交叉引用

`IntersectionType()`函数将两种类型组合成一个新类型(类)。
例如，假设我们从两种类型开始:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  breed: string;
}

export class AdditionalCatInfo {
  @ApiProperty()
  color: string;
}
```

我们可以生成一个新类型，它组合了这两种类型中的所有属性。

```typescript
export class UpdateCatDto extends IntersectionType(
  CreateCatDto,
  AdditionalCatInfo,
) {}
```

!!! info "**Hint**"

    `IntersectionType()`函数是从`@nestjs/swagger`包中导入的。

## 组合

类型映射实用程序函数是可组合的。
例如，下面的代码将生成一个类型(类)，它具有`CreateCatDto`类型的所有属性，除了`name`之外，这些属性将被设置为可选:

```typescript
export class UpdateCatDto extends PartialType(
  OmitType(CreateCatDto, ['name'] as const),
) {}
```
