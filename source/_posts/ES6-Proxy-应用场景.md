---
title: ES6 Proxy 诞生8年了，你有使用过吗？聊聊 Proxy 的应用场景

toc: true
date: 2023-06-25 16:00:00
categories:
- [前端, JavaScript]
tags:
- JavaScript
- Proxy
---

`Proxy` 是 **ECMAScript 6** 中新增的一个 API，正式发布距今已经八年了，但你有直接使用过它吗？`Proxy` 有着很大潜力，但开发时却鲜有应用场景。本文将聊聊 `Proxy` 能怎么用，有哪些地方能用，希望能对你有所帮助。

<!-- more -->

## 什么是 Proxy
请直接看 [Proxy - JavaScript | MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)。

## 应用场景
### 数据追踪
数据追踪，是 `Proxy` 应用最多的场景，多见于状态管理库。**Vue** 与 **Mobx** 都是使用 `Proxy` 来对数据进行拦截，实现数据追踪，从而实现响应式数据。

`Proxy` 对两者来讲都是 `Object.defineProperty` 的代替品。`Proxy` 对数据的拦截更加全面、性能更好、更标准化。

相关文章很多，不过多赘述。

### 不可变状态
**React** 推行的不可变状态(immutable)，是非常优秀的思想。

而 **Mobx** 的作者，则通过 `Proxy` 实现了一套不可变数据的方案 —— [Immer](https://github.com/immerjs/immer)。通过修改临时草稿来产生下一个不可变状态。相较于其他不可变库，`Immer` 有更低的学习成本（不需要学习更多语法和数据结构，操作普通数据一样）、更好的类型推断（没有引入新的数据结构）、更高效的性能（最小化克隆）。

关于 `Immer` 是如何工作的，请看官方的介绍博客 —— [Introducing Immer: Immutability the easy way](https://medium.com/hackernoon/introducing-immer-immutability-the-easy-way-9d73d8f71cb3#3bff)。

### 链式调用
通常的链式调用，是访问的键名对应的方法，调用该方法，最后返回(新)实例。而使用 `Proxy` 可以使访问的键名作为参数，返回(新)代理对象。

来自 [Ingvar Stepanyan 的推文](https://twitter.com/RReverser/status/1138788910975397888)：
```js
const www = new Proxy(new URL("https://www"), {
  get(target, prop) {
    let orig = Reflect.get(target, prop)
    if (typeof orig === "function") return orig.bind(target)
    if (typeof prop !== "string") return orig
    if (prop === "then") return Promise.prototype.then.bind(fetch(target))
    target = new URL(target)
    target.hostname += `.${prop}`
    return new Proxy(target, this)
  },
})

await www.exmaple.org
```

非常巧妙。只可惜没有实用性以及没有其他复刻的场景。

### 沙箱
去年微前端非常热门。iFrame 的微前端方案子应用间存在着天然的隔离，而非 iFrame 的微前端则需要自行实现沙箱（Sandbox）。

沙箱的主要作用是避免子应用污染宿主环境、避免子应用间互相影响、以及为子应用创建独立的全局环境。

以 **qiankun** 为例，存在两种沙箱的实现：`SnapshotSandbox` 与 `ProxySandbox`。

`SnapshotSandbox`，使用的还是宿主环境的 `window`。在挂载子应用时会对宿主 `window` 进行快照（浅拷贝，备份），在子应用卸载时使用快照恢复宿主的 `window`。而期间对 `window` 进行的变更则会被记录，在下次挂载时应用在当前 `window` 上。

`ProxySandbox` 则为子应用创建了 `fakeWindow`，用 `with(fakeWindow)` 包裹子应用运行。子应用访问时则优先从 `fakeWindow` 寻找，其次则从宿主 `window` 上获取。子应用进行的变更则是应用在 `fakeWindow` 上，并不会影响宿主 `window`。

`SnapshotSandbox` 中的 `window` 是单例的，意味着只能同时运行一个子应用。以及每次挂载和卸载都需要对 `window` 进行遍历，性能上不如 `ProxySandbox`。所以 `ProxySandbox` 的出现让 `SnapshotSandbox` 变得很尴尬，**qiankun** 还保留 `SnapshotSandbox` 最大的原因大概就是为了兼容低版本浏览器吧（`next` 分支中已移除 `SnapshotSandbox`）。


### 适配器
当 iPhone 砍掉 3.5mm 耳机孔时，对于有线耳机的兼容，苹果解决方案是：3.5mm 转 Lightning 转接头。这个转接头就是一个适配器。

`Proxy` 本身是一个非常好的适配器，非常适合辅助封装。

#### localStorage 的封装
`localStorage` 非常适合使用 `Proxy` 进行封装。

- 基础的 `localStorage` 封装主要是在 `getItem` 和 `setItem` 中增加了 `JSON.parse` 和 `JSON.stringify`，以便于存储对象。不用 `Proxy` 就能办到。
- 再进一步，使用 `Proxy` 代理 `localStorage` 直接通过键名访问/设置，省去调用 `getItem` 与 `setItem`。
- 再进一步，深度代理 `localStorage`，那么可以实现更深层级的对象设置。
- 再进一步，使其变成响应式数据，更好地与常见的视图库/框架结合。
- 再进一步，增加插件系统，定制化 `localStorage`。

写这篇文章时发现，现有的封装，基本只到了第二步与第三步。于是，我基于 `@vue/reactivity` 实现到了第五步 —— [Prorage](https://github.com/aweikalee/prorage)。

#### 转发
除了像 `localStorage` 大刀阔斧的改造封装，还有一种更常见的封装：对原有数据/接口进行小幅度调整。比如组件封装时的 Ref 转发。

以 **Vue** 为例：
```js
const { get, has } = Reflect

const selectRef = ref() // 被封装的组件实例

const _expose = new Proxy(
  {
    foo() {/* ... */} // 改写或新增的方法
  },
  {
    get(target, key) {
      return get(target, key) ?? get(selectRef.value || {}, key)
    },

    // Vue 的 getExposeProxy 中取值前会先使用 has 判断是否存在
    // 存在时才会从当前 expose 中取值
    // 所以 has 必须写上
    has(target, key) {
      return has(target, key) || has(selectRef.value || {}, key)
    }
  }
)
defineExpose(_expose)
```

当然你也可以用原型链也是可以实现：
```js
const selectRef = ref()

const _expose = {
  foo() {/* ... */}
}
watch(selectRef, (selectRef) => Object.setPrototypeOf(_expose, selectRef))
defineExpose(_expose)
```

`Proxy` 相较于原型链，能做更多的修正。比如 `Object.keys` 访问键名时，原型链的方案无法获得原型上的键名。而 `Proxy` 中可以通过 `ownKeys` 进行修正。

不过 `Proxy` 在控制台打印的可读性非常差，原型链可读性稍微好一些。通常开源项目这两个方案都不会使用，而是使用更为直接的方案。

### 惰性创建
在设计模式中，单例模式下，有一个子模式叫惰性单例。就是在被调用时才创建实例，通常用于实例创建比较昂贵或是有副作用的情况，减少未使用时的性能与副作用。

大概长这样：
```js
let cache = null
function getInstance() {
  if (!cache) {
    cache = new Instance()
  }
  return cache
}

const instance = getInstance()
```

配上 `Proxy`，就可以写成这样：
```js
const { get, set } = Reflect

const obj = new Proxy({}, {
  get(target, key, receiver) {
    const cache = Reflecf.get(target, key, receiver)
    if (cache === undefined) {
      Reflect.set(target, key, new Instance(), receiver)
      return Reflecf.get(target, key, receiver)
    }
    return cache
  }
})

const instance = obj.instance
```

虽然这个示例看上没有什么意义，但实际惰性创建的使用还是很常见的。比如 **Vue** 的 `reactive` 就是在被访问时才会创建其代理对象。再比如 **Prorage** 也是被访问时才会解析字符串成为对象。

### 数据保护
`Proxy` 可以限制读写，实现访问限制、写入校验等等。其中比较值得说的是 Readonly。

Readonly 通常是使用 `Object.freeze` 来实现的。`Object.freeze` 冻结对象是浅层的，通常需要递归遍历冻结实现深层的 Readonly。主要有三个缺点：性能消耗、对原始数据的破坏、非法赋值没有反馈。

使用 `Proxy` 阻止写入和删除，实现深层的 Readonly，本身是惰性创建性能上总体会比 `Object.freeze` 好。不会对原始数据进行修改，仅仅只是代理对象被阻止修改。在修改时还能抛出错误，给开发者反馈。

具体的实现可以参考 **Vue** 的 `readonly`。

### 单任务改造为多任务
当前我们有一个机器，机器有一万个任务，在项目中已经设置好该机器任务的调用。现在，我们需要增加一个差不多功能的机器。

改造前：
```js
const machine = {
  task1() { /* ... */ },
  task2() { /* ... */ },
  /* 省略一万个任务 */
}

export default machine
```

使用 `Proxy` 改造后：
```js
const machines = [
  {
    task1() { /* ... */ },
    task2() { /* ... */ },
    /* 省略一万个任务 */
  },
  {
    task1() { /* ... */ },
    task2() { /* ... */ },
    /* 省略一万个任务 */
  }
]

const machine = new Proxy({}, {
  get(_, key) {
    return () => machines.forEach(machine => machine[key]?.())
  }
})

export default machine
```

### 有序对象
曾经水群时，遇到一个问题：
> 在不把对象改成数组的情况下，给对象添加新的属性，怎么保证这个属性在遍历的时候是最后一个？

`ES2015` 规定了键名的排序：
1. 可作为数组索引的键名（如 0, 1, 2），升序排列。
2. 字符串索引，按创建顺序排列。
3. Symbol 索引，按创建顺序排列。

如果键名仅包含2、3其中一种，默认排序就满足要求了。若不是，那就该 `Proxy` 出马了。

```js
function orderedObject(target) {
  const keys = Reflect.ownKeys(target)

  /* 添加 key */
  function pushKey(key) {
    const index = keys.indexOf(key)
    if (!~index) keys.push(key)
  }

  /* 删除 key */
  function deleteKey(key) {
    const index = keys.indexOf(key)
    if (~index) keys.splice(index, 1)
  }

  return new Proxy(target, {
    defineProperty(target, key, descriptor) {
      const result = Reflect.defineProperty(target, key, descriptor)

      /* 定义属性成功 则添加 key*/
      if (result) pushKey(key)

      return result
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)

      /* 删除属性成功 则删除 key */
      if (result) deleteKey(key)

      return result
    },
    ownKeys() {
      return [].concat(keys)
    },
  })
}
```

上述代码稍加调整，可以改成任何排序规则。

### 数组转对象
有时会通过将数组转成对象或Map，通过唯一键名来访问，减少访问的时间复杂度。

```js
const arr = [
  { name: 'menu1', label: '菜单一' },
  { name: 'menu2', label: '菜单二' },
]

const map = arr.reduce((map, item) => {
  map.set(item.name, item)
  return map
}, new Map())

console.log(map.get('menu1')) // { name: 'menu1', label: '菜单一' }
```

但 `arr` 发生变更时，需要重新生成 `map`，或是主动维护 `map`。此时可以借助 `Proxy` 来实现自动维护。

不过由于数组的性质，实现起来会比较麻烦，需要改写所有的数组操作方法以及需要注意对 `length` 的处理。

代码较长：
```js
const arr = [
  { name: "menu1", label: "菜单一" },
  { name: "menu2", label: "菜单二" },
]

const { proxy, map } = arrayToMap(arr, (v) => v.name)

proxy.push({ name: "menu3", label: "菜单三" })
proxy.unshift({ name: "menu0", label: "菜单零" })
proxy.splice(1, 1, { name: "menu4", label: "菜单四" })

console.log(map.get("menu1")) // undefined
console.log(map.get("menu4")) // { name: 'menu4', label: '菜单四' }

function arrayToMap(arr, getKey = (v) => v) {
  const { get, set, deleteProperty } = Reflect

  const map = new Map()
  const count = new Map() // 处理重复的元素

  // 添加初始数据
  arr.forEach(add)

  const arrayInstrumentations = createArrayInstrumentations()
  const proxy = new Proxy(arr, {
    get(target, key, receiver) {
      // 改写数组操作方法
      if (hasOwn(arrayInstrumentations, key)) {
        return get(arrayInstrumentations, key, receiver)
      }

      return get(target, key, receiver)
    },

    set(target, key, value, receiver) {
      if (key === "length") {
        // 直接设置 length 时，移除溢出元素
        const overflow = target.slice(value)
        const res = set(target, key, value, receiver)
        if (res) overflow.forEach(remove)
        return res
      } else {
        // 通过下标设置，移除旧元素，添加新元素
        const oldValue = get(target, key)
        const res = set(target, key, value, receiver)
        if (res) {
          remove(oldValue)
          add(value)
        }
        return res
      }
    },

    deleteProperty(target, key) {
      const oldValue = get(target, key)
      const res = deleteProperty(target, key)
      if (res) remove(oldValue)
      return res
    },
  })

  function add(value) {
    if (isObject(value)) {
      const key = getKey(value)
      if (key === undefined) return

      count.set(key, (count.get(key) ?? 0) + 1)
      map.set(key, value)
    }
  }
  function remove(value) {
    if (isObject(value)) {
      const key = getKey(value)
      if (key === undefined) return

      const _count = count.get(key) ?? 0
      if (_count > 1) {
        count.set(key, _count - 1)
      } else {
        count.delete(key)
        map.delete(key)
      }
    }
  }

  function createArrayInstrumentations() {
    const instrumentations = {}

    ;["push", "unshift"].forEach((key) => {
      instrumentations[key] = function (...args) {
        const res = arr[key].apply(arr, args)
        args.forEach(add)
        return res
      }
    })

    ;["pop", "shift"].forEach((key) => {
      instrumentations[key] = function (...args) {
        const res = arr[key].apply(arr, args)
        remove(res)
        return res
      }
    })

    instrumentations.splice = function (start, deleteCount, ...args) {
      const res = arr.splice(start, deleteCount, ...args)
      args.forEach(add)
      res.forEach(remove)
      return res
    }

    instrumentations.reverse = function () {
      return arr.reverse()
    }

    return instrumentations
  }

  return { proxy, map }
}

function hasOwn(val, key) {
  return hasOwnProperty.call(val, key)
}
function isObject(val) {
  return val !== null && typeof val === "object"
}
```

### 面试题
如果面试中能拿出 `Proxy` 解决问题，或许能让面试官眼前一亮。

#### 惰性创建的应用
朋友碰上的一道笔试题，也不知为啥笔试的时候能联系到我，让我帮帮他（好孩子不要学）。

题目如下：
> 给定一个由整数组成的数组 A。需要你返回一个由对象组成的数组 T，这些对象共享相同的原型，每个对象都应该有一个 value()，使下列等式成立。
>
> - T[i].value() === A[i]
> - T[j].value() === A[j]
> - T[i].value === T[j].value
> - T[i].hasOwnProperty('value') === false

这题实际考的是原型，正常答法就是：

```js
class Node {
  constructor(value) {
    this._value = value
  }

  value() {
    return this._value
  }
}

function fn(A) {
  return A.map(value => new Node(value))
}
```

不过我觉得初始化的性能太差了，于是我给了一份 `Proxy` 的解法：

```js
class Node {
  constructor(value) {
    this._value = value
  }

  value() {
    return this._value
  }
}

function fn(A) {
  const cached = new Array(A.length)
  return new Proxy(A, {
    get(target, key, receiver) {
      if (target.hasOwnProperty(key) && key !== 'length') {
        return cached[key] || (cached[key] = new Node(target[key]))
      }

      return Reflect.get(target, key, receiver)
    }
  })
}
```

#### a == 1 && a == 2 && a == 3
一道经典的面试题：**当 a = ? 使以下等式成立**
```js
(a == 1 && a == 2 && a == 3) === true
```

你可以在传统解法的基础上，追加使用 `Proxy` 的解法：
```js
const a = new Proxy({ value: 1 }, {
  get(target, key, receiver) {
    if (key === Symbol.toPrimitive) {
      return () => target.value++
    }

    return Reflect.get(target, key, receiver)
  }
})
```
