---
title: "JSDoc 标签"
linkTitle: ""
weight: 10
---

目前 Compodoc 只支持这些 JSDoc 标签 (由于 [TypeScript 编译器的限制](https://github.com/Microsoft/TypeScript/wiki/JSDoc-support-in-JavaScript)) :

- `@deprecated Deprecated description`

  ```js
  /**
   * This is my class
   * @deprecated This class is deprecated
   */
  class MyClass {}
  ```

- `@returns {Type} Description`

  ```js
  /**
   * @param {string} target  The target to process
   * @returns The processed target number
   */
  function processTarget(target:string):number;
  ```

- `@ignore`, `@internal`

  这些标记指示代码中的符号永远不应该出现在文档中。

  `@ignore` 适用于类、组件或可注入组件内部，也适用于整个组件。

  ```js
  /**
   * @ignore
   */
  @Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.css"],
  })
  export class AppComponent {}
  ```

  ```js
  /**
   * Footer component
   */
  @Component({
    selector: "the-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.css"],
  })
  export class FooterComponent {
    /**
     * @ignore
     */
    ignoredProperty: string;

    /**
     * @ignore
     */
    @Input() ignoredInput: string;

    /**
     * @ignore
     */
    @Output() ignoredOutput;

    /**
     * @ignore
     */
    ignoredFunction() {}
  }
  ```

- `@param {Type} Name Description`

  ```js
  /**
   * @example
   * This is a good example
   * processTarget('yo')
   *
   * @param {string} target  The target to process see {@link Todo}
   * @returns The processed target number
   */
  function processTarget(target:string):number;
  ```

- `@link` : 你可以像 JSDoc 一样使用这三种语法:

  ```js
  //for an internal reference

  {@link Todo}
  [Todo]{@link Todo}
  {@link Todo|TodoClass}

  Anchors are supported : [Todo]{@link Todo#myproperty}

  //for an external link

  [Google]{@link http://www.google.com}
  {@link http://www.apple.com|Apple}
  {@link https://github.com GitHub}
  ```

- `@example` : 要给出指令、组件和管道装饰器的示例，请使用@example 或 markdown:

  **缩进的警告** : TypeScript 对新行有内部空白，如果你想保持一定程度的缩进，就像下一个例子一样，至少放 13 个空格字符。

  ```js
  /**
   * 显示某一天的所有事件。使用示例:
   *
   * `` `
   * &lt;mwl-calendar-day-view
   *             [viewDate]="viewDate"
   *             [events]="events"&gt;
   * &lt;/mwl-calendar-day-view&gt;
   * `` `
   */

  /**
   * 显示某一天的所有事件。使用示例:
   *
   * @example
   * <mwl-calendar-day-view
   *             [viewDate]="viewDate"
   *             [events]="events">
   * </mwl-calendar-day-view>
   */
  ```
