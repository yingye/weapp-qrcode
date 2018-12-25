# weapp-qrcode

[![npm version](https://badge.fury.io/js/weapp-qrcode.svg)](https://badge.fury.io/js/weapp-qrcode)
[![change-log](https://img.shields.io/badge/changelog-md-blue.svg)](https://github.com/yingye/weapp-qrcode/blob/master/CHANGELOG.md)

weapp.qrcode.js 在 微信小程序 中，快速生成二维码

## Usage

先在 wxml 文件中，创建绘制的 `canvas`，并定义好 `width`, `height`, `canvasId` 。

```html
<canvas style="width: 200px; height: 200px;" canvas-id="myQrcode"></canvas>
```

直接引入 js 文件，使用 `drawQrcode()` 绘制二维码。!!!在 调用 `drawQrcode()` 方法之前，一定要确保可以获取到 `canvas context` 。

在 v0.6.0 版本构建出多个文件，详情移步[Build Files说明](https://github.com/yingye/weapp-qrcode/blob/master/dist/README.md)。

```js
// 将 dist 目录下，weapp.qrcode.esm.js 复制到项目目录中
import drawQrcode from '../../utils/weapp.qrcode.esm.js'

drawQrcode({
  width: 200,
  height: 200,
  canvasId: 'myQrcode',
  // ctx: wx.createCanvasContext('myQrcode'),
  text: 'https://github.com/yingye',
  // v1.0.0+版本支持在二维码上绘制图片
  image: {
    imageResource: '../../images/icon.png',
    dx: 70,
    dy: 70,
    dWidth: 60,
    dHeight: 60
  }
})
```

如果项目使用了 wepy 框架，可直接安装 `weapp-qrcode` npm包。

```
npm install weapp-qrcode --save
```

```js
import drawQrcode from 'weapp-qrcode'

drawQrcode({
  width: 200,
  height: 200,
  canvasId: 'myQrcode',
  text: 'https://github.com/yingye'
})
```

## DEMO

<img src="./examples/demo.jpg" width=300 >

更多 demo 可以参考 [examples目录](https://github.com/yingye/weapp-qrcode/tree/master/examples)，示例包含原生语法及WePY、mpvue、Taro框架。

## API

### drawQrcode([options])

#### options

Type: Object

| 参数 | 说明 | 示例|
| ------ | ------ | ------ |
| width | 必须，二维码宽度，与`canvas`的`width`保持一致 | 200 |
| height | 必须，二维码高度，与`canvas`的`height`保持一致 | 200 |
| canvasId | 非必须，绘制的`canvasId` | `'myQrcode'` |
| ctx | 非必须，绘图上下文，可通过 `wx.createCanvasContext('canvasId')` 获取，v1.0.0+版本支持 | `'wx.createCanvasContext('canvasId')'` |
| text | 必须，二维码内容 | 'https://github.com/yingye' |
| typeNumber | 非必须，二维码的计算模式，默认值-1 | 8 |
| correctLevel | 非必须，二维码纠错级别，默认值为高级，取值：`{ L: 1, M: 0, Q: 3, H: 2 }` | 1 |
| background | 非必须，二维码背景颜色，默认值白色 | `'#ffffff'` |
| foreground | 非必须，二维码前景色，默认值黑色 | `'#000000'` |
| _this | 非必须，若在组件中使用，需要传入，v0.7.0+版本支持 | this |
| callback | 非必须，绘制完成后的回调函数，v0.8.0+版本支持。安卓手机兼容性问题，可通过自行设置计时器来解决，更多可以参考 [issue #18](https://github.com/yingye/weapp-qrcode/issues/18) | `function (e) { console.log('e', e) }` |
| x | 非必须，二维码绘制的 x 轴起始位置，默认值0，v1.0.0+版本支持 | 100 |
| y | 非必须，二维码绘制的 y 轴起始位置，默认值0，v1.0.0+版本支持 | 100 |
| image | 非必须，在 canvas 上绘制图片，**层级高于二维码**，v1.0.0+版本支持，更多可参考[drawImage](https://developers.weixin.qq.com/miniprogram/dev/api/CanvasContext.drawImage.html) | `{ imageResource: '', dx: 0, dy: 0, dWidth: 100, dHeight: 100 }` |


**位置信息可以参见下图：**

<image src="./examples/api.png" width=500 height=500>

## TIPS

weapp.qrcode.js 二维码生成部分借鉴了 jquery-qrcode 源码，可以参考 [jquery-qrcode](https://github.com/jeromeetienne/jquery-qrcode)。
