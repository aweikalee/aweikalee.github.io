---
title: Vue3 组件二次封装 Element Plus Table
toc: true
date: 2021-12-20 00:04:12
categories:
- [前端, JavaScript]
tags:
- JavaScript
- Vue
---

公司里后台系统用的 `Element UI`，有百来个表格（*el-table*），历史遗留原因都是直接使用 *el-table* 的。突然有一天，产品说表格要可以自定义列，让用户控制列的**显隐**、**固定**和**排序**，最好还能**持久储存**。使得我不得不进行二次封装来解决，那就顺便再轻微增强一下。

Demo：[element-plus-table-proxy-demo](https://aweikalee.github.io/element-plus-table-proxy-demo/)

源码：[aweikalee/element-plus-table-proxy-demo](https://github.com/aweikalee/element-plus-table-proxy-demo)

<!-- more -->

>  `Vue 2` + `Element UI` 请前往 [《Vue2 组件二次封装 Element UI El-Table》](/2022/09/03/Vue2-组件二次封装-Element-UI-Table/)

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
<MyToolbar :table="table" />
<MyTable :data="data" :ref="table">
  <el-table-column prop="name" label="名字" />
  <!-- 此处省略一万个 el-table-column -->
</MyTable>
```

新封装的组件 *MyTable* 所做的事很简单，就是对 `slot` 重新排序、筛选、修改属性之后，生成一个新的 `slot` 再交给 *el-table* 处理。

*MyTable* 会给 *MyToolbar* 暴露列的数据与修改列数据的接口。（当然你也可以将 *MyToolbar* 封装 *MyTable* 内）

## MyTable 组件的实现

### 基本结构
首先是 `template` 部分（当然你可以用 `render/JSX` 代替），`Vue` 中默认会传递所有未识别的属性给最外层的标签，所以我们只需要传一个新的 `slot` 就可以了。
```html
<el-table>
  <children />
</el-table>
```

*children* 就是我们实现的新的 `slot`，他是 *MyTable* 内部创建的子组件。他和 `slots.default` 一样是一个函数，里面返回了 `VNode`。

```js
const slotsOrigin = useSlots()
const children = () => slotsOrigin.default?.()
```
*注：用了 setup 语法*

至此，一个保留了 *el-table* 所有功能的二次封装，就完成了。接下来只需要再加亿点点细节完善一下。

### 对 VNode 分类
从 `slot` 中获取到的 `VNode` 除了我们要的内容外，还会有些其他东西，所以我们需要进行分类。

对于 *el-table-column* 的 `VNode` 的处理，将会以 `prop` 属性作为标识。没有 `prop` 属性的则不会作为自定义列做处理。

`VNode` 将会被分成3类：
1. *el-table-column* 且有 `prop` 属性的
2. *el-table-column* 但没有 `prop` 属性，但 `fixed="left"` 的
3. 其他的 *el-table-column* 或不认识的 `VNode`

第2类，也可以并到第3类中，但我认为分成3类更符合实际需求。

```js
const slotsOrigin = useSlots()

/* 对 slot 进行分类 */
const slots = computed(() => {
  const main = [] // 第1类
  const left = [] // 第2类
  const other = [] // 第3类

  slotsOrigin.default?.()?.forEach((vnode) => {
    if (isElTableColumn(vnode)) {
      // 是 el-table-column 组件

      const { prop, fixed } = vnode.props ?? {}

      // 存在 prop 属性，归第1类
      if (prop !== undefined) return main.push(vnode) 

      // 不存在 prop 属性，但 fixed="left"，归第2类
      if (fixed === 'left') return left.push(vnode)
    }

    // 其他，归第3类
    other.push(vnode)
  })

  return {
    main,
    left,
    other,
  }
})

/* 用于判断 vnode 是否是 el-table-column 组件 */
function isElTableColumn(vnode) {
  return (vnode.type as Component)?.name === 'ElTableColumn'
}

/* 分类好的 slot 按如下顺序挂载 */
const children = () => [slots.value.left, slots.value.main, slots.value.other]
```

### 收集列数据
列数据的一手来源，就是 `slots.main`。因此需要从 `VNode` 中提取出我们需要的属性和排列顺序。

```js
const columns = reactive({
  slot: computed(() => 
    slots.value.main.map(({ props }) => ({
      prop: props.prop, // 标识
      label: props.label, // 列名称
      fixed: props.fixed, // 固定位置
      visiable: props.visiable ?? true // 是否可见
    })),
    
    storage: [],
  ),
})
```
除了 `visiable` 外都是 *el-table-column* 原有的属性。
`columns.slot` 只保存最原始的列数据，我们对于列的修改，需要保存在另外的地方，后续还要做持久化储存，所以就存在了 `columns.storage` 中。

对外提供一个修改 `columns.storage` 的方法。
```js
function updateColumns(value) {
  columns.storage = value
}
```

### 合并列数据
现在我们有两个数据 `columns.slot` 与 `columns.storage`，考虑到持久化储存，储存的列的信息可能不准确（如后期新增/删除了列），取长补短，获得一个渲染时用的完整的列数据。

```js
const columns = reactive({
  // 其他同上 略

  render: computed(() => {
    const slot = [...columns.slot]
    const storage = [...columns.storage]

    const res = []
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
    res.push(...slot)

    return res
  })
})
```

### 生成新的 VNode
前期准备都做好了，现在需要创建传给 *el-table* 的 `slot` 了。

我们需要以 `columns.render` 的数据创建 `refactorSlot` 代替 `slots.main`。
```js
const refactorSlot = computed(() => {
  const { main } = slots.value

  const refactorySlot = []

  columns.render.forEach(({ prop, visiable, fixed }) => {
    // 设置为不可见的 则跳过（即不渲染）
    if (!visiable) return

    // 从 slots.main 中寻找对应 prop 的 VNode
    const vnode = main.find((vnode) => prop === vnode.props?.prop)
    if (!vnode) return

    // 克隆 VNode 并修改部分属性
    const cloned = cloneVNode(vnode, {
      fixed,
      // 这里可以根据需求 修改属性，非常灵活
    })

    refactorySlot.push(cloned)
  })

  return refactorySlot
})
```

最后合并所有 `slot` ，就完成了 `children` 的创建
```js
const children = () => [slots.value.left, refactorSlot.value, slots.value.other]
```

### 更新列数据
*el-table-column* 是通过 `onMounted` 与 `onUnmounted` 两个生命周期将列数据同步给 *el-table* 的。但 `Vue` 会尽可能利用旧的实例，只会更新实例上的数据，而不是销毁重新创建。这就导致 `onMounted` 与 `onUmmounted` 无法运行，从而会产生 *el-table* 中的列数据与 *el-table-column* 不一致。

故此处通过更新 `key` 来强制重新创建 *el-table-column*。
```html
<el-table>
  <children :key="key" />
</el-table>
```

```js
const key = ref(0)
watch(refactorSlot, () => (key.value += 1))
```

### 暴露接口
```html
<el-table ref="table">
  <children :key="key" />
</el-table>
```
```js
const table = ref()
defineExpose({
  // 提供访问 el-table 途径
  table,

  // 列的数据
  columns: computed(() => readonly(columns.render)),

  // 修改列的数据（要求全覆盖）
  updateColumns(value) {
    columns.storage = value
  }
})
```

至此，我们主体结构就搭完了，完整代码可以到 [aweikalee/element-plus-table-proxy-demo](https://github.com/aweikalee/element-plus-table-proxy-demo) 查看。


## 追加功能

接下来就是追加各种功能。

### MyToolbar 组件的实现
*MyTable* 对外提供了 `columns` 与 `updateColumns`，通过它们我们可以根据需求实现一个自定义列的显示、固定和排序。由于这边怎么实现都行，就不细说了。[aweikalee/element-plus-table-proxy-demo](https://github.com/aweikalee/element-plus-table-proxy-demo) 中有简单的实现可以参考。

### 列数据持久化储存
只要让 `columns.storage` 初始化时从 `localStorage` 中获取，修改时写入 `localStorage` 即可。


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
const columnsFormStorage = ref(
  storage.get('columns') ?? []
)

const columns = reactive({
  // 其他不变 略

  storage: computed({
    get() {
      return columnsFormStorage.value
    },
    set(value) {
      columnsFormStorage.value = value
      storage.set('columns', value)
    }
  })
})
```

这边 `stroage.get('columns')` 并没有对表格进行区分储存。可以为 *MyTable* 增加一个属性 `name`，储存与读取时以 `name` 做为标识以区分。

> 当然列的设置是可以存服务器，意味着储存都是异步的，读取时请求返回之前，会进行一次渲染，请求返回后会再次渲染，这是需要特别注意的。我选择了请求完成前不渲染 `children`，而是使用加载的状态代替。上传则采用了防抖的方式减少与服务器交互。

### KeepAlive 保留滚动条位置
尽管 *KeepAlive* 会缓存 DOM，但 DOM 会从文档上移除。而离开文档的 DOM 是没有 `offsetTop`, `offsetLeft`, `offsetWidth`, `offsetHeight`, `scrollTop`, `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight` 的，此时访问到的也都是 `0`。

在 *KeepAlive* 中最受影响的就是 `scrollTop` 和 `scrollLeft`，即使重新添加到文档中也无法恢复。所以我们需要在离开文档前保存它们，重新添加到文档后将保存的值再赋值到 DOM 上。

下面介绍两种方法。
#### 方法一
监听 DOM 的 `scroll` 事件，`scroll` 事件中记录当前的滚动位置。然后在 `onActivated` 时重新给 DOM 赋值。

```html
<el-table ref="table"></el-table>
```

```js
const table = ref()
const scrollRef = computed(() => {
  // el-table 中滚动的容器
  return table.value?.$refs.bodyWrapper
})
useKeepScroll(scrollRef)
```

```js
function useKeepScroll(el) { // 这是一个 ref 对象
  let scrollTop = 0
  let scrollLeft = 0

  /* 保存滚动条位置 */
  function save() {
    if (!el.value) return

    scrollTop = el.value.scrollTop
    scrollLeft = el.value.scrollLeft
  }

  /* 恢复滚动条位置 */
  function restore() {
    if (!el.value) return

    el.value.scrollTop = scrollTop
    el.value.scrollLeft = scrollLeft
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
    if (!el.value) return
    if (listenedEl === el.value) return
    removeEventListener()

    listenedEl = el.value
    listenedEl?.addEventListener('scroll', save)
  }

  watch(el, addEventListener)
  onActivated(addEventListener)
  onDeactivated(removeEventListener)
}
```

#### 方法二
*KeepAlive* 为我们提供了 `onDeactivated` ，但它定义就是 DOM 停用后的生命周期，所以 `onDeactivated` 运行的时候 DOM 已经从文档中移除了。

我们可能更需要 `onBeforeDeactivate`，但是很可惜，该 [RFC](https://github.com/vuejs/rfcs/pull/284) 还没有实装。

当前的代替方案，有那么点取巧。

```js
function useKeepScroll(el) {
  let scrollTop = 0
  let scrollLeft = 0

  function save() {
    if (!el.value) return

    scrollTop = el.value.scrollTop
    scrollLeft = el.value.scrollLeft
  }
  function restore() {
    if (!el.value) return

    el.value.scrollTop = scrollTop
    el.value.scrollLeft = scrollLeft
  }

  onActivated(restore) // 恢复
  onDeactivated(save) // 保存
}
```

接下来是关键了！

```html
<Transition>
  <KeepAlive>
    <!-- 内容 略 -->
  </KeepAlive>
</Transition>
```

找到使用 *KeepAlive* 的地方，在外面套一层 *Transition* 组件，此时 `onDeactivated` 就等同于 `onBeforeDeactivate` 了。

若你的项目只存在一个 *KeepAlive*，就非常适合用这种解决方法。

简单解释一下原理：

*KeepAlive* 组件的 `deactivate` 方法中，会先将 DOM 从文档中移除，再创建**微任务**调用组件的 `onDeactivated`。若 `VNode` 上存在 `transition`，移除将会是变为**宏任务**，那么就会变成先执行**微任务**中的 `onDeactivated` 再从文档中移除了。
