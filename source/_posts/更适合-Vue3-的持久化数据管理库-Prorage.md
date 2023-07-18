---
title: 更适合 Vue3 的持久化数据(localStorage)管理库 Prorage

toc: true
date: 2023-07-14 10:30:00
categories:
- [前端, JavaScript]
tags:
- JavaScript
- Vue
---

你是否阅读过《你可能不需要 Vuex》或是《你可能不需要 Pinia》？使用 `reactive` 创建一个全局变量代替 **Vuex** 或 **Pinia**，作为全局状态。个人非常喜欢这么做，但没有与之配套的持久化数据方案，于是就产生了 **Prorage**。

<!-- more -->


## Prorage 简介
项目地址：[aweikalee/prorage](https://github.com/aweikalee/prorage)

`Prorage` = `Proxy` + `Storage`。

让 `localStorage` 使用起来像对象一样自然。

基于 `@vue/reactivity` 实现的持久化数据管理，与 `reactive` 有着几乎相同的使用方式。与 `@vue/reactivity` 一样可以脱离 **Vue** 单独使用。

提供了插件系统，可以实现大部分定制化的需求。内置了有效期、数据转换的插件。

## 快速上手

### Playground
[Stackblitz](https://stackblitz.com/edit/prorage-playground?file=src%2Fstorage.ts)

### 安装
```
npm install @vue/reactivity
npm install prorage
```

如果你已经安装了 Vue，则不需要再安装 `@vue/reactivity`。

### 使用

```js
import { createStorage, expiresPlugin } from 'prorage'

const storage = createStorage()

storage.foo = 'foo'
delete foo

storage.bar = []
storage.bar.push('hello')
```

## 特性

### 更丰富的数据类型支持
`localStorage` 只支持字符串，通常会使用 `JSON.stringify/JSON.parse` 对数据处理。

**Prorage** 在 `JSON.stringify/JSON.parse` 基础上，以插件(`translatePlugin`)的形式提供了更多的类型支持。

**基础类型支持情况对比：**
| 数据类型 | localStorage | JSON.stringify | Prorage with translatePlugin |
| :-: | :-: | :-: | :-: |
| undefined | ✔️ | ✔️ | ✔️ |
| null | ✔️ | ✔️ | ✔️ |
| String | ❌ | ✔️ | ✔️ |
| Boolean | ❌ | ✔️ | ✔️ |
| Number | ❌ | ✔️，但不支持 NaN/Infinity/-Infinity | ✔️ |
| BigInt | ❌ | ❌ | ✔️ |
| Symbol | ❌ | ❌ | 可以支持 `Symbol.for` (需用户配置) |

此外还增加了 `Date`, `RegExp` 的支持。如果还不满足，则可以通过 `translatePlugin` 设置更多的类型支持。

> `Set/Map` 实现成本与收益不匹配，并未支持。而 `WeakSet/WeakMap` 则因实现没有意义，也未支持。

### 有效期
`localStorage` 不支持设置数据有效期。

**Prorage** 的 `expiresPlugin` 插件则提供了设置有效期的支持。

```js
import { createStorage, expiresPlugin, useExpires, getExtra } from 'prorage'
const storage = createStorage({
  plugins: [expiresPlugin()]
})

storage.foo = useExpires('bar', { days: 7 })

console.log(storage.foo) // 'bar'

// 7天后
console.log(storage.foo) // undefined
```

和通常的有效期方案不同的是，**Prorage** 中存在两种有效期检查，一是在数据被读取时检查，二是设置了定时器定期检查，过期的数据将会被拦截/删除。这使得 **Prorage** 能更好得配合前端框架，及时更新视图。

### 定制化
**Prorage** 提供了较大的定制空间。

```js
const storage = createStorage({
  storage: localStorage,
  stringify: JSON.stringify,
  parse: JSON.parse,
  prefix: 'prefix#',
  plugins: [expiresPlugin()]
})
```

| 参数 | 说明 |
| :-: | :-: |
| storage | 储存对象 可替换为 `sessionStorage` 或是其他 `StorageLike` |
| stringify | 转换为 JSON 字符串的方法 |
| parse | 解析 JSON 字符串的方法 |
| prefix | 储存键名前缀 |
| plugins | 插件 |

#### Plugin 插件
插件可声明一系列 Hook，在特定时机被调用。通过插件，可以实现大部分定制化的需求。

插件的详细说明请看文档。

#### 循环引用
可以借助 [flatted](https://github.com/WebReflection/flatted) 之类的 JSON 库来解决循环引用的问题.

```js
import { stringify, parse, } from 'flatted'
import { createStorage } from 'prorage'

const storage = createStorage({
  stringify,
  parse,
})

storage.test = {}
storage.test.circular = storage.test
```

#### 与 Vue 一起使用
**Prorage** 完全可以当做 `reactive` 对象使用。

```js
import { watch, computed } from 'vue'
import { createStorage } from 'prorage'

const storage = createStorage()

const foo = computed(() => storage.foo)
watch(() => storage.bar, (value) => {
  console.log(`[bar changed]: ${value}`)
})
```

#### 与 React 一起使用
就和 `@vue/reactivity` 在 React 中使用一样，以下是一种简单的使用示例：[Prorage With React - StackBlitz](https://stackblitz.com/edit/prorage-with-react?file=src%2FApp.jsx)。

## 写在后面
如果你也不爱使用 **Vuex/Pinia**，不妨试试使用 **Prorage** 管理持久化数据。

当然如果你的项目使用了 **Vuex/Pinia**，那还是更建议使用配套的持久化数据插件。

你有什么想法或建议，欢迎交流。