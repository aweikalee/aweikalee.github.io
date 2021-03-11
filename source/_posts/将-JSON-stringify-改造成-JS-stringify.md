---
title: 将 JSON.stringify 改造成 JS.stringify
toc: true
date: 2021-03-08 14:59:35
categories:
- [前端, JavaScript]
tags:
- JavaScript
- JSON
---

`JSON.stringify` 用来将 JS 变量序列化成 `JSON` 字符串。一般情况下普通使用是没什么问题了，但需求一旦超过了 `JSON` 的标准就会存在问题了。比如上篇文章中涉及到的，需要序列化**任意 JS 变量**用于展示。

下面将会解决 `undefined`, `Function`, `NaN`, `Symbol`, `BigInt` 的序列化，以及对于循环引用的对象的处理。一步一步将 `JSON.stringify` 改造成 `JS.stringify`。**推荐直接拉到底部看完整代码**，看不懂再回头看思路、说明。

<!-- more -->


默认情况下 `JSON.stringify` 会：

- 忽略 `undefined`, `Function`, `Symbol`。
- 将 `NaN` 转换成 `null`
- 遇到`BigInt` 会抛出错误。



现在的需求，希望它们会被处理成：

- `undefiend`: `undefiend`
- `Function`: `<Function>`
- `Symbol(123)`: `Symbol(123)`
- `NaN`: `NaN`
- `BigInt(123)`: `123n`



### 创建一个测试用例

``` js
const obj = {
  undefined: undefined,
  Function: () => {},
  Symbol: Symbol(123),
  NaN: NaN,
  BigInt: 123n,
}
```

### 简单的类型处理

可能很多人不知道 `JSON.stringify` 还有两个可选参数，增加类型处理将会使用第二个 `replacer` 参数。`replacer` 详细信息见 [JSON.stringify() - MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)。（`replacer` 有两种重载，后续将只考虑 `replacer` 为函数的情况）

接着将给 `replacer` 传入一个函数，来处理变量。`replacer` 会在进行序列化之前执行，`replacer` 的返回值会当作序列化的参数。

下面就直接开始实现。

#### 串连 replacers 

```js
/* 待会儿要实现的 replacer */
function jsReplacer(key, value) {
  return value
}

/* 串连 replacers */
function serializer(...replacers) {
  const _replacers = replacers.filter((replacer) => !!replacer)
  return function (key, value) {
    return _replacers.reduce((value, replacer) => {
      return replacer.call(this, key, value)
    }, value)
  }
}

function jsStringify(value, replacer, space) {  
  return JSON.stringify(value, serializer(replacer, jsReplacer), space)
}

jsStringify(obj)
```

通过 `serializer` 将用户传入的 `replacer` 和 `jsReplacer` 进行串连。相当于

```js
function newReplacer(key, value) {
  return jsReplacer(key, replacer(key, value)) 
}
```



另外`JSON.stringify` 中 `replacer` 的 `this` 会指向 `value` 的父对象，所以这里需要通过 `call` 为串连的函数绑定 `this`。

#### jsReplacer

```js
function jsReplacer(key, value) {
  switch (typeof value) {
    case 'undefined':
      return 'undefined'
    case 'function':
      return '<Function>'
    case 'number':
      return Number.isNaN(value) ? 'NaN' : value
    case 'symbol':
      return value.toString()
    case 'bigint':
      return `${value}n`
      default:
      // 其他类型 不进行处理 直接进行序列化
      return value
  }
}
```

我们需要将不支持的类型，在 `jsReplacer` 中转换成可以被支持的类型，再交还给 `JSON.stringify` 进行序列化。一般就是处理成字符串。



合并上面的代码，运行测试用例将会得到：

```json
{
  "undefined": "undefined",
  "Function": "<Function>",
  "Symbol": "Symbol(123)",
  "NaN": "NaN",
  "BigInt": "123n"
}
```

都成功被处理了。但是都处理成字符串，那就会和字符串混淆，无法进行区分。

接着让我们去掉多余的双引号。



### 移除多余的双引号

