# weapp-qrcode
weapp.qrcode.js 在 微信小程序 中，快速生成二维码

## Usage

先在 wxml 文件中，创建绘制的 canvas，并定义好 width, height, canvasId 。

```html
<canvas style="width: 200px; height: 200px;" canvas-id="myQrcode"></canvas>
```

引入 js 文件，使用 drawQrcode() 绘制二维码

```js
// 将 dist 目录下，weapp.qrcode.min.js 复制到项目目录中
import drawQrcode from '../../utils/weapp.qrcode.min.js'

drawQrcode({
  width: 200,
  height: 200,
  canvasId: 'myQrcode',
  text: 'https://github.com/yingye'
})
```

## API

### drawQrcode([options])

#### options

Type: Object

| 参数 | 说明 | 示例|
| ------ | ------ | ------ |
| width | 必须，二维码宽度，与`canvas`的`width`保持一致 | 200 |
| height | 必须，二维码高度，与`canvas`的`height`保持一致 | 200 |
| canvasId | 必须，绘制的`canvasId` | 'myQrcode' |
| text | 必须，二维码内容 | 'myQrcode' |
| typeNumber | 非必须，二维码的计算模式，默认值-1 | 8 |
| correctLevel | 非必须，二维码纠错级别，默认值为高级，取值范围: `{ L: 1, M: 0, Q: 3, H: 2 }` | 1 |
| background | 非必须，二维码背景颜色，默认值白色 | '#ffffff' |
| foreground | 非必须，二维码前景色，默认值黑色 | '#000000' |

## TIPS

weapp.qrcode.js 二维码生成部分借鉴了 jquery-qrcode 源码，可以参考 [jquery-qrcode](https://github.com/jeromeetienne/jquery-qrcode)。