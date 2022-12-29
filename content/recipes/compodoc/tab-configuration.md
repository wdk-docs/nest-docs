---
title: "选项卡配置"
linkTitle: ""
weight: 17
---

## 自定义选项卡顺序和标签

The ordering of the tabs and the text used for their labels can be modified by setting the `navTabConfig`
input either as a property in a compodoc configuration file or as an argument to the `compodoc` CLI command.

The `navTabConfig` input is an array of tab configuration objects representing the superset of tabs that will
be shown for the various dependencies in your project. The ordering of the array determines the left-to-right
placement of the tabs in the compodoc output, and the string value of a tab object's `label`
property determines the label displayed on the corresponding tab.

## 定义一个标签

```
{
  "id": "info",
  "label": "Custom Label"
}
```

The tab id is used to determine which tab to apply the custom placement and label to. The available tab id's are:
**"info"**, **"readme"**, **"source"**, **"templateData"**, **"tree"**, and **"example"**.

## 需要注意的事情

Certain tabs will only be shown if applicable to a given dependency:

- **"info"**, **"readme"**, and **"source"** tabs are applicable to all dependency types.

- **"templateData"** and **"tree"** tabs are applicable to Components.

- The **"example"** tab is applicable to Component, Directive, Injectable, and Pipe dependencies.

Additionally, the **"example"**, **"readme"**, and **"templateData"** tabs will only be shown for dependencies
that specify content for them. For instance, dependencies for which no examples are provided will not have an
example tab.

## 配置文件中的示例用法

```
{
    "navTabConfig": [
        {
            "id": "example",
            "label": "Overview"
        },
        {
            "id": "info",
            "label": "API"
        },
        {
            "id": "source",
            "label": "Source"
        },
        {
            "id": "tree",
            "label": "DOM Tree"
        }
    ],
    "tsconfig": "./src/tsconfig.json"
}
```

## 作为 CLI 参数的示例用法

Note: Double-quotes must be escaped with "\\".

```
 compodoc --navTabConfig '[{\"id\": \"example\",\"label\": \"Overview\"},{\"id\": \"info\",\"label\": \"API\"},{\"id\": \"source\",\"label\": \"Source\"}]' -p src/tsconfig.json -n 'Documentation Name' -s
```