单单使用 `replacer` 中我们是无力去掉多余的双引号了，不过我们可以对序列化之后的字符串再加工。

`JSON.stringify` 返回给我们的是一个字符串，我们需要在这个字符串中找到我们的猎物。为了能够区分我们的猎物和普通猎物，在放生之前给我们的猎物做上标记。

#### 标记

```js
const SIGN = Date.now()
const LEFT_MARK = `__${SIGN}`
const RIGHT_MARK = `${SIGN}__`
```

先创建两个标记用来包裹猎物。`LEFT_MARK` 和 `RIGHT_MARK` 可以是任意字符串，你只要让它们足够特殊就可以了。这里加入了 `Date.now()` 做为签名。

```js
function mark(text) {
  return `${LEFT_MARK}${text}${RIGHT_MARK}`
}
```

写一个 `mark` 函数，为猎物做标记，标记方式就是在左右两侧分别加上 `LEFT_MARK` 与 `RIGHT_MARK`。

```js
function jsReplacer(key, value) {    
  switch (typeof value) {
    case 'undefined':
      return mark('undefined')
    case 'function':
      return mark('<Function>')
    case 'number':
      return Number.isNaN(value) ? mark('NaN') : value
    case 'symbol':
      return mark(value.toString())
    case 'bigint':
      return mark(`${value}n`)
    default:
      return value
  }
}
```

在 `jsReplacer` 中使用 `mark` 对猎物进行标记。

#### 识别

用正则去匹配标记，从而获得我们的猎物：

```js
const REGEXP = new RegExp(`${LEFT_MARK}(.*?)${RIGHT_MARK}`, 'g')
```

由于我们在 `jsReplacer` 中处理完的字符串，交给 `JSON.stringify` 序列化时会多加上引号，所以我们匹配时还得加上引号。

```js
const REGEXP = new RegExp(`"${LEFT_MARK}(.*?)${RIGHT_MARK}"`, 'g')
```

#### 替换

```js
function unmark(text) {
  return text.replace(REGEXP, '$1')
}
```

通过`String.prototype.replace` 将猎物替换成没有引号的。

#### 完整代码

```js
const SIGN = Date.now()
const LEFT_MARK = `__${SIGN}`
const RIGHT_MARK = `${SIGN}__`
const REGEXP = new RegExp(`"${LEFT_MARK}(.*?)${RIGHT_MARK}"`, 'g')

function mark(text) {
  return `${LEFT_MARK}${text}${RIGHT_MARK}`
}

function unmark(text) {
  return text.replace(REGEXP, '$1')
}

function jsReplacer(key, value) {    
  switch (typeof value) {
    case 'undefined':
      return mark('undefined')
    case 'function':
      return mark('<Function>')
    case 'number':
      return Number.isNaN(value) ? mark('NaN') : value
    case 'symbol':
      return mark(value.toString())
    case 'bigint':
      return mark(`${value}n`)
    default:
      return value
  }
}

function serializer(...replacers) {
  const _replacers = replacers.filter((replacer) => !!replacer)
  return function (key, value) {
    return _replacers.reduce((value, replacer) => {
      return replacer.call(this, key, value)
    }, value)
  }
}

function jsStringify(value, replacer, space) {
  const replacers = serializer(replacer, jsReplacer)
  const reuslt = JSON.stringify(value, replacers, space)
  return unmark(reuslt)
}
```

此时运行测试用例我们将会得到：

```json
{
  "undefined": undefined,
  "Function": <Function>,
  "Symbol": Symbol(123),
  "NaN": NaN,
  "BigInt": 123n
}
```

## 解决对象循环引用

同过上述的代码，已经能应付所有类型了，但是面对循环引用的对象，还是会抛出错误。

### 创建一个测试用例

```js
const obj = {
  parent: {},
  child: {},
}
obj.child.parent = obj.parent
obj.parent.child = obj.child
```

### 简化成二叉树

对象也是一个树，可以用最简单的二叉树来思考。

将问题转换成算法题《验证父子不相等二叉树》。

#### 算法题目

给定一个二叉树，判断其是否是一个有效的父子不相等二叉树。

