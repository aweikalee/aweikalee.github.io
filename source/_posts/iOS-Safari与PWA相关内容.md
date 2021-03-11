---
title: iOS Safari与PWA相关内容
toc: true
date: 2019-05-31 16:41:11
categories:
- [前端, 资料整理]
tags:
- PWA
- Safari
---

## 图标
``` html
<link rel="apple-touch-icon" href="touch-icon-iphone.png">
<link rel="apple-touch-icon" sizes="152x152" href="touch-icon-ipad.png">
<link rel="apple-touch-icon" sizes="180x180" href="touch-icon-iphone-retina.png">
<link rel="apple-touch-icon" sizes="167x167" href="touch-icon-ipad-retina.png">
```
影响**书签**、**阅读列表**、**添加到主屏**（PWA）的图标

使用本地的服务器 **书签**和**阅读列表**的图标无法显示

<!-- more -->


## 初始屏幕（启动屏幕）
``` html
<link rel="apple-touch-startup-image" href="/launch.png">
```
~~据说ios9后已废除，但官方至今没有作任何说明，还存在于官方文档中。~~

在ios12.1.4修复了。

也就是说ios9之前以及ios12.1.4之后 是可以用的。

但是限制诸多，首先必去在设置了`apple-mobile-web-app-capable`才有效。

其次图片需要使用合适的尺寸针对各种屏幕分辨率，基本上等同于每一种机型要设置一张图片，每张图片的尺寸不带重的。

``` html
<link rel="apple-touch-startup-image"
    href="/750x1294.png"
    media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
```
通过 `media` 对不同分辨率的屏幕进行不同的设置。

## 标题
``` html
<meta name="apple-mobile-web-app-title" content="AppTitle">
```
**添加到主屏**（PWA）时的标题，如果设置了`manifest.json`，则会使用`manifest.json`里的`short_name`和`name`
没有设置，并且没有`manifest.json`则使用`head`里的`title`标签



## 隐藏Safari界面
``` html
<meta name="apple-mobile-web-app-capable" content="yes">
```
仅针对**添加到主屏幕**（PWA）。设置之后打开主屏幕上的图标启动有别于Safari的浏览器，使其更像一个APP。并且隐藏Safari的地址栏和底部的工具栏。

在设置`manifest.json`后，则会使用`manifest.json`里的`display`。
- `"display": "fullscreen"`等同于`apple-mobile-web-app-capable=yes`
- `"display": "standalone"`等同于`apple-mobile-web-app-capable=yes`
- `"display": "minimal-ui"`等同于不设置`apple-mobile-web-app-capable`
- `"display": "browser"`等同于不设置`apple-mobile-web-app-capable`



## 状态栏颜色
``` html
<meta name="apple-mobile-web-app-status-bar-style" content="black">
```
`apple-mobile-web-app-capable`开启的前提下才有效。更改顶部状态栏的颜色
- `black` 黑色
- `black-translucent` 原意为灰色半透明，实测为透明。（刚启动时为黑色）
- `default` 白色
- 除上述以外的任何值，都将设为白色
- 不设置`apple-mobile-web-app-status-bar-style`，则设为黑色



## manifest.json
以下属性均只在**添加到主屏幕**（PWA）后有效。
- `name` 标题，优先级大于`apple-mobile-web-app-title`
- `short_name` 标题，优先级大于`name`
- `start_url` 入口地址，如要脱机访问务必指向`.html`文件
- `display` 展示形式，具体参见`apple-mobile-web-app-capable`的说明

其他属性似乎均不支持。


## 其他
#### 参考资料
[Apple Developer](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
#### 测试环境
iPhone 6s `iOS 12.0`