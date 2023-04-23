---
title: package.json 导入模块入口文件优先级详解 main, browser, module, exports

toc: true
date: 2023-04-22 12:00:00
categories:
- [前端, JavaScript]
tags:
- NodeJS
- npm
- Webpack
- Vite
---

模块入口文件在 `package.json` 中进行描述，通常使用 `main`, `browser`, `module`, `exports` 等字段。本文将对各字段的意义与诞生原因、优先级进行说明。并以 **Node**、**Webpack**、**Vite** 为例，对比模块入口处理上的差异。

<!-- more -->

## 字段说明
### main
`main` 是最为基础且古老的入口字段，由 **Node** 与 **npm** 定义。当 `main` 字段都不存在时，通常会使用 `index.js` 作为入口。

>[main | package.json | npm Docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-json/#main)
>
> [main | Modules: Packages | Node.js Documentation](https://nodejs.org/api/packages.html#main)

#### 使用方法
```json
{
  "main": "./index.js"
}
```

### module
`module` 字段提供符合 **ESM** 规范的模块入口。

2015年 **ESM** 规范诞生，使用 **CommonJS** 的模块规范 **Node** 开始向 **ESM** 规范过渡，社区出现了 `module` 字段的提案：[A Proposal for Node.js Modules](https://github.com/dherman/defense-of-dot-js/blob/master/proposal.md)。

但 Node 却并未采纳，而是使用了 `{ "type": "module" }` 代替。

不过，打包工具普遍支持了该字段。只是实现的与提案有很大差距，实际情况是，`module` 和 `main` 一样对待，只是优先级更高。

#### 使用方法
```json
{
  "module": "./index.esm.js"
}
```

### browser
`browser` 字段提供对浏览器环境更友好的模块入口。

来自于提案：[package-browser-field-spec](https://github.com/defunctzombie/package-browser-field-spec)。社区普遍认可、并实现该方案，然后在2018年才被 **npm** 吸收到文档（**npm** 除了文档中提到一句话以外，似乎并没有做任何工作）。

> [browser | package.json | npm Docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-json/#browser)

#### 使用方法
```json
{
  "browser": "./index.browser.js"
}
```
`browser(字符串)` 将代替 `main`, `module`。

另一种对象的写法，键名(Key)匹配被访问的路径，键值(Value)则是实际路径：
```json
{
  "main": "./index.js",
  "module": "./index.mjs",
  "browser": {
    "./index.js": "./index.browser.js",
    "./index.mjs": "./index.browser.esm.js"
  }
}
```

`browser(对象)` 不仅可以作为入口文件的别名，也可以用于包内部依赖的别名，比如：
```json
{
  "main": "./index.js",
  "browser": {
    "axios": "./axios.js",
    "./dom.js": "./dom.browser.js",
    "log": false
  }
}
```
当 `./index.js` 文件使用到这三个依赖时：
- `axios` 模块解析到本地文件 `./axios.js`。
- `./dom.js` 本地文件解析到另一个本地文件 `./dom.browser.js`。
- 禁用 `log` 模块。

### exports
2018年，Node 社区出现了一个更为现代的提案：[proposal-pkg-exports](https://github.com/jkrems/proposal-pkg-exports/)，在 `Node v12.7.0` 版本实现。

`exports` 字段允许通过访问路径、运行环境(node/browser 等)、模块类型(require/import/types/css 等)组合确定最终的入口文件。

> 运行环境与模块类型的支持，Node 及打包工具之间的实现均有差异。

> `exports` 是对外提供多个入口，还有另一个字段 `imports` 是对内修改依赖（有点像 `browser`）。

#### 使用方法
说来话长，建议直接看 [Module Packages | Node.js Documentation](https://nodejs.org/api/packages.html#packages_package_entry_points) 或 [Package exports | Webpack](https://webpack.docschina.org/guides/package-exports/)。


## 优先级 默认版
虽然前端打包工具基本是运行在 **Node** 中的，但打包文件时模块的处理基本是由打包工具自己封装的 `Resolver` 处理的，存在一些差异，以下以 **Node**, **Webpack**, **Vite** 三者为例说明模块入口优先级的处理。

打包工具提供了些模块入口的配置，实际逻辑相对繁琐，不过大多数情况下我们使用的都是默认配置，所以先讲默认配置下的优先级，下一节再讲原始逻辑。

### Node 环境
1. `exports`
2. `main`

**Node** 不支持其他字段，所以非常简单。打包工具则是基于 **Node** 的标准进行扩展的。

### Webpack
1. `browser(对象)`
2. `exports`
4. `browser(字符串)`
3. `module`
5. `main`

若构建目标不是 Web，则跳过 `browser` 字段。

**Webpack** 会尽可能尝试去获得一个可以用的文件。

### Vite
1. `browser(对象)`
2. `exports`
3. `browser(字符串)`，当 `browser` 获得的文件不是 **ESM** 模块时，`module` 优先级会提升到 `browser` 之前。
4. `module`
5. `main`

若构建目标不是 Web，则跳过 `browser` 字段。

**Vite** 会按优先级获得路径后，再尝试获得文件，若获得不到则抛出错误。

## 优先级 原始逻辑版
### Webpack
**Webpack** 相关的配置主要在 `resolve` 中，主要影响优先级的有 `exportsFields`, `mainFields`, `aliasFields`，这些参数将会传给 [enhanced-resolve](https://github.com/webpack/enhanced-resolve) 处理。

- **exportsFields**：定义多个和 `exports` 相同作用的字段。
- **mainFields**：定义多个和 `main`, `browser(字符串)`, `module` 相同作用的字段。
- **aliasFields**：定义多个别名对象的字段，如 `browser(对象)`。

若用户没有设置，**Webpack** 会为他们设置默认值：
- **exportsFields**：`['exports']`。
- **mainFields**：当 `target` 为 `webworker`, `web` 或没有设置时默认值为 `['browser', 'module', 'main']`，否则为 `['module', 'main']`。
- **aliasFields**：`['browser']`。

**enhanced-resolve** 中主要由 `ExportsFieldPlugin`, `MainFieldPlugin`, `AliasFiledPlugin` 接受参数进行处理。

大致的流程图如下：
```mermaid
flowchart TD
  input[/输入 模块名/]
  output[/输出 模块实际路径/]

  subgraph Resolver
    ExportsFieldPlugin
    MainFieldPlugin
    AliasFiledPlugin
  end
  input --> Resolver --> output

  subgraph ExportsFieldPlugin
    matchExports{是否有符合当前环境的入口}
    hasNextExports{还有 ExportsFields 吗?}
    nextExportsField[(下一个 ExportsField)]
    exportGoToMain[(运行 MainFieldPlugin)]

    matchExports -- 没有 --> hasNextExports
    
    hasNextExports -- 没了 --> exportGoToMain
    hasNextExports -- 还有 --> nextExportsField
    nextExportsField --> matchExports
  end

  subgraph MainFieldPlugin
    getMainField[/获得字段对应的值/]
    isString{是否为字符串?}
    hasNextMain{还有 MainFields 吗?}
    nextMainField[(下一个 MainField)]
    throwError[/抛出错误/]

    getMainField --> isString
    isString --> 否 --> hasNextMain

    hasNextMain -- 没了 --> throwError
    hasNextMain -- 还有 --> nextMainField
    nextMainField --> getMainField
  end

  subgraph AliasFiledPlugin
    aliasInput[/输入/]
    AliasFileds[AliasFileds 对应的字段若是对象则转换为别名]
    hasAlias{是否存在别名?}
    tryAliasFile{别名路径文件是否存在?}
    tryFile{原路径文件是否存在?}
    aliasOutput[/输出路径/]

    aliasInput -- 匹配别名 --> AliasFileds --> hasAlias
    hasAlias -- 存在 --> tryAliasFile
    hasAlias -- 不存在 --> tryFile
    tryAliasFile -- 不存在 --> tryFile
    tryAliasFile -- 存在 --> aliasOutput
    tryFile -- 存在 --> aliasOutput
  end
  tryFile -- 不存在 --> ExportsFieldPlugin

  exportGoToMain --> MainFieldPlugin
  matchExports -- 有 --> aliasInput
  isString -- 是 --> aliasInput
```

### Vite
**Vite** 的配置也主要在 `resolve` 中，有 `mainFields`, `browserField`。参数会传给 [resolvePlugin](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/resolve.ts) 处理。

- **mainFields**：定义多个和 `main`, `module` 相同作用的字段。
- **browserField**，已废弃。

若用户没有设置，**Vite** 会设置默认值为：
- **mainFields**：`['module', 'jsnext:main', 'jsnext']`。
- **browserField**：`true`。

> `jsnext:main` 与 `jsnext` 和 `module` 是一样的作用，当时认为 `module` 会被标准化，所以 `jsnext` 被废弃了。[pkg.module | rollup](https://github.com/rollup/rollup/wiki/pkg.module)。

相关逻辑基本在 [resolvePackageEntrys](https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/resolve.ts#L931) 中，以下流程图将这段代码分成了6块，并删掉了一些边缘逻辑。
```mermaid
flowchart TD
  input[/输入 模块名/]
  output[/输出 模块实际路径/]
  
  subgraph resolvePlugin
    exports -->
    browserString -->
    mainFields -->
    main -->
    entryPoints -->
    browserObject
  end
  input --> resolvePlugin --> output
  
  subgraph exports
    exportsOuput[/输出/]
    matchExports{是否有 exrpots\n且有符合当前环境的入口?}

    matchExports -- 有 --> a1[符合的路径] --> exportsOuput
    matchExports -- 没有 --> a2[空值] --> exportsOuput
  end

  subgraph browserString["browser(字符串)"]
    browserStringInput[/输入/]
    browserStringOuput[/输出/]
    targetWeb{"构建目标是否为 Web?\n!ssr || ssrTarget === 'webworker'"}
    browserStringInputIsNull{输入的值是否为空\n或是否以 .mjs 结尾?}
    browserIsString{broswer 是字符串吗?}
    hasModule{mainFields 中\n是否有 module\n且 module 的值是否为字符串?}
    tryBrowserString{browser 指向的文件是 ESM 模块吗?}

    useBrowserInput[输入的值]
    useBrowserString[browser 的值]
    useModule[module 的值]
    

    browserStringInput --> targetWeb
    targetWeb -- 是 --> browserStringInputIsNull
    targetWeb -- 不是 --> useBrowserInput --> browserStringOuput
    
    browserStringInputIsNull -- 是 --> browserIsString
    browserStringInputIsNull -- 不是 --> useBrowserInput

    browserIsString -- 是 --> hasModule
    browserIsString -- 不是 --> useBrowserInput

    hasModule -- 有 --> tryBrowserString
    hasModule -- 没有 --> useBrowserString --> browserStringOuput

    tryBrowserString -- 是 --> useBrowserString
    tryBrowserString -- 不是 --> useModule --> browserStringOuput
  end

  subgraph mainFields
    mainFieldsInput[/输入/]
    mainFieldsOuput[/输出/]
    mainFieldsInputFromExports{输入的值是否来源于 exports?}
    mainFieldsInputIsNull{输入的值是否为空n或是否以 .mjs 结尾?}

    getField[从 mainFields 中\n获取一个字段及对应的值]
    fieldIsString{字段不为 browser\n且值是字符串吗?}
    nextMainFields{mainFields中\n是否还有字段?}

    useMainFiledsInput[输入的值]
    useMainFields[该字段的值]

    mainFieldsInput --> mainFieldsInputFromExports
    mainFieldsInputFromExports -- 不是 --> mainFieldsInputIsNull
    mainFieldsInputFromExports -- 是 --> useMainFiledsInput

    mainFieldsInputIsNull -- 是 --> getField
    mainFieldsInputIsNull -- 不是 --> useMainFiledsInput --> mainFieldsOuput
    getField --> fieldIsString
    fieldIsString -- 是 --> useMainFields --> mainFieldsOuput
    fieldIsString -- 不是 --> nextMainFields

    nextMainFields -- 有 --> getField
    nextMainFields -- 没有 --> useMainFiledsInput
  end

  subgraph main
    mainInput[/输入/]
    mainOuput[/输出/]
    mainInputIsNull{输入的值是否为空?}

    mainInput --> mainInputIsNull
    mainInputIsNull -- 是 --> useMain[main 的值] --> mainOuput
    mainInputIsNull -- 不是 --> 输入的值 --> mainOuput
  end

  subgraph entryPoints
    entryPointsInput[/输入/]
    entryPointsOuput[/输出/]
    entryPointsInputIsNull{输入的值是否为空?}

    entryPointsInput --> entryPointsInputIsNull
    entryPointsInputIsNull -- 是 --> f1["['index.js', 'index.json', 'index.node']"] --> entryPointsOuput
    entryPointsInputIsNull -- 不是 --> f2["[输入的值]"] --> entryPointsOuput
  end

  subgraph browserObject["browser(对象)"]
    browserObjectInput[/"输入(entryPoints)"/]
    browserObjectOuput[/输出/]
    getEntry[从 entryPoints 中\n获取一个值]
    targetWebObject{"构建目标是否为 Web?"}
    browserIsObject{browser 是对象吗?}
    matchBrowserObject{是否有匹配的别名?}
    tryFsResolve{指向的文件是否存在?}
    nextEntry[entryPoints中\n是否还有值?]

    useBrowserObjectInput[输入的值]
    useBrowserObject[匹配的别名路径]

    browserObjectInput --> getEntry --> targetWebObject
    targetWebObject -- 是 --> browserIsObject
    targetWebObject -- 不是 --> useBrowserObjectInput --> tryFsResolve

    browserIsObject -- 是 --> matchBrowserObject
    browserIsObject -- 不是 --> useBrowserObjectInput

    matchBrowserObject -- 有 --> useBrowserObject --> tryFsResolve
    matchBrowserObject -- 没有 --> useBrowserObjectInput

    tryFsResolve -- 存在 --> browserObjectOuput
    tryFsResolve -- 不存在 --> nextEntry

    nextEntry -- 有 --> getEntry
    nextEntry -- 没有 --> g1[空值] --> browserObjectOuput
  end
```
最终输出的路径获取不到文件时，会抛出错误。

**Vite** 对于 `browser` 字段是单独处理的。

**Vite** 认为 `.mjs` 文件不是最优的选择，降低了他的优先级 [fix: lower .mjs resolve priority](https://github.com/vitejs/vite/commit/b15e90e6893582d04f9506ef56cc9d03c9c6d775)，但我并不明白原因。

虽然 `browserField` 废弃了，但若传值为 `false`，则基本等同于构建目标不为 Web，跳过部分逻辑。


## 其他参考
- [main-fields | esbuild - API](https://esbuild.github.io/api/#main-fields)
- [What is the "module" package.json field for?](https://stackoverflow.com/questions/42708484/what-is-the-module-package-json-field-for)
- [Node.JS (New) Package.json Exports Field](https://medium.com/swlh/npm-new-package-json-exports-field-1a7d1f489ccf)