假设一个父子不相等二叉树具有如下特征：

- 任意节点的值不等于其任意位置的父节点的值。
- 当前节点的所有子节点的值，不等于当前节点的值。

_上述两个特征是一个意思，不同的表达方式_

##### 示例 1

```
输入:
    1
   / \
  2   2
输出: true
```

##### 示例 2

```
输入:
    1
   / \
  2   3
     / \
    1   4
输出: false
```

#### 题解

```js
/**
 * Definition for a binary tree node.
 * function TreeNode(val) {
 *     this.val = val;
 *     this.left = this.right = null;
 * }
 */
function isValidTree(root) {
  const stack = []
  
  function helper(node) {
    if (node === null) return true
    
    const nodeIndex = stack.indexOf(node.val)
    if (~nodeIndex) return false
    
    stack.push(node.val)
    const res = helper(node.left) && helper(node.right)
    stack.pop()
    return res
  }
  
  return helper(root)
}
```

一个有效树，它的左子树和右子树独立出来也会是有效树。反过来，我们需要判断一个树是否有效，需要知道它的左子树和右子树是否有效，但左子树是否有效与右子树无关，只和父树以及自身的子树有关。因此应该使用**深度优先搜索**的方法进行遍历。

我们要判断最底层的节点有效性，需要收集它所有的父节点。因此我们需要创建一个栈储存父节点（的值），访问时将当前节点推入栈，当前节点的子节点访问结束之后出栈。

而 `JSON.stringify` 的 `replacer` 本身就是**深度优先搜索**，所以直接通过 `replacer` 就可以解决循环引用的问题。

### 模拟 JSON.stringify 内部逻辑

但 `replacer` 和上面的题解有点不同，`replacer` 中无法知道子节点，只能知道当前节点的父节点（通过 `this`）。因此我们需要对上面的算法进行修改。

````js
function isValidTree(root) {
  const stack = []
  let result = true
  function helper(node) {
    if (node === null) return null
    
    // this = node 的父节点
    // this 是已经经过验证的父节点 或是 根节点
    
    const thisIndex = stack.indexOf(this.val)
    if (~thisIndex) {
      // 若 stack 中已存在 this.val
      // 则表示此次验证的是 this 的右子树
      // 那么将移除 this 之后关于左子树的信息
      stack.splice(thisIndex + 1)
    } else {
      // 若 stack 中不存在 this.val
      // 则表示此次验证的是 this 的左子树
      stack.push(this.val)
    }
    
    // 当前 stack 里存在的是 node 所有父节点的信息
    const nodeIndex = stack.indexOf(node.val)
    if (~nodeIndex) {
      // 若 stack 中已存在 node.val
      // 则表示该树不是父子不相等树
      result = false
      // 返回 null，阻止对当前节点的子节点进行搜索
      return null
    }

    return node
  }
  
  /* 模拟 JSON.stringify 内部遍历 */
  // helper 的返回值会作为下次 serch 的节点
  // 无法中断操作，只能通过 helper 返回 null 来阻止子节点的搜索
  function search(node) {
    if (node === null) return
    
    const left = helper.call(node, node.left)
    search(left)
    
    const right = helper.call(node, node.right)
    search(right)
  }
  search(root)
  
  return result
}
````

### 转换成 replacer

```js
function createCircularReplacer() {
  const stack = []

  return function (key, value) {
    const thisIndex = stack.indexOf(this)
    if (~thisIndex) {
      stack.splice(thisIndex + 1)
    } else {
      stack.push(this)
    }

    const valueIndex = stack.indexOf(value)
    if (~valueIndex) return '<Circular>'
    
    return value
  }
}

function serializer(...replacers) {
  const _replacers = replacers.filter((replacer) => !!replacer)
  return function (key, value) {
    return _replacers.reduce((value, replacer) => {
      return replacer.call(this, key, value)
    }, value)
  }
}

function jsStringify(value, replacer, space) {
  const replacers = serializer(replacer, createCircularReplacer())
  const result = JSON.stringify(value, replacers, space)
  return result
}
```

