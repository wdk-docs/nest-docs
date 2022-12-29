---
title: "文档覆盖"
linkTitle: ""
weight: 12
---

# General information

Documentation coverage is calculated only for all statement of the file, even decorators.

Private functions are not part of the calculation.

The command `--coverageTest` gives the ability to test under a CI context the level of documentation coverage.

![screenshot](../assets/img/screenshots/8.png)

The command `--coverageTestThresholdFail` gives the ability to specify if command will fail with error or just warn user (true: error, false: warn) (default: true)

The command `--coverageMinimumPerFile` gives the ability to specify a minimum of coverage per file.

## Test coverage during commit process

1. install first [lint-staged](https://github.com/okonet/lint-staged) : `npm i -d lint-staged`
2. add the configuration inside your `package.json` file :

```json
"devDependencies": {
    ...
},
"lint-staged": {
    "linters": {
        "*.ts": ["compodoc --coverageMinimumPerFile 25"]
    }
}
```
