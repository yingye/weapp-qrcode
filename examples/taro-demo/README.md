# taro-demo for weapp-qrcode

### 使用
1. 在项目中安装weapp-qrcode依赖

```
npm install weapp-qrcode --save
```

2. 在要使用生成二维码页面中引入weapp-qrcode， Canvas

```
import drawQrcode from 'weapp-qrcode';
import { Canvas } from '@tarojs/components';

```

3. 在页面的jsx中创建绘制的 canvas，并定义好 width, height, canvasId (width,height可以定义在样式文件中，以适应不同屏幕大小)

```
<Canvas className='scanCode' canvasId='myQrcode' />
<style>
.scanCode {
    width: 400px;
    height: 400px;
  }
</style>
```
4. 为了保证能够获取到Canvas,必须在componentDidMount生命周期之后再描绘二维码

```
async componentDidMount() {
    // 设置屏幕比例
    const res = await Taro.getSystemInfo();
    const scale = res.screenWidth / 375;
    
    drawQrcode({
      width: 200 * scale,
      height: 200 * scale,
      canvasId: 'myQrcode',
      _this: this.$scope,
      text: 'https://github.com/yingye'
    });
  }
```
### API
对应的API请查看[weapp-qrcode](https://github.com/yingye/weapp-qrcode#api)

### demo预览
1. 将项目clone到本地

```
git clone ....
```

2. 安装项目依赖

进入到对应的项目目录，安装对应的依赖

```
npm install
```

3. 预览

选择微信小程序模式，需要自行下载并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，然后选择项目根目录进行预览。详情请参考：[Taro官方文档](https://nervjs.github.io/taro/docs/GETTING-STARTED.html)。

```
# npm script
$ npm run dev:weapp
$ npm run build:weapp
# 仅限全局安装
$ taro build --type weapp --watch
$ taro build --type weapp
# npx 用户也可以使用
$ npx taro build --type weapp --watch
$ npx taro build --type weapp
```

