import Taro, { Component } from '@tarojs/taro'
import { View, Canvas , Input, Button } from '@tarojs/components'
import './index.less';
import drawQrcode from 'weapp-qrcode';

export default class Index extends Component {

  config = {
    navigationBarTitleText: '首页'
  }

  state = {
    text: 'https://github.com/yingye/weapp-qrcode',
    inputValue: '',
    scale: '', // 屏幕比例， 以750设计图为基准
  }
  async componentDidMount() {
    // 设置屏幕比例
    const res = await Taro.getSystemInfo();
    const scale = res.screenWidth / 375;
    const { text } = this.state;
    this.state.scale = scale;
    // 描绘二维码
    this.drawQrCode(text, scale);
  }

  /**
   * 描绘对应的二维码
   * @param qrCodeString String 生成的二维码链接
   * @param scale Number 设计图与屏幕比
   * @return {Promise.<void>}
   */
  drawQrCode = async (qrCodeString, scale = 1) => {
    drawQrcode({
      width: 200 * scale,
      height: 200 * scale,
      canvasId: 'myQrcode',
      _this: this.$scope,
      text: qrCodeString
    });
  }

  // 更改二维码生成
  handleSubmit() {
    const { inputValue, scale } = this.state;
    if (!inputValue) {
      Taro.showModal({
        title: '提示',
        content: '请先输入要转换的内容！',
        showCancel: false
      });
    } else {
      this.drawQrCode(inputValue, scale);
      this.setState({
        text: inputValue,
      })
    }
  }

  // 更改输入框的值
  handleChangeInput = (e) => {
    this.state.inputValue = e.detail.value;
  }

  render () {
    const { text } = this.state;

    return (
      <View class='container'>
        <View class='main'>
          <View class='qrcode item'>
            <Canvas className='scanCode' canvasId='myQrcode' />
            <View class='tips'>{text}</View>
          </View>
          <View class='input-container item'>
            <Input onInput={this.handleChangeInput} placeholder='输入转换内容' />
            <Button type='default' onClick={this.handleSubmit}>提交</Button>
          </View>
          <View class='round left' />
          <View class='round right' />
          <View class='intro item'>
            <View class='title'>说明：</View>
            <View>1. 可自定义canvas宽高。</View>
            <View>2. 支持修改二维码的计算模式、纠错级别、背景色、前景色。</View>
            <View>3. 更多详细说明，请参考项目README。</View>
          </View>
        </View>
      </View>
    )
  }
}

