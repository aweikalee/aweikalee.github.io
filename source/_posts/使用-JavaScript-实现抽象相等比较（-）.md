---
title: 使用 JavaScript 实现抽象相等比较（==）
toc: true
date: 2020-08-31 14:04:10
categories:
- [前端, JavaScript]
tags:
- JavaScript
---

**抽象相等比较**（`Abstract Equality Comparison`）即 `==` 操作符，又被称作**宽松相等**、**非严格相等**。

而在**抽象相等比较**的过程中，为了使 `==` 两侧的数据可以进行比较，会尽可能将它们转换成相同类型，这就是的**隐式类型转换**。

<!-- more -->

## 问题

先来看看 `==` 那些令人困惑的例子：

```js
console.log([] == ![])          // true
console.log([] == [])           // false

console.log(0 == '0')           // true
console.log(0 == [])            // true
console.log('0' == [])          // false

console.log(Boolean(null))      // false
console.log(Boolean(undefined)) // false
console.log(null == false)      // false
console.log(undefined == false) // false
console.log(null == undefined)  // true

const a = { toString() { return '0' } }
const b = { toString() { return '0' } }
console.log(a == 0)             // true
console.log(b == 0)             // true
console.log(a == b)             // false
```

让我们根据 [ECMA-262 Abstract Equality Comparison](https://ecma-international.org/ecma-262/#sec-abstract-equality-comparison) 实现一个**抽象相等比较**吧，以此来了解比较的过程中发生了什么。

## 实现

### AbstractEqualityComparison( x, y )

**抽象相等比较**的主体。

#### 规范
##### 原文

> 1. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is the same as [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y), then
>
>    ​	a. Return the result of performing [Strict Equality Comparison](https://ecma-international.org/ecma-262/#sec-strict-equality-comparison) x === y.
>
> 2. If x is **null** and y is **undefined**, return **true**.
>
> 3. If x is **undefined** and y is **null**, return **true**.
>
> 4. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is Number and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is String, return the result of the comparison x == ! [ToNumber](https://ecma-international.org/ecma-262/#sec-tonumber)(y).
>
> 5. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is String and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is Number, return the result of the comparison ! [ToNumber](https://ecma-international.org/ecma-262/#sec-tonumber)(x) == y.
>
> 6. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is BigInt and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is String, then
>
>    ​	a. Let n be ! [StringToBigInt](https://ecma-international.org/ecma-262/#sec-stringtobigint)(y).
>
>    ​	b. If n is **NaN**, return **false**.
>
>    ​	c. Return the result of the comparison x == n.
>
> 7. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is String and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is BigInt, return the result of the comparison y == x.
>
> 8. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is Boolean, return the result of the comparison ! [ToNumber](https://ecma-international.org/ecma-262/#sec-tonumber)(x) == y.
>
> 9. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is Boolean, return the result of the comparison x == ! [ToNumber](https://ecma-international.org/ecma-262/#sec-tonumber)(y).
>
> 10. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is either String, Number, BigInt, or Symbol and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is Object, return the result of the comparison x == [ToPrimitive](https://ecma-international.org/ecma-262/#sec-toprimitive)(y).
>
> 11. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is Object and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is either String, Number, BigInt, or Symbol, return the result of the comparison [ToPrimitive](https://ecma-international.org/ecma-262/#sec-toprimitive)(x) == y.
>
> 12. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is BigInt and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is Number, or if [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(x) is Number and [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(y) is BigInt, then
>
>     ​	a. If x or y are any of **NaN**, **+∞,** or **-∞**, return **false**.
>
>     ​	b. If the [mathematical value](https://ecma-international.org/ecma-262/#mathematical-value) of x is equal to the [mathematical value](https://ecma-international.org/ecma-262/#mathematical-value) of y, return **true**; otherwise return **false**.
>
> 13. Return **false**.
>
> _注： `x ==! ToNumber(x)` 中的 `!`的意义我不清楚，但早期的规范里是没有`!`的，且忽略后逻辑是通顺的，后续都将按忽略处理。_

##### 译文

> 1. 当 Type(x) 和 Type(y) 相同时，则
>
>    ​	a. 返回 x === y。
>
> 2. 当 x 是 **null** 并且 y 是 **undefined** 时 **true** 。
>
> 3. 当 x 是 **undefined** 并且 y 是 **null** 时 **true** 。
>
> 4. 当 Type(x) 是 Number 并且 Type(y) 是 String 时，返回 x == ToNumber(y) 。
>
> 5. 当 Type(x) 是 String 并且 Type(y) 是 Number 时，返回 ToNumber(x) == y 。
>
> 6. 当 Type(x) 是 BigInt 并且 Type(y) 是 String 时，则
>
>    ​	a. 令 n = StringToBigInt(y) 。
>
>    ​	b. 当 n 是 **NaN** 时，返回 **false** 。
>
>    ​	c. 返回 x == n 。
>
> 7. 当 Type(x) 是 String 并且 Type(y) 是 BigInt 时，返回 y == x 。
>
> 8. 当 Type(x) 是 Boolean 时，返回 ToNumber(x) == y 。
>
> 9. 当 Type(y) 是 Boolean 时，返回 x == ToNumbery) 。
>
> 10. 当 Type(x) 是 String, Number, BigInt 或 Symbol 并且 Type(y) 是 Object 时，返回 x == ToPrimitive(y) 。
>
> 11. 当 Type(x) 是 Object 并且 Type(y) 是 String, Number, BigInt 或 Symbol 时，返回 ToPrimitive(x) == y 。
>
> 12. 当 Type(x) 是 BigInt 并且 Type(y) 是 Number 时，或者 当 Type(y) 是 Number 并且 Type(y) 是 BigInt 时，则
>
>     ​	a. 当 x 或 y 是 **NaN**, **+∞,** or **-∞** 时，返回 **false** 。
>
>     ​	b. 当 x 的数值等于 y 的数值时，返回 **true** ，反之 **false**。
>
> 13. 返回 **false** 。

#### 代码

最费解的想必就是 `ToPrimitive` 了，我们可以先不管它，先完成主体。

`Type`, `ToNumber`, `ToPrimitive` 等将会在后续再进行说明。

`Number` 和 `BigInt` 的数值比较，可以通过 `toString(2)` 将它们转成二进制字符串，再进行比较。

```js
function AbstractEqualityComparison(x, y) {
  /* 1 */
  if (Type(x) === Type(y)) {
    /* a */
    return x === y
  }
  
  /* 2 */
  if (x === null && y === undefined) return true
  
  /* 3 */
  if (x === undefined && y === null) return true
  
  /* 4 */
  if (Type(x) === 'number' && Type(y) === 'string') {
    return AbstractEqualityComparison(x, ToNumber(y))
  }
  
  /* 5 */
  if (Type(x) === 'string' && Type(y) === 'number') {
    return AbstractEqualityComparison(ToNumber(x), y)
  }
  
  /* 6 */
  if (Type(x) === 'bigint' && Type(y) === 'string') {
    /* a */
    const n = StringToBigInt(y)
    
    /* b */
    if (Number.isNaN(n)) return false
    
    /* c */
    return AbstractEqualityComparison(x, n)
  }
  
  /* 7 */
  if (Type(x) === 'string' && Type(y) === 'bigint') {
    return AbstractEqualityComparison(y, x)
  }
  
  /* 8 */
  if (Type(x) === 'boolean') {
    return AbstractEqualityComparison(ToNumber(x), y)
  }
  
  /* 9 */
  if (Type(y) === 'boolean') {
    return AbstractEqualityComparison(x, ToNumber(y))
  }
  
  /* 10 */
  if (
    ['string', 'number', 'bigint', 'symbol'].includes(Type(x)) &&
    Type(y) === 'object'
  ) {
    return AbstractEqualityComparison(x, ToPrimitive(y))
  }
  
  /* 11 */
  if (
    Type(x) === 'object' &&
    ['string', 'number', 'bigint', 'symbol'].includes(Type(y))
  ) {
    return AbstractEqualityComparison(ToPrimitive(x), y)
  }
  
  /* 12 */
  if (
    (Type(x) === 'bigint' && Type(y) === 'number') ||
    (Type(x) === 'number' && Type(y) === 'bigint')
  ) {
    /* a */
    if ([x, y].some(v => [NaN, Infinity, -Infinity].includes(v))) {
      return false
    }
    
    /* b */
    return x.toString(2) === y.toString(2)
  }
  
  /* 13 */
  return false
}
```

_注：在 `12.a` 中的 `includes` 不可使用 `indexOf` 代替，`[NaN].indexOf(NaN)` 始终返回 `-1`。_

### Type( argument )

`Type` 的作用是获取数据的类型。

#### 规范

##### 原文


> An ECMAScript language type corresponds to values that are directly manipulated by an ECMAScript programmer using the ECMAScript language. The ECMAScript language types are Undefined, Null, Boolean, String, Symbol, Number, BigInt, and Object. An ECMAScript language value is a value that is characterized by an ECMAScript language type.

#### 代码

`typeof` 大致和 `Type` 一样，

但 `typeof` 会将 `null` 认为是 `object`，把函数认为 `function`，

单独对这两种类型做调整即可。

```js
function Type(argument) {
  const type = typeof argument
  if (argument === null) return 'null'
  if (type === 'function') return 'object'
  return type
}
```

### ToNumber( argument )

`ToNumber` 的作用是将其他类型转换成 `Number` 类型。

#### 规范

##### 原文

> The abstract operation ToNumber converts argument to a value of type Number according to [Table 11](https://ecma-international.org/ecma-262/#table-11):
>
> **Table 11:** [ToNumber](https://ecma-international.org/ecma-262/#sec-tonumber) **Conversions**
>
> | Argument Type | Result                                                       |
> | ------------- | ------------------------------------------------------------ |
> | Undefined     | Return NaN.                                                  |
> | Null          | Return +0.                                                   |
> | Boolean       | If argument is true, return 1. If argument is false, return +0. |
> | Number        | Return argument (no conversion).                             |
> | String        | See grammar and conversion algorithm below.                  |
> | Symbol        | Throw a TypeError exception.                                 |
> | BigInt        | Throw a TypeError exception.                                 |
> | Object        | Apply the following steps:Let primValue be ? [ToPrimitive](https://ecma-international.org/ecma-262/#sec-toprimitive)(argument, hint Number).Return ? [ToNumber](https://ecma-international.org/ecma-262/#sec-tonumber)(primValue). |

##### 译文

> ToNumber 根据表 11将 argument 转换成 Number 类型的值：
>
> **表 11: ToNumber 转换**
>
> | Argument 类型 | 结果                                                         |
> | ------------- | ------------------------------------------------------------ |
> | Undefined     | 返回 NaN.                                                    |
> | Null          | 返回 +0。                                                    |
> | Boolean       | 当 argument 是 true 时，返回 1 。当 argument 是 false 时，返回 +0 。 |
> | Number        | 返回 argument （不进行转换）。                               |
> | String        | 见下方语法和转换算法。                                       |
> | Symbol        | 抛出 TypeError 。                                            |
> | BigInt        | 抛出 TypeError 。                                            |
> | Object        | 应用以下步骤：<br>1. 令 primValue = ToPrimitive(argument, hint Number)。<br>2. 返回 ToNumber(primValue) 。 |

#### 代码

`ToNumber`与`Number` 几乎一致，只不过对于`BigInt`，`ToNumber`会直接抛出类型错误。

```js
function ToNumber(argument) {
  if (Type(argument) === 'bigint') {
    throw new TypeError('Cannot convert bigint to number value')
  }
  return Number(argument)
}
```

### StringToBigInt( argument )

`StringToBigInt` 的作用是将 `String` 转成 `BigInt`。

#### 代码

`BigInt` 中 `String` 的解析器想必使用的就是 `StringToBigInt`。

在 `BigInt` 中当 `StringToBigInt` 返回值如果是 `NaN` 则会直接抛出错误。

借用 `BigInt` 实现 `StringToBigInt` 则就是捕获错误，返回 `NaN` 。

```js
function StringToBigInt(argument) {
  if (Type(argument) !== 'string') {
    throw new TypeError('Only accept string')
  }
  
  try {
  	return BigInt(argument)
  } catch (e) {
    return NaN
  }
}
```

### ToPrimitive( input [, PreferredType ] )

`ToPrimitive` 的作用是将输入的值转成值类型（除了 `Object` 以外的基础类型）。

#### 规范

##### 原文


> 1. [Assert](https://ecma-international.org/ecma-262/#assert): input is an [ECMAScript language value](https://ecma-international.org/ecma-262/#sec-ecmascript-language-types).
>
> 2. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(input) is Object, then
>
>    ​	a. If PreferredType is not present, let hint be **"default"**.
>
>    ​	b. Else if PreferredType is hint String, let hint be **"string"**.
>
>    ​	c. Else,
>
>    ​		i. [Assert](https://ecma-international.org/ecma-262/#assert): PreferredType is hint Number.
>
>    ​		ii. Let hint be **"number"**.
>
>    ​	d. Let exoticToPrim be ? [GetMethod](https://ecma-international.org/ecma-262/#sec-getmethod)(input, @@toPrimitive).
>
>    ​	e. If exoticToPrim is not **undefined**, then
>
>    ​		i. Let result be ? [Call](https://ecma-international.org/ecma-262/#sec-call)(exoticToPrim, input, « hint »).
>
>    ​		ii. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(result) is not Object, return result.
>
>    ​		iii. Throw a **TypeError** exception.
>
>    ​	f. If hint is **"default"**, set hint to **"number"**.
>
>    ​	g. Return ? [OrdinaryToPrimitive](https://ecma-international.org/ecma-262/#sec-ordinarytoprimitive)(input, hint).
>
> 3. Return input.

##### 译文


> 1. 断言： input 是一个 ECMAScript 语言的值.
>
> 2. 当 Type(input) 是 Object 时，则
>
>    ​	a. 当 PreferredType 不存在时，令 hint =  **"default"** 。
>
>    ​	b. 否则当 PreferredType 是 String 时，令 hint = **"string"** 。
>
>    ​	c. 否则，
>
>    ​		i. 断言： PreferredType 是 Number 。
>
>    ​		ii. 令 hint = **"number"** 。
>
>    ​	d. 令 exoticToPrim = GetMethod(input, @@toPrimitive) 。
>
>    ​	e. 当 exoticToPrim 不是 **undefined** 时，则
>
>    ​		i. 令 result = Call(exoticToPrim, input, « hint ») 。
>
>    ​		ii. 当 Type(result) 不是 Object 时，返回 result 。
>
>    ​		iii. 抛出 **TypeError** 。
>
>    ​	f. 当 hint 是 **"default"** 时，令 hint = **"number"** 。
>
>    ​	g. 返回 OrdinaryToPrimitive(input, hint) 。
>
> 3. 返回 input 。

#### 代码

```js
function ToPrimitive(input, PreferredType) {
  /* 1 不需要实现 */
  
  /* 2 */
  if (Type(input) === 'object') {
  	let hint
    /* a */
    if (PreferredType === undefined) {
      hint = 'default'
    }
    
    /* b */
    else if (PreferredType === 'string') {
      hint = 'string'
    }
    
    /* c */
    else {
      /* i */
      if (PreferredType !== 'number') {
        throw new TypeError('preferred type must be "string" or "number"')
      }
      
      /* ii */
      hint = 'number'
    }
    
    /* d */
    const exoticToPrim = GetMethod(input, Symbol.toPrimitive)
    
    /* e */
    if (exoticToPrim !== undefined) {
    	/* i */
      const result = exoticToPrim.call(input, hint)
      
    	/* i */
      if (Type(result) !== 'object') return result
      
    	/* i */
      throw new TypeError('Cannot convert object to primitive value')
    }
    
    /* f */
    if (hint === 'default') hint = 'number'
    
    /* g */
    return OrdinaryToPrimitive(input, hint)
  }
  
  /* 3 */
  return input
}
```

### OrdinaryToPrimitive( o, hint )

`OrdinaryToPrimitive` 是将 `Object` 转成值类型。

参数 `hint` 控制优先使用 `toString` 还是 `valueOf`。

#### 规范

##### 原文


> 1. [Assert](https://ecma-international.org/ecma-262/#assert): [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(O) is Object.
>
> 2. [Assert](https://ecma-international.org/ecma-262/#assert): [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(hint) is String and its value is either **"string"** or **"number"**.
>
> 3. If hint is **"string"**, then
>
>     ​	a. Let methodNames be « **"toString"**, **"valueOf"** ».
>
> 4. Else,
>
>     ​	a. Let methodNames be « **"valueOf"**, **"toString"** ».
>
> 5. For each name in methodNames in [List](https://ecma-international.org/ecma-262/#sec-list-and-record-specification-type) order, do
>
>     ​	a. Let method be ? [Get](https://ecma-international.org/ecma-262/#sec-get-o-p)(O, name).
>
>     ​	b. If [IsCallable](https://ecma-international.org/ecma-262/#sec-iscallable)(method) is true, then
>
>     ​		i. Let result be ? [Call](https://ecma-international.org/ecma-262/#sec-call)(method, O).
>
>     ​		ii. If [Type](https://ecma-international.org/ecma-262/#sec-ecmascript-data-types-and-values)(result) is not Object, return result.
>
> 6. Throw a **TypeError** exception.

##### 译文


> 1. 断言： Type(O) 是 Object 。
>
> 2. 断言： Type(hint) 是 String 并且 hint 的值 是 **"string"** 或 **"number"** 。
>
> 3. 当 hint 是 **"string"** 时，则
>
>    ​	a. 令 methodNames = « **"toString"**, **"valueOf"** »。
>
> 4. 否则，
>
>    ​	a. 令 methodNames = « **"valueOf"**, **"toString"** »。
>
> 5. 遍历 methodNames ， 执行
>
>    ​	a. 令 method = Get(O, name) 。
>
>    ​	b. 当 IsCallable(method) 是 true 时，则
>
>    ​		i. 令 result = Call(method, O) 。
>
>    ​		ii. 当 Type(result) 不是 Object 时，返回 result 。
>
> 6. 抛出 **TypeError** 。

#### 代码

```js
function OrdinaryToPrimitive(o, hint) {
  /* 1 */
  if (Type(o) !== 'object') throw new TypeError('Only accept Object')
  
  /* 2 */
  if (Type(hint) !== 'string' || !['string', 'number'].includes(hint)) {
    throw new TypeError('Hint value must be "string" or "number"')
  }
  
  let methodNames
  /* 3 */
  if (hint === 'string') {
    /* a */
    methodNames = ['toString', 'valueOf']
  }
  
  /* 4 */
  else {
    /* a */
    methodNames = ['valueOf', 'toString']
  }
  
	/* 5 */
  for (const name of methodNames) {
    /* a */
    const method = Get(o, name)
    
    /* b */
    if (IsCallable(method)) {
      /* i */
      const result = method.call(o)
      
      /* ii */
      if (Type(result) !== 'object') return result
    }
  }
  
  /* 6 */
  throw new TypeError('Cannot convert object to primitive value')
}
```


### 其他

```js
function GetMethod(v, p) {
  if (!isPropertyKey(p)) {
    throw new TypeError('Not valid property key')
  }
  const func = GetV(v, p)
  if (func === undefined || func === null) return undefined
  if (!IsCallable(func)) {
    throw new TypeError('Not callable')
  }
  return func
}

function isPropertyKey(argument) {
  if (Type(argument) === 'string') return true
  if (Type(argument) === 'symbol') return true
  return false
}

function Get(o, p) {
  if (Type(o) !== 'object') {
    throw new TypeError('Only accept object')
  }
  if (!isPropertyKey(p)) {
    throw new TypeError('Not valid property key')
  }
  return o[p]
}

function GetV(v, p) {
  if (!isPropertyKey(p)) {
    throw new TypeError('Not valid property key')
  }
  const o = ToObject(v)
  return o[p]
}

function IsCallable(argument) {
  if (Type(argument) !== 'object') return false
  if (!!argument.call) return true
  return false
}

function ToObject(argument) {
  switch (Type(argument)) {
    case 'boolean':
      return new Boolean(argument)
    case 'number':
      return new Number(argument)
    case 'string':
      return new String(argument)
    case 'symbol':
    case 'bigint':
    case 'object':
      return argument
    default:
      throw new TypeError(
        `Cannot convert ${Type(argument)} to object value`
      )
  }
}
```

## 测试

```js
function test(x, y) {
  const a = x == y
  const b = AbstractEqualityComparison(x, y)
  const sign = a === b ? [
    '%cSuccess',
    'background: green; color: white;'
  ] : [
    '%cFailure',
    'background: red; color: white;'
  ]
  console.log(...sign, `[${a}]`, x, y)
}
```

```js
const testData1 = [
  undefined,
  null,
  true,
  false,
  '123',
  Symbol('123'),
  123,
  123n,
  [],
  {
    valueOf() {
      return 123
    }
  },
  {
    toString() {
      return 123
    }
  }
]
const testData2 = [
  undefined,
  null,
  true,
  false,
  '123',
  Symbol('123'),
  123,
  123n,
  [],
  {
    valueOf() {
      return 123
    }
  },
  {
    toString() {
      return 123
    }
  }
]

testData1.forEach((a) => {
  testData2.forEach((b) => {
    test(a, b)
  })
})

```

## 结语

在实际开发中，是要尽可能避免使用 `==`  操作符，有人可能觉得这篇文章没有意义。其实我想传达的是一种学习方法，可以通过相同的方式学习 `JavaScript` 的其他内容。



最后，上面实现的 `AbstractEqualityComparison` 还是有用处的，我在上面代码的基础上写了个 [抽象相等比较过程展示](https://aweikalee.github.io/abstract-equality-comparison/) ，能更清楚地看到比较的过程。不妨输入文章开头的问题，看看比较的过程吧。