通过闭包将 `circularReplacer` 的逻辑提到了外面，`createCircularReplacer` 的返回值相当于之前的 `helper`。其他基本和上面一一对应，对照着看很容易理解了。

### 增加路径记录

上述返回 `<Circular>` 只能知道构成了循环引用，但无法得知是从哪儿到哪儿构成循环。

只需要同 `stack` 相似的方式再增加一个 `keys` 即可。

```js
function createCircularReplacer() {
  const stack = []
  const keys = []
  
  function circulerText(key, value) {
    const valueIndex = stack.indexOf(value) // 获取与 value 相同的父节点位置
    const path = keys.slice(0, valueIndex + 1) // 获取到父节点的完整路径
    return `<Circular ${path.join('.')}>`
  }

  return function (key, value) {
    if (stack.length === 0) {
      // 当 stack 为空时，则表示当前的 value 是根节点
      // 可跳过后续处理
      // 并且我们并不需要根节点的父节点
      stack.push(value)
      keys.push('~') // 用 ~ 代表根节点的 key
      return value
    }
    
    const thisIndex = stack.indexOf(this)
    if (~thisIndex) {
      stack.splice(thisIndex + 1)
      keys.splice(thisIndex + 1)
    } else {
      stack.push(this)
    }
    // 当 value 作为父节点时，无法得到 value 的 key
    // 所以要在还能知道 key 时将 key 加入到 keys 中
    // 所以 keys 表示所有父节点的 key 及自身节点的 key
    keys.push(key)

    const valueIndex = stack.indexOf(value)
    if (~valueIndex) return circulerText(key, value)
    
    return value
  }
}
```



将代码合并后运行测试用例：

```json
{
  "parent": {
    "child": {
      "parent": "<Circular ~.child>"
    }
  },
  "child": {
    "parent": {
      "child": "<Circular ~.parent>"
    }
  }
}
```

基本符合预期了，

然后通过之前说的移除多余的双引号相同的方式进行处理，

我觉得完美了。



## 完整代码

```js
const SIGN = Date.now()
const LEFT_MARK = `__${SIGN}`
const RIGHT_MARK = `${SIGN}__`
const REGEXP = new RegExp(`"${LEFT_MARK}(.*?)${RIGHT_MARK}"`, 'g')

function mark(text) {
  return `${LEFT_MARK}${text}${RIGHT_MARK}`
}

function unmark(text) {
  return text.replace(REGEXP, '$1')
}

function jsReplacer(key, value) {    
  switch (typeof value) {
    case 'undefined':
      return mark('undefined')
    case 'function':
      return mark('<Function>')
    case 'number':
      return Number.isNaN(value) ? mark('NaN') : value
    case 'symbol':
      return mark(value.toString())
    case 'bigint':
      return mark(`${value}n`)
    default:
      return value
  }
}

function createCircularReplacer() {
  const stack = []
  const keys = []
  
  function circulerText(key, value) {
    const valueIndex = stack.indexOf(value)
    const path = keys.slice(0, valueIndex + 1)
    return mark(`<Circular ${path.join('.')}>`)
  }

  return function (key, value) {
    if (stack.length === 0) {
      stack.push(value)
      keys.push('~')
      return value
    }
    
    const thisIndex = stack.indexOf(this)
    if (~thisIndex) {
      stack.splice(thisIndex + 1)
      keys.splice(thisIndex + 1)
    } else {
      stack.push(this)
    }
    keys.push(key)

    const valueIndex = stack.indexOf(value)
    if (~valueIndex) return circulerText(key, value)
    
    return value
  }
}

function serializer(...replacers) {
  const _replacers = replacers.filter((replacer) => !!replacer)
  return function (key, value) {
    return _replacers.reduce((value, replacer) => {
      return replacer.call(this, key, value)
    }, value)
  }
}

function jsStringify(value, replacer, space) {
  const replacers = serializer(replacer, createCircularReplacer(), jsReplacer)
  const reuslt = JSON.stringify(value, replacers, space)
  return unmark(reuslt)
}
```







