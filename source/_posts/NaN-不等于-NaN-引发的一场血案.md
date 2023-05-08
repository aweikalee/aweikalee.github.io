---
title: NaN 不等于 NaN 引发的一场血案

toc: true
date: 2023-05-08 12:00:00
categories:
- [前端, JavaScript]
- [前端, 微信小程序, 开发记录]
tags:
- JavaScript
- 微信小程序
---

本文是修复第三方依赖 BUG 的记录，包含定位 BUG 的一种思路、第三方依赖的 BUG 临时解决方法、 `miniprogram-computed` 实现原理与源码解析。

<!-- more -->

某天，同事说使用我封装的价格组件会导致程序崩溃。

价格组件主要是对价格进行格式化与拆分，使其更符合业务与设计需求，没有复杂的逻辑。

我想着这么简单的组件，怎么会出问题呢？我之前用得都好好的。

## 定位
整个项目中到处都有用价格组件，但只有这一处会崩溃。但一进该页面，程序就会崩溃，没法看是不是数据错了，所以通过注释大法先确认造成崩溃的代码块。

确定了是价格组件的问题后，打印了一下传入的参数，发现是个 `NaN`。而组件内我对 `false` 类型的值是做了处理的，猜测是微信小程序 `properties` 的类型问题或是计算属性（`miniprogram-computed`）的问题。

最终接着控制变量法与注释大法配合，确定了问题出在计算属性上。此时我想到了，`NaN` 不等于 `NaN`。

这就得看看 `miniprogram-computed` 的源码了，猜测是 `NaN` 不等于 `NaN` 引起的问题，所以可以尝试在源码里搜 `===`、`!==`。

很幸运，直接在 `behavior.ts` 文件中找到了两处相关代码：
```ts
// will be invoked when setData is called
const updateValueAndRelatedPaths = () => {
  /* ... */
  let needUpdate = false
  // check whether its dependency updated
  for (let i = 0; i < oldPathValues.length; i++) {
    /* ... */
    // 第一处
    if (oldVal !== curVal) {
      needUpdate = true
      break
    }
  }
  if (!needUpdate) return false

  /* ... */
  return true
}
```

``` ts
// compare
let changed = false
for (let i = 0; i < curVal.length; i++) {
  const options = paths[i].options
  const deepCmp = options.deepCmp
  // 第二处
  if (
    deepCmp
      ? !deepEqual(oldVal[i], curVal[i])
      : oldVal[i] !== curVal[i]
  ) {
    changed = true
    break
  }
}
```

第一处推测是判断新旧值是否一致，不一致则会进行更新，所以碰上 `NaN` 时会陷入更新的死循环；

第二处由于是在根据上下文判断，是 `watch` 的相关方法，和我们此次的 `computed` 没有关系，暂时搁置。

## 解决
根据上述推测，我们需要将 `oldVal !== curVal` 改为更合理的判断。写一个 `equal` 函数：
```ts
function equal(a: unknown, b: unknown) {
  if (a === b) {
    return true
  } else {
    // 当 a 和 b 都是 NaN
    // NaN === NaN 是 false
    return a !== a && b !== b
  }
}
```

替换为 `equal`

```diff
  // will be invoked when setData is called
  const updateValueAndRelatedPaths = () => {
    /* ... */
    let needUpdate = false
    // check whether its dependency updated
    for (let i = 0; i < oldPathValues.length; i++) {
      /* ... */
-     if (oldVal !== curVal) {
+     if (!equal(oldVal, curVal)) {
        needUpdate = true
        break
      }
    }
    if (!needUpdate) return false

    /* ... */
    return true
  }
```

好，提一个 PR 上去。好个屁！上面全是推测，都没读源码好意思提？

## 临时补丁
阅读源码、提交PR、合并与发版，这些时间都是不可控的。项目还等着上线，应该临时先解决问题。

我们的项目是用 `npm` 管理依赖的，那么可以使用 `patch-package` 对依赖打上临时补丁。从 node_modules 目录中找到 `miniprogram-computed`。

### 确定依赖文件
首先需要确定项目的入口文件，在 `package.json` 中寻找（不清楚的话可以看 [package.json 导入模块入口文件优先级详解](/2023/04/22/package.json-导入模块入口文件优先级详解/)）。

很容易可以得到，入口文件是 `dist/index.js`。

### 修改代码
直接对 `node_modules/miniprogram-computed/dist/index.js` 进行修改，修改内容如同上一节说的。

碰上代码被压缩过的情况，可以借助其他代码格式化工具（比如 prettier），先进行格式化。

### 生成补丁
执行命令：
```sh
$ npx patch-package miniprogram-computed
```

会在项目根目录下生成 `patches/miniprogram-computed+4.0.4.patch` 文件。

最后在 `package.json` 中添加：
```diff
  {
    "scripts": {
+     "postinstall": "patch-package"
    }
  }
```

这会使 `patch-package` 在安装依赖之后运行，将补丁应用到项目中。

### 注意事项
`patch-package` 只会对该版本的依赖打上补丁。如果你的项目没有锁依赖版本，当依赖更新并重新安装时，补丁会无效。

