---
title: 用Hexo建立Blog时所碰到的各种坑
date: 2019-05-28 14:55:28
categories:
- [前端, 开发记录]
tags: Hexo
toc: true
---

用Hexo建立Blog非常方便，并且有很多现成的主题可以选择。
本文章将会记录使用过程中碰到的一些问题，以及解决方法。
基础的使用方法请参考Hexo的文档或网络上其他文章。

<!-- more -->

## 如何优雅地插入图片
本段内容建立在`post_asset_folder`为`true`的前提下进行的。
开启`post_asset_folder`后的目录结构如下：

```
_posts
├── 文章.md
└── 文章  // 文件夹
    └── image.jpg
```

```
{% asset_path slug %}
{% asset_img slug [title] %}
{% asset_link slug [title] %}
```
文章中引用图片，官方Hexo 3.0给出的方案。
但是本地编写`Markdown`，体验会变得很糟糕。

#### 解决方法
引入`hexo-asset-image`。
原理是遍历内容里的`img`标签，给`src`属性补上`permalink`。（源码不长 推荐直接阅读源码）

``` markdown
![](image.jpg)
```
接着就可以直接使用图片名进行引用，会转化为该文章对应的文件夹中的图片。

``` markdown
![](文章/image.jpg)
```
不过为了能让本地`Markdown`编写的体验，所以得在前面加上文件夹名。

但是这种方法只能改变文章内容里的图片地址，对于文件头部`Front-matter`的图片地址，是无能为力的。
关于`Front-matter`的图片地址的解决方法，请参考[文章封面 Thumbnail](#文章封面-Thumbnail)。

---

## 文章封面-Thumbnail
这里采用的文章封面解决方案是基于[hexo-theme-icarus](https://github.com/ppoffice/hexo-theme-icarus)主题的`thumbnail`。
在文章头部`Front-matter`中设置属性`thumbnail`，值设为图片路径。

和正文的图片一样会遇到路径问题，并且官方的图片引用方法和`hexo-asset-image`都没法解决。

#### 解决方法
找到`themes\icarus\includes\helpers\page.js`，对`get_thumbnail`进行修改。
``` js
hexo.extend.helper.register('get_thumbnail', function (post) {
    var config = hexo.config;
    var url = post.thumbnail || ''
    if (
        url &&
        config.post_asset_folder &&
        !/http[s]*.*|\/\/.*/.test(url)
    ) {
        var link = post.permalink;
        var beginPos = getPosition(link, '/', 3) + 1;
        var endPos = link.lastIndexOf('/') + 1;
        link = link.substring(beginPos, endPos);

        var linkArray = link.split('/').filter((s) => s != '');
        var urlArray = url.split('/').filter((s) => s != '');
        if(linkArray[linkArray.length - 1] == urlArray[0]) {
            urlArray.shift();
        }
        url = '/' + link + urlArray.join('/');
    } else if (!url) {
        var imgPattern = /\<img\s.*?\s?src\s*=\s*['|"]?([^\s'"]+).*?\>/ig;
        var result = imgPattern.exec(post.content);
        if (result && result.length > 1) {
            url = result[1];
        } else {
            url = this.url_for('images/thumbnail.svg');
        }
    }
    return url
});
```
如果需要补充路径，则在`get_thumbnail`中进行补充。

## 文章锚点
文章开启TOC，可以，通过锚点进行文章定位。但是定位时只能定位到窗口的最顶部。
当我将navbar固定到顶部后，则定位的内容会被遮住。

#### 解决方法
打开`themes\icarus\source\js\main.js`，在底部添加代码：
``` js
window.addEventListener('hashchange', function() {
    var target = $(decodeURI(location.hash));
    var htmlFontSize = parseInt($('html').css('font-size'))
    if(target.length == 1){
        var top = target.offset().top - htmlFontSize * 5;
        if(top > 0){
            $('html,body').animate({ scrollTop: top }, 0);
        }
    }
});
```
通过监听hash变化，进行定位修正。
其中`htmlFontSize * 5` = navbar的高度（4rem）+ 1rem间距。

除此外还有只使用css的解决方法，以及创建隐藏的锚点进行修正。
但都需要对`Markdown`的样式或内容进行修改。

---



## 部署缺失README.md
source文件夹中所有`.md`文件将会被渲染为`html`。

#### 解决方法
`README.md`放置于source文件夹下，`_config.yml`中设置过滤项。
```
skip_render: README.md
```

## Github Page的Custom domain被清空
在`Github`上设置好`Custom domain`，
在使用`hexo deploy`进行更新内容，会清空`Custom domain`。

### 解决方法
在source文件夹中新建文件，命名为`CNAME`，
文件的内容设为`Custom domain`的值。