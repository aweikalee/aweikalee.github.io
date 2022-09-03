---
title: Vue2 组件二次封装 Element UI Table
toc: true
date: 2022-09-03 11:31:54
categories:
- [前端, JavaScript]
tags:
- JavaScript
- Vue
---

本文基于早先写的 [《Vue3 组件二次封装 Element Plus El-Table》](/2021/12/20/Vue3-组件二次封装-Element-Plus-Table/)。再用 `Vue 2` + `Element UI` 重新实现一遍。实现思路不变，主要针对 `Vue 2` 缺少的特性和坑进行处理。存在较多的奇技淫巧，实践需谨慎。

Demo：[element-ui-table-proxy-demo](https://aweikalee.github.io/element-ui-table-proxy-demo/)

源码：[aweikalee/element-ui-table-proxy-demo](https://github.com/aweikalee/element-ui-table-proxy-demo)

<!-- more -->

>  `Vue 3` + `Element Plus` 请前往 [《Vue3 组件二次封装 Element Plus El-Table》](/2021/12/20/Vue3-组件二次封装-Element-Plus-Table/)

## 主要思路
对于 *el-table* 的二次封装，我希望是：
1. 不对原有的表产生影响（过度阶段 不可能一次性改完所有表）。
2. 尽可能保留 *el-table* 本身的灵活性。
3. 增强表格功能的同时，尽可能少地动原先的代码。

对于第1点，则是保留 *el-table* 组件，创建新组件 *MyTable*，所有改动在这个新组件内部完成。

对于第2点，就是 *MyTable* 接受的 `props(attrs)` 和 `slot` 应与 *el-table* 保持一致，且应悉数传递给 *el-table*。


于是设计的调整方案如下：
``` html
<!-- 调整前 -->
<el-table :data="data">
  <el-table-column prop="name" label="名字" />
  <!-- 此处省略一万个 el-table-column -->
</el-table>

<!-- 调整后 -->
<MyToolbar :columns.sync="columns" />
<MyTable :data="data" :columns.sync="columns">
  <el-table-column prop="name" label="名字" />
  <!-- 此处省略一万个 el-table-column -->
</MyTable>
```

新封装的组件 *MyTable* 所做的事很简单，就是对 `slot` 重新排序、筛选、修改属性之后，生成一个新的 `slot` 再交给 *el-table* 处理。

*MyTable* 与 *MyToolbar* 通过父组件上 `columns` 同步数据。

## MyTable 组件的实现
### 基本结构
`template` 无法满足需求，需要上 `render`。

另外需要将 `inheritAttrs` 设为 `true`，并主要将 `$attrs` 传给 *el-table* 组件。否则 `$attrs` 将会直接绑定在根 DOM 上，不会传给 *el-table*。

```js
import Table from 'element-ui/lib/table'
import 'element-ui/lib/theme-chalk/table.css'

export default {
  name: 'MyTable',
  inheritAttrs: false, 

  render(h) {
    const children = this.$slots.default

    // 也可以用 jsx
    return h(
      Table,
      {
        attrs: {
          ...this.$attrs,
        },
      },
      children
    )
  }
}
```

### 对 VNode 分类
从 `slot` 中获取到的 `VNode` 除了我们要的内容外，还会有些其他东西，所以我们需要进行分类。

对于 *el-table-column* 的 `VNode` 的处理，将会以 `prop` 属性作为标识。没有 `prop` 属性的则不会作为自定义列做处理。

`VNode` 将会被分成3类：
1. *el-table-column* 且有 `prop` 属性的
2. *el-table-column* 但没有 `prop` 属性，但 `fixed="left"` 的
3. 其他的 *el-table-column* 或不认识的 `VNode`

第2类，也可以并到第3类中，但我认为分成3类更符合实际需求。

> `Vue 3` 版本封装中使用了计算属性进行实现，但 `Vue 2` 中 `slots` 并不具有响应，所以基于 `slots` 的操作，都需要在 `render` 中进行。

```js
import TableColumn from 'element-ui/lib/table-column'

export default {
  render(h) {
    /* 对 slot 进行分类 */
    const slots = {
      left: [], // 第1类
      main: [], // 第2类
      other: [], // 第3类
    }

    this.$slots.default?.forEach((vnode) => {
      if (isElTableColumn(vnode)) {
        const { prop, fixed } = getColumnData(vnode)
        if (prop !== undefined) return slots.main.push(vnode)
        if (fixed === 'left') return slots.left.push(vnode)
      }
      slots.other.push(vnode)
    })

    /* 分类好的 slot 按如下顺序挂载 */
    const children = [slots.left, slots.main, slots.other]

    return /* ... */
  }
}

/* 用于判断 vnode 是否是 el-table-column 组件 */
function isElTableColumn(vnode) {
  return vnode?.componentOptions?.Ctor?.options?.name === TableColumn.name
}

/* 获取 vnode 上的属性 */
function getColumnData(child: any) {
  const props = child.componentOptions.propsData ?? {}
  return {
    prop: props.prop, // 标识
    label: props.label, // 列名称
    fixed: props.fixed, // 固定位置
    visiable: props.visiable ?? true, // 是否可见
  }
}
```
`getColumnData` 中除了 `visiable` 外都是 *el-table-column* 原有的属性。

> `/* ... */` 代表省略的未做改动的代码

### 收集列数据
列数据的一手来源，就是 `slots.main`。因此需要从 `VNode` 中提取出我们需要的属性和排列顺序。

```js
export default {
  /* ... */

  data() {
    return {
      columnsFromSlot: [],
      columnsFromStorage: []
    }
  },

  render(h) {
    /* ... */
    
    const columnsFromSlot = slots.main.map((vnode) => getColumnData(vnode))
    const isSame = isSameColumns(this.columnsFromSlot, columnsFromSlot)
    if (!isSame) {
      // 若列数据与原先储存的不一致，则替换，并触发更新
      this.columnsFromSlot = columnsFromSlot
    }

    return /* ... */
  }
}

/* 比较当前列数据与原先储存的列数据是否一致 */
function isSameColumns(a, b) {
  if (a.length !== b.length) return false

  const keys = a[0] ? Object.keys(a[0]) : []
  for (let i = 0; i < a.length; i += 1) {
    const _a = a[i]
    const _b = b[i]
    const isSame = keys.every((key) => _a[key] === _b[key])
    if (!isSame) return false
  }
  return true
}
```
`columnsFromSlot` 只保存最原始的列数据，我们对于列的修改，需要保存在另外的地方，后续还要做持久化储存，所以就存在了 `columnsFromStorage` 中。

由于 `Vue 2` 的 `slots` 没有响应，所以我们需要在 `render` 中收集列数据，并将列数据储存到 `data` 中。

> `render` 中修改 `data` 的操作需要小心，任何 `data` 变更，都会触发 `render` 重新执行，处理不慎就会陷入死循环。

这里我通过 `isSameColumns` 来判断是否需要更新数据，有必要更新时，才进行赋值操作。整个过程就和 **虚拟 DOM** 似的，只不过我们这是 **虚拟 DOM** 上抽离出来的更精简的 **虚拟 DOM**。

> 注：当 `isSameColumns` 返回 `true` 时，更新 `data`，这会重新执行 `render`。

### 合并列数据
现在我们有两个数据 `columnsFromSlot` 与 `columnsFromStorage`，考虑到持久化储存，储存的列的信息可能不准确（如后期新增/删除了列），取长补短，获得一个渲染时用的完整的列数据。

```js
export default {
  /* ... */

  data() {
    return {
      columnsFromSlot: [],
      columnsFromStorage: [],
      columnsRender: []
    }
  },

  computed: {
    watchColumns() {
      return [this.columnsFromSlot, this.columnsFromStorage]
    },
  },

  watch: {
    // 当 columnsFromSlot 或 columnsFromStorage 有变更
    // 重新生成 columns
    watchColumns() {
      const slot = [...this.columnsFromSlot]
      const storage = [...this.columnsFromStorage]

      let res = []
      storage.forEach((props) => {
        const index = slot.findIndex(({ prop }) => prop === props.prop)
        if (~index) {
          const propsFromSlot = slot[index]
          res.push({
            ...propsFromSlot, // 可能新增属性 所以用 slot 的数据打个底
            ...props,
          })
          slot.splice(index, 1) // storage 里不存在的列
        }
        // slot 中没有找到的 则会被过滤掉
      })
      this.columnsRender = slot.concat(res)
    },
  },
  
  /* ... */
}
```

### 生成新的 VNode
前期准备都做好了，现在需要创建传给 *el-table* 的 `slot` 了。

我们需要以 `columnsRender` 的数据创建 `refactorSlot` 代替 `slots.main`。

```js
export default {
  render(h) {
    /* ... */

    /* 对列进行筛选与排序 */
    const refactorySlot = () => {
      const { main } = slots
      const columnsProp = main.map((vnode) => getColumnData(vnode).prop)

      /* 对 slot.main 进行改写 */
      const refactorySlot = []
      this.columnsRender.forEach(({ prop, visiable, fixed }) => {
        // 设置为不可见的 则跳过（即不渲染）
        if (!visiable) return

        // 从 slots.main 中寻找对应 prop 的 VNode
        let vnode = main.find((_, index) => prop === columnsProp[index])

        if (!vnode) return
        // 克隆 VNode 准备修改部分属性
        vnode = cloneVNode(vnode) // cloneVNode 的说明见下文

        // componentOptions 在 cloneVNode 时是直接引用的
        // 后续要修改所以主动拷贝一份
        vnode.componentOptions = { ...vnode.componentOptions }
        vnode.componentOptions.propsData = {
          ...vnode.componentOptions.propsData,
        }

        const propsData = vnode.componentOptions.propsData

        if (fixed !== undefined) propsData.fixed = fixed

        refactorySlot.push(vnode)
      })

      return refactorySlot
    }

    // 用 refactorySlot() 代替 slots.main
    const children = [slots.left, refactorySlot(), slots.other]

    return /* ... */
  }
}
```
#### VNode 与 cloneVNode
`Vue 2` 并没有像 `Vue 3` 一样直接暴露了 `VNode` 和 `cloneVNode`。所以需要些手段。

源码中存在些许 `x instanof VNode` 的判断，为避免副作用，所以我们要拿到原始的 `VNode`。可以从原型下手，获取 `VNode` 的构造函数（类）。

`cloneVNode` 直接从源码里拷一份就行，没啥副作用。

```js
let VNode
new Vue({
  el: document.createElement('div'),
  render(h) {
    // 创建一个 vnode
    // 从 vnode 的原型上获取 VNode 的构造函数
    // 将其存起来
    const vnode = h('div')
    VNode = Object.getPrototypeOf(vnode).constructor 
    this.$destroy()
  },
})

export function cloneVNode(vnode) {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
```

### 更新列数据
*el-table-column* 是通过 `mounted` 与 `destroyed` 两个生命周期将列数据同步给 *el-table* 的。但 `Vue` 会尽可能利用旧的实例，只会更新实例上的数据，而不是销毁重新创建。这就导致 `mounted` 与 `destroyed` 无法运行，从而会产生 *el-table* 中的列数据与 *el-table-column* 不一致。

故此处通过更新 `key` 来强制重新创建 *el-table*。

```js
export function {
  data() {
    return {
      key: 0,

      /* ... */
    }
  },

  watch: {
    columnsRender() {
      this.key += 1
    },

    /* ... */
  },

  render(h) {
    /* ... */

    return h(
      Table,
      {
        attrs: {
          ...this.$attrs,
          key: this.key
        },
      },
      children
    )
  }
}
```

> 理想状态是给 `children` 加 `key`，但 `Vue 2` 缺少的特性与 `Element UI` 本身机制共同作用下，没法加到 `children` 上。所以退而求其次加到了 *el-table* 上。

## 追加功能
接下来是追加各种功能

### MyToolbar 组件的实现
> `Vue 2` 中 `$refs` 并不具有响应，实现自由度远不如 `Vue3 `。

我选择了将数据同步至父组件的形式，关联 *MyTable* 与 *MyToolbar*。虽然这不利于后期对 *MyToolbar* 进行扩展，但比在 `Vue 2` 中使用 `$refs` 靠谱得多。

#### 父组件
```html
<MyTable :columns.sync="columns" />
<MyToolbar :columns.sync="columns" />
```

```js
export default {
  data() {
    columns: []
  }
}
```

#### MyTable
接收 `columns`，但不直接使用，而是在 `columns` 产生变更时，覆盖到 `columnsFromStorage` 上。

```js
export default {
  props: {
    columns: Array
  },

  data() {
    return {
      /* ... */

      columnsFromStorage: [],
      columnsRender: []
    }
  },

  watch: {
    columns(value) {
      if (value === this.columnsRender) return
      this.columnsFromStorage = value
    },

    watchColumns() {
      /* ... */

      this.$emit('update:columns', this.columnsRender)
    }
  },

  destroyed() {
    /* 当前组件销毁 清空 columns */
    this.$emit('update:columns', [])
  },
}
```

有人就肯定会问，为什么要绕这么大圈子，直接使用 `columns` 代替 `columnsFormStorage` 不就好了吗？答：我希望 `columns` 不是必须设置的。

> 注：每次修改 `columns` 必须整个替换，如果想改 `columns` 任意值触发更新，需要给在 `watch` 时加上 `deep: true`，并且需要深度对比 `columns` 与 `columnsRender` 是否一致。

#### MyToolbar
*MyToolbar* 只要使用 `columns` 渲染，有改动通过 `$emit('update:columns', value)` 进行更新即可。就不细说了。

[aweikalee/element-ui-table-proxy-demo](https://github.com/aweikalee/element-ui-table-proxy-demo) 中有简单的实现可以参考。

### 列数据持久化储存
只要让 `columnsStorage` 初始化时从 `localStorage` 中获取，修改时写入 `localStorage` 即可。

```js
// 实现一个简易版本，意思一下。
const storage = {
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key))
    } catch (error) {
      return
    }
  }
}
```

```js
export default {
  data() {
    return {
      columnsFromStorage: storage.get('columns') ?? []
    }
  },

  watch: {
    columns(value) {
      if (value === this.columnsRender) return
      this.columnsFromStorage = value
      storage.set('columns', value)
    },
  }

}
```

这边 `stroage.get('columns')` 并没有对表格进行区分储存。可以为 *MyTable* 增加一个属性 `name`，储存与读取时以 `name` 做为标识以区分。

> 当然列的设置是可以存服务器，意味着储存都是异步的，读取时请求返回之前，会进行一次渲染，请求返回后会再次渲染，这是需要特别注意的。我选择了请求完成前不渲染 `children`，而是使用加载的状态代替。上传则采用了防抖的方式减少与服务器交互。

### KeepAlive 保留滚动条位置
尽管 *KeepAlive* 会缓存 DOM，但 DOM 会从文档上移除。而离开文档的 DOM 是没有 `offsetTop`, `offsetLeft`, `offsetWidth`, `offsetHeight`, `scrollTop`, `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight` 的，此时访问到的也都是 `0`。

在 *KeepAlive* 中最受影响的就是 `scrollTop` 和 `scrollLeft`，即使重新添加到文档中也无法恢复。所以我们需要在离开文档前保存它们，重新添加到文档后将保存的值再赋值到 DOM 上。

下面介绍两种方法。
#### 方法一
监听 DOM 的 `scroll` 事件，`scroll` 事件中记录当前的滚动位置。然后在 `onActivated` 时重新给 DOM 赋值。

> 直接拿 `Vue 3` 版本中实现的 `useKeepScroll` 改了改。所以看起来这个实现思路并不符合 `Vue 2` 常规思路。

```js
export default {
  mounted() {
    /* 追加功能 */
    // 记录滚动条位置
    const { setElement } = useKeepScroll(this)
    setElement(this.$refs.table?.$refs.bodyWrapper)
  },

  render(h) {
    return h(
      Table,
      {
        ref: 'table'
        /* ... */
      }
      children
    )
  }
}
```

```js
function useKeepScroll(instance) { // Vue 组件实例
  let scrollTop = 0
  let scrollLeft = 0
  let el

  /* 保存滚动条位置 */
  function save() {
    if (!el) return

    scrollTop = el.scrollTop
    scrollLeft = el.scrollLeft
  }

  /* 恢复滚动条位置 */
  function restore() {
    if (!el) return

    el.scrollTop = scrollTop
    el.scrollLeft = scrollLeft
  }

  /* 在组件恢复时 恢复滚动条位置 */
  onActivated(restore)

  /* 添加、移除 scroll 的监听 */
  let listenedEl = null
  function removeEventListener() {
    listenedEl?.removeEventListener('scroll', save)
    listenedEl = null
  }
  function addEventListener() {
    if (!el) return
    if (listenedEl === el) return
    removeEventListener()

    listenedEl = el
    listenedEl?.addEventListener('scroll', save)
  }

  instance.$on('hook:activated', addEventListener)
  instance.$on('hook:deactivated', removeEventListener)

  instance.$on('hook:activated', restore)

  return {
    setElement(value) {
      el = value
      addEventListener()
    }
  }
}
```

`setElement` 方法是为了万一 DOM 没有复用时，重新设置 DOM。

#### 方法二
*KeepAlive* 为我们提供了 `deactivated` ，但它定义就是 DOM 停用后的生命周期，所以 `deactivated` 运行的时候 DOM 已经从文档中移除了。

我们可能更需要 `beforeDeactivate`，但是很可惜，这个 [RFC](https://github.com/vuejs/rfcs/pull/284) 连 `Vue 3` 都还没有实装。

当前的代替方案，有那么点取巧。

```js
function useKeepScroll(instance) {
  let scrollTop = 0
  let scrollLeft = 0
  let el

  function save() {
    if (!el) return

    scrollTop = el.scrollTop
    scrollLeft = el.scrollLeft
  }
  function restore() {
    if (!el) return

    el.scrollTop = scrollTop
    el.scrollLeft = scrollLeft
  }

  instance.$on('hook:activated', restore) // 恢复
  instance.$on('hook:deactivated', save) // 保存

  return {
    setElement(value) {
      el = value
      addEventListener()
    }
  }
}
```

接下来是关键了！

```html
<transition>
  <keep-alive>
    <!-- 内容 略 -->
  </keep-alive>
</transition>
```

找到使用 *KeepAlive* 的地方，在外面套一层 *Transition* 组件，此时 `deactivated` 就等同于 `beforeDeactivate` 了。

若你的项目只存在一个 *KeepAlive*，就非常适合用这种解决方法。

简单解释一下原理：

*KeepAlive* 组件的 `deactivate` 方法中，会先将 DOM 从文档中移除，再创建**微任务**调用组件的 `deactivated`。若 `VNode` 上存在 `transition`，移除将会是变为**宏任务**，那么就会变成先执行**微任务**中的 `onDeactivated` 再从文档中移除了。

### 解决 KeepAlive 恢复时布局错位
*el-table* 碰上 *KeepAlive* 时，时不时会出现表格布局错位或是固定列无法渲染的问题。

官方解决方法是，恢复时调用 `doLayout`。那么完全可以集成到 *MyTable*。

> `Element Plus` 没有这个问题

```js
export function {
  mounted() {
    let firstActivated = true
    this.$on('hook:activated', () => {
      if (firstActivated) {
        firstActivated = false
        return
      }
      this.$refs.table?.doLayout()
    })
  }
}
```

`mounted` 后会执行一次 `activated`，不必调用 `doLayout`。