## 源码解析
虽然上面的修改，测试下来并没有什么问题，但毕竟全程是靠推测的，不放心，还是得看看源码——[computed/behavior.ts](https://github.com/wechat-miniprogram/computed/blob/470d5176787c09db597ba2a351d2628166e06a16/src/behavior.ts)。

### 基础原理
虽然微信小程序没有 `computed` 的概念，但有和 `watch` 差不多的 `observers`。

`computed` 本身做的就是执行时收集依赖、监听依赖、将执行结果赋值，当依赖变化时重新执行、收集、监听、赋值。其中监听依赖的部分可以交给 `observers` 实现，剩下的就由 `miniprogram-computed` 实现。

### 基础结构
对应 [computed/behavior.ts L92](https://github.com/wechat-miniprogram/computed/blob/470d5176787c09db597ba2a351d2628166e06a16/src/behavior.ts#LL92C20-L92C20)，简化后是这样：

```ts
Object.keys(computedDef).forEach((targetField) => {
  const updateMethod = computedDef[targetField]
  const val = updateMethod(this.data)

  this.setData({
    [targetField]: val,
  })
})
```

`computedDef` 是定义在配置项上的 `computed`，将 `data` 作为参数运行 `updateMethod`，将结果在设置回 `data` 上。

### 收集依赖
对应 [computed/behavior.ts L96](https://github.com/wechat-miniprogram/computed/blob/470d5176787c09db597ba2a351d2628166e06a16/src/behavior.ts#LL92C20-L92C20)

```ts
import * as dataTracer from './data-tracer'

Object.keys(computedDef).forEach((targetField) => {
  const updateMethod = computedDef[targetField]
  const relatedPathValuesOnDef = [] // 被访问的路径
  const val = updateMethod(
    dataTracer.create(this.data, relatedPathValuesOnDef) // 创建代理 data
  )

  this.setData({
    [targetField]: dataTracer.unwrap(val), // 解除代理，还原成原始对象。
  })
})
```

`dataTracer.create` 创建一个 `Proxy` 对象，代理 `this.data`。当 `updateMethod` 访问 `Proxy` 对象中的值，则会记录被访问的路径并添加到 `relatedPathValuesOnDef`。

生成的 `val` 中可能存在被 `Proxy` 的值，所以此处有一个 `dataTracer.unwrap` 将值全部还原成原始值。

至于 `dataTracer` 如何实现的就先不管了。

### 监听依赖、重新执行与赋值
监听收集到的依赖路径对应的值，发生变化时重新执行 `updateMethod`。

对应 [computed/behavior.ts L112](https://github.com/wechat-miniprogram/computed/blob/470d5176787c09db597ba2a351d2628166e06a16/src/behavior.ts#LL112C26-L112C26) 与 [computed/behavior.ts L151](https://github.com/wechat-miniprogram/computed/blob/470d5176787c09db597ba2a351d2628166e06a16/src/behavior.ts#L151)。

`miniprogram-computed` 用 `observers` 监听了 `data` 上所有值，然后做了个脏检查，对所有计算属性的依赖值进行新旧对比。

```ts
const computedWatchInfo = this._computedWatchInfo[computedWatchDefId] // 在实例上储存相关信息
Object.keys(computedDef).forEach((targetField) => {
  /* ... */
  const pathValues = relatedPathValuesOnDef.map(({ path }) => ({
    path,
    value: dataPath.getDataOnPath(this.data, path),
  }))
  computedWatchInfo.computedRelatedPathValues[targetField] =
    pathValues //  储存依赖的值

  const updateValueAndRelatedPaths = () => {
    const oldPathValues =
      computedWatchInfo.computedRelatedPathValues[targetField]
    let needUpdate = false
    // 依赖新旧值对比，不同则标记为需要更新
    for (let i = 0; i < oldPathValues.length; i++) {
      const { path, value: oldVal } = oldPathValues[i]
      const curVal = dataPath.getDataOnPath(this.data, path)
      if (oldVal !== curVal) { // 此处便是本次 BUG 的发源地
        needUpdate = true
        break
      }
    }
    if (!needUpdate) return false 

    // 需要更新 则重新执行 updateMethod 重新收集依赖、储存依赖的值、赋值
    // 下面这段和初始化执行的是一样的
    const relatedPathValues = []
    const val = updateMethod(
      dataTracer.create(this.data, relatedPathValues),
    )
    this.setData({
      [targetField]: dataTracer.unwrap(val),
    })
    const pathValues = relatedPathValues.map(({ path }) => ({
      path,
      value: dataPath.getDataOnPath(this.data, path),
    }))
    computedWatchInfo.computedRelatedPathValues[targetField] =
      pathValues
    return true
  }
  computedWatchInfo.computedUpdaters.push(
    updateValueAndRelatedPaths,
  )
})
```

```ts
observersItems.push({
  fields: '**', // 监听 data 上所有值
  observer(this: BehaviorExtend) {
    if (!this._computedWatchInfo) return
    const computedWatchInfo = this._computedWatchInfo[computedWatchDefId]
    if (!computedWatchInfo) return

    let changed: boolean
    do {
      // 运行脏检查
      changed = computedWatchInfo.computedUpdaters.some((func) =>
        func.call(this),
      )
    } while (changed)
  },
})
```

所以当依赖的值存在 `NaN` 时，会一直被标记为 `changed`，从而导致死循环。

### watch 部分
前面提到 `watch` 的部分也存在类似的不相等比较的代码。

`watch` 的实现是在 `observers` 的基础上，增加了新旧值对比，当值一样时则不会执行。而 `observers` 则是只要被赋值都会执行。

虽然并不会引起死循环，但碰上 `NaN` 时会导致其逻辑与预期不符，所以也需要修复。

## 提交 PR
最终提交 PR，同时修改了 `computed` 与 `watch` 两处的不相等比较。`v4.3.8` 及之后修复了该 BUG